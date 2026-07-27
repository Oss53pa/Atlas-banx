// ============================================================================
// ATLASBANX — Funnel « Audit express » (Particulier, sans compte)
// ============================================================================
// Parcours public, éphémère : import d'un relevé → devis (forfait selon le
// nombre de mois détectés) → paiement (CinetPay, simulé en sandbox) → AUDIT
// COMPLET (le même moteur 19 détecteurs que l'offre Entreprise/Cabinet, via
// runFullAudit) → rapport détaillé téléchargeable. Aucune donnée conservée.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { UploadCloud, Loader2, FileText, CheckCircle2, AlertCircle, Download, ArrowRight } from 'lucide-react';
import { extractStatement } from '../../extraction/bank-statement';
import { runFullAudit } from '../../services/audit/runFullAudit';
import { countAuditedMonths, planForMonths, type AuditPlan } from '../../billing/auditPlans';
import { auditReportToHtml } from '../../billing/express/auditReportHtml';
import { l2ToBankConditions } from '../../billing/express/l2ToBankConditions';
import { getPaymentProvider } from '../../billing/payments';
import { fetchPublicBankReference, fetchPublicBankList, type PublicBankListItem } from '../../services/publicBankReference';
import { ANOMALY_TYPE_LABELS, type Transaction, type AnalysisResult, type BankConditions } from '../../types';

type Step = 'import' | 'quote' | 'payment' | 'report';

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n));
}
function fmtDate(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : '—';
}

export default function ExpressAuditPage() {
  const [step, setStep] = useState<Step>('import');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [periodStart, setPeriodStart] = useState<Date | null>(null);
  const [periodEnd, setPeriodEnd] = useState<Date | null>(null);
  const [months, setMonths] = useState(0);
  const [plan, setPlan] = useState<AuditPlan | null>(null);
  const [audit, setAudit] = useState<AnalysisResult | null>(null);
  const [auditStep, setAuditStep] = useState<string>('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [banks, setBanks] = useState<PublicBankListItem[]>([]);
  const [segment, setSegment] = useState<'particulier' | 'pme' | 'corporate'>('particulier');

  // Liste des banques du référentiel (codes alignés sur L2), pour comparer au
  // barème officiel. Chargée à l'ouverture ; vide si le référentiel est indispo.
  useEffect(() => {
    let cancelled = false;
    void fetchPublicBankList().then((list) => {
      if (!cancelled) setBanks(list);
    });
    return () => { cancelled = true; };
  }, []);
  const [usedOfficialGrid, setUsedOfficialGrid] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'sandbox' | 'live'>('sandbox');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setIsBusy(true);
    try {
      const result = await extractStatement(file);
      const txs = result.transactions.filter((t) => t.date instanceof Date);
      if (txs.length === 0) {
        setError('Aucune transaction détectée dans ce relevé. Essayez un PDF de meilleure qualité.');
        return;
      }
      const times = txs.map((t) => new Date(t.date).getTime());
      const start = new Date(Math.min(...times));
      const end = new Date(Math.max(...times));
      const m = countAuditedMonths([{ start, end }]);
      const p = planForMonths(m);
      if (!p) {
        setError('La durée détectée dépasse nos forfaits standards (>12 mois). Contactez-nous pour une offre sur mesure.');
        return;
      }
      setTransactions(txs);
      setPeriodStart(start);
      setPeriodEnd(end);
      setMonths(m);
      setPlan(p);
      setStep('quote');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'analyse du relevé.");
    } finally {
      setIsBusy(false);
    }
  };

  const pay = async () => {
    if (!plan) return;
    setError(null);
    setIsBusy(true);
    try {
      const provider = getPaymentProvider();
      const reference = `axb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const init = await provider.initiate({
        amount: plan.priceFcfa,
        currency: 'XOF',
        description: `Audit express — ${plan.label}`,
        reference,
        customerEmail: email || undefined,
        customerPhone: phone || undefined,
      });
      setPaymentMode(init.mode);
      if (init.redirectUrl) {
        window.location.href = init.redirectUrl;
        return;
      }
      const check = await provider.verify(init.transactionId);
      if (check.status !== 'succeeded') {
        setError('Paiement non confirmé. Réessayez.');
        return;
      }
      // Paiement OK → audit complet (même moteur que l'offre Entreprise).
      setStep('report');
      setAuditStep('Lancement de l\'audit…');

      // Comparaison au barème officiel (L2) si la banque est connue et publiée.
      let bankConditions: BankConditions | undefined;
      if (bankCode) {
        setAuditStep('Récupération du barème officiel…');
        const ref = await fetchPublicBankReference(bankCode);
        if (ref?.found && ref.conditions.length > 0) {
          bankConditions = l2ToBankConditions({
            bankCode,
            bankName: ref.legalName,
            effectiveFrom: ref.effectiveFrom,
            conditions: ref.conditions,
            segment,
          });
          setUsedOfficialGrid(true);
        }
      }

      const result = await runFullAudit({
        transactions,
        bankConditions,
        bankCode: bankCode || undefined,
        onProgress: (_pct, s) => setAuditStep(s),
      });
      setAudit(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec du paiement / audit.');
    } finally {
      setIsBusy(false);
    }
  };

  const downloadReport = () => {
    if (!audit) return;
    const html = auditReportToHtml(audit, {
      periodStart, periodEnd, months, planLabel: plan?.label ?? '',
    });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rapport-audit-atlasbanx.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const steps: { id: Step; label: string }[] = useMemo(
    () => [
      { id: 'import', label: '1. Relevé' },
      { id: 'quote', label: '2. Devis' },
      { id: 'payment', label: '3. Paiement' },
      { id: 'report', label: '4. Rapport' },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-ink-900 via-ink-950 to-black text-white">
      <div className="mx-auto max-w-2xl px-6 py-14">
        <h1 className="font-serif text-3xl">Audit express de votre relevé</h1>
        <p className="mt-2 text-sm text-white/50">
          Sans création de compte. Importez, payez, obtenez votre rapport d'audit complet. Vos
          données ne sont pas conservées.
        </p>

        <ol className="mt-8 flex gap-2 text-xs">
          {steps.map((s) => (
            <li
              key={s.id}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-center ${
                s.id === step
                  ? 'border-amber-400/50 bg-amber-400/10 text-amber-200'
                  : 'border-white/10 text-white/40'
              }`}
            >
              {s.label}
            </li>
          ))}
        </ol>

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 'import' && (
          <div className="mt-8 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
            <UploadCloud className="mx-auto h-10 w-10 text-amber-300" />
            <p className="mt-3 text-sm text-white/70">Déposez votre relevé bancaire (PDF).</p>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={isBusy}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-ink-950 hover:bg-amber-400 disabled:opacity-40"
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {isBusy ? 'Analyse…' : 'Choisir un PDF'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                void handleFile(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
          </div>
        )}

        {step === 'quote' && plan && (
          <div className="mt-8 space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50">Période détectée</p>
                <p className="text-lg font-semibold">{fmtDate(periodStart)} → {fmtDate(periodEnd)}</p>
                <p className="text-xs text-white/40">{months} mois · {transactions.length} transactions</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/50">{plan.label}</p>
                <p className="text-2xl font-bold text-amber-300">{fmt(plan.priceFcfa)} FCFA</p>
              </div>
            </div>
            <div>
              <label className="text-xs text-white/50">Type de relevé</label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {([
                  { v: 'particulier', label: 'Particulier' },
                  { v: 'pme', label: 'PME' },
                  { v: 'corporate', label: 'Entreprise' },
                ] as const).map((opt) => (
                  <button key={opt.v} type="button" onClick={() => setSegment(opt.v)}
                    className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${
                      segment === opt.v ? 'border-amber-400/60 bg-amber-400/10 text-amber-200' : 'border-white/10 text-white/50 hover:bg-white/5'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-white/50">Votre banque (compare au barème officiel — optionnel)</label>
              <select value={bankCode} onChange={(e) => setBankCode(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-amber-400/50 focus:outline-none">
                <option value="">— Sans barème (audit sur les seules transactions) —</option>
                {banks.map((b) => (
                  <option key={b.code} value={b.code} className="bg-ink-900">{b.legal_name} ({b.country_iso})</option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (réception du rapport)"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/25 focus:border-amber-400/50 focus:outline-none" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Téléphone (mobile money)"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/25 focus:border-amber-400/50 focus:outline-none" />
            </div>
            <button onClick={() => setStep('payment')}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-ink-950 hover:bg-amber-400">
              Continuer vers le paiement <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === 'payment' && plan && (
          <div className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-7">
            <p className="text-sm text-white/70">
              Paiement CinetPay (mobile money) — <span className="font-semibold">{fmt(plan.priceFcfa)} FCFA</span> pour {plan.label}.
            </p>
            <button onClick={pay} disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-ink-950 hover:bg-amber-400 disabled:opacity-40">
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {isBusy ? 'Traitement…' : 'Payer et lancer l\'audit complet'}
            </button>
            <p className="text-[11px] text-white/35">
              Le prestataire réel se branche via les clés marchandes CinetPay ; sans elles le
              paiement est simulé (aucun débit).
            </p>
          </div>
        )}

        {step === 'report' && (
          <div className="mt-8 space-y-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-7">
            {!audit ? (
              <div className="flex items-center gap-2 text-white/70">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{auditStep || 'Audit en cours…'}</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">
                    Paiement {paymentMode === 'sandbox' ? 'simulé ' : ''}confirmé — audit complet terminé
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <Kpi label="Transactions" value={String(audit.statistics.totalTransactions)} />
                  <Kpi label="Anomalies" value={String(audit.statistics.totalAnomalies)} />
                  <Kpi label="Récupérable (FCFA)" value={fmt(audit.statistics.totalAnomalyAmount)} />
                </div>
                {audit.summary && (
                  <p className="text-sm text-white/70">
                    Synthèse : <span className="font-semibold">{audit.summary.status}</span> — {audit.summary.message}
                  </p>
                )}
                <p className="text-[11px] text-white/40">
                  {usedOfficialGrid
                    ? '✓ Comparé au barème officiel de votre banque (référentiel L2).'
                    : 'Audit sur les seules transactions (aucun barème officiel sélectionné ou disponible).'}
                </p>
                {audit.anomalies.length > 0 && (
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm">
                    <p className="mb-2 text-xs uppercase tracking-wide text-white/40">Anomalies détectées</p>
                    <ul className="space-y-1">
                      {audit.anomalies.slice(0, 10).map((a) => (
                        <li key={a.id} className="flex justify-between gap-2 text-white/70">
                          <span className="truncate">{ANOMALY_TYPE_LABELS[a.type] ?? a.type}</span>
                          <span className="text-amber-300">{fmt(a.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <button onClick={downloadReport}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-ink-950 hover:bg-amber-400">
                  <Download className="h-4 w-4" /> Télécharger le rapport complet
                </button>
                <p className="text-[11px] text-white/35">
                  Vos données ne sont pas conservées : rechargez la page pour tout effacer.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.04] px-3 py-2.5">
      <p className="text-[11px] text-white/40">{label}</p>
      <p className="mt-0.5 font-semibold text-white">{value}</p>
    </div>
  );
}
