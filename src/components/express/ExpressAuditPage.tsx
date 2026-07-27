// ============================================================================
// ATLASBANX — Funnel « Audit express » (Particulier, sans compte)
// ============================================================================
// Parcours public, éphémère : import d'un relevé → devis (forfait selon le
// nombre de mois détectés) → paiement (CinetPay, simulé en sandbox) → AUDIT
// COMPLET (le même moteur 19 détecteurs que l'offre Entreprise/Cabinet, via
// runFullAudit) → rapport détaillé téléchargeable. Aucune donnée conservée.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud, Loader2, FileText, CheckCircle2, AlertCircle, Download, ArrowRight,
  ArrowLeft, ShieldCheck, Sparkles, Lock, Building2, RotateCcw,
} from 'lucide-react';
import { extractStatement } from '../../extraction/bank-statement';
import { runFullAudit } from '../../services/audit/runFullAudit';
import { countAuditedMonths, planForMonths, type AuditPlan } from '../../billing/auditPlans';
import { auditReportToHtml } from '../../billing/express/auditReportHtml';
import { l2ToBankConditions } from '../../billing/express/l2ToBankConditions';
import { getPaymentProvider } from '../../billing/payments';
import { fetchPublicBankReference, fetchPublicBankList, type PublicBankListItem } from '../../services/publicBankReference';
import { ANOMALY_TYPE_LABELS, type Transaction, type AnalysisResult, type BankConditions } from '../../types';

type Step = 'import' | 'quote' | 'payment' | 'report';

const STEPS: { id: Step; label: string }[] = [
  { id: 'import', label: 'Relevé' },
  { id: 'quote', label: 'Devis' },
  { id: 'payment', label: 'Paiement' },
  { id: 'report', label: 'Rapport' },
];

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n));
}
function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ExpressAuditPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('import');
  const [isBusy, setIsBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
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
  const [usedOfficialGrid, setUsedOfficialGrid] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'sandbox' | 'live'>('sandbox');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchPublicBankList().then((list) => {
      if (!cancelled) setBanks(list);
    });
    return () => { cancelled = true; };
  }, []);

  const currentIndex = useMemo(() => STEPS.findIndex((s) => s.id === step), [step]);

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
      setStep('report');
      setAuditStep('Lancement de l\'audit…');

      let bankConditions: BankConditions | undefined;
      if (bankCode) {
        setAuditStep('Récupération du barème officiel…');
        const ref = await fetchPublicBankReference(bankCode);
        if (ref?.found && ref.conditions.length > 0) {
          bankConditions = l2ToBankConditions({
            bankCode, bankName: ref.legalName, effectiveFrom: ref.effectiveFrom,
            conditions: ref.conditions, segment,
          });
          setUsedOfficialGrid(true);
        }
      }

      const result = await runFullAudit({
        transactions, bankConditions, bankCode: bankCode || undefined,
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
    const html = auditReportToHtml(audit, { periodStart, periodEnd, months, planLabel: plan?.label ?? '' });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rapport-audit-atlasbanx.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setStep('import'); setError(null); setAudit(null); setPlan(null);
    setTransactions([]); setBankCode(''); setEmail(''); setPhone('');
    setUsedOfficialGrid(false);
  };

  return (
    <div className="min-h-screen bg-canvas-100">
      {/* Top bar */}
      <header className="border-b border-primary-100/70 bg-white/70 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <button onClick={() => navigate('/landing')} className="font-display text-2xl text-ink-900 leading-none">
            AtlasBanx
          </button>
          <button onClick={() => navigate('/landing')}
            className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Accueil
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
        {/* Hero */}
        <div className="text-center animate-fade-in-up">
          <span className="inline-flex items-center gap-2 rounded-pill border border-accent-200/70 bg-accent-50/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-700">
            <Sparkles className="h-3.5 w-3.5" /> Audit express · sans compte
          </span>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl text-ink-900 tracking-tight">
            Auditez votre relevé bancaire
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink-500">
            Importez votre relevé, réglez, et recevez un <span className="font-medium text-ink-800">rapport d'audit complet</span> —
            frais indus, agios, dates de valeur. Aucune donnée conservée.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-ink-500">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Sans création de compte</span>
            <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-emerald-600" /> Données non conservées</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Conforme OHADA</span>
          </div>
        </div>

        {/* Stepper */}
        <div className="mt-9 flex items-center justify-center">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
                  i < currentIndex ? 'border-emerald-500 bg-emerald-500 text-white'
                  : i === currentIndex ? 'border-accent-500 bg-accent-500 text-white shadow-card'
                  : 'border-primary-200 bg-white text-ink-400'
                }`}>
                  {i < currentIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`mt-1.5 text-[11px] font-medium ${i === currentIndex ? 'text-ink-900' : 'text-ink-400'}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-2 mb-5 h-px w-8 sm:w-14 ${i < currentIndex ? 'bg-emerald-400' : 'bg-primary-200'}`} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Step: import ── */}
        {step === 'import' && (
          <div className="mt-7 animate-fade-in-up">
            <div
              onClick={() => !isBusy && fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault(); setDragOver(false);
                if (!isBusy) void handleFile(e.dataTransfer.files?.[0] ?? null);
              }}
              className={`card cursor-pointer p-10 text-center transition-all ${
                dragOver ? 'border-accent-400 bg-accent-50/40 shadow-card-hover' : 'hover:border-primary-200 hover:shadow-card-hover'
              }`}
            >
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
                {isBusy ? <Loader2 className="h-7 w-7 animate-spin" /> : <UploadCloud className="h-7 w-7" />}
              </span>
              <p className="mt-4 text-lg font-semibold text-ink-900">
                {isBusy ? 'Analyse de votre relevé…' : 'Déposez votre relevé bancaire'}
              </p>
              <p className="mt-1 text-sm text-ink-500">
                {isBusy ? 'Extraction des transactions (OCR inclus).' : 'Glissez votre PDF ici, ou cliquez pour parcourir.'}
              </p>
              {!isBusy && (
                <span className="btn btn-primary btn-lg mt-6 pointer-events-none">
                  <FileText className="h-4 w-4" /> Choisir un PDF
                </span>
              )}
              <p className="mt-4 text-[11px] text-ink-400">Format PDF · relevé bancaire · OCR pour les scans</p>
              <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden"
                onChange={(e) => { void handleFile(e.target.files?.[0] ?? null); e.target.value = ''; }} />
            </div>
          </div>
        )}

        {/* ── Step: quote ── */}
        {step === 'quote' && plan && (
          <div className="mt-7 space-y-4 animate-fade-in-up">
            {/* Price hero */}
            <div className="card overflow-hidden">
              <div className="flex flex-col gap-4 bg-gradient-to-br from-ink-800 to-ink-950 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/50">Période détectée</p>
                  <p className="mt-1 text-xl font-semibold">{fmtDate(periodStart)} → {fmtDate(periodEnd)}</p>
                  <p className="mt-0.5 text-sm text-white/50">{months} mois · {transactions.length} transactions</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs uppercase tracking-wide text-white/50">{plan.label}</p>
                  <p className="font-display text-4xl text-gradient-gold leading-none">{fmt(plan.priceFcfa)}</p>
                  <p className="text-sm text-white/50">FCFA · paiement unique</p>
                </div>
              </div>
            </div>

            <div className="card space-y-5 p-6">
              <div>
                <label className="label">Type de relevé</label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {([
                    { v: 'particulier', label: 'Particulier' },
                    { v: 'pme', label: 'PME' },
                    { v: 'corporate', label: 'Entreprise' },
                  ] as const).map((opt) => (
                    <button key={opt.v} type="button" onClick={() => setSegment(opt.v)}
                      className={`rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-all ${
                        segment === opt.v ? 'border-ink-900 bg-canvas-100 text-ink-900 shadow-card' : 'border-primary-200 text-ink-500 hover:border-primary-300'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Votre banque <span className="font-normal text-ink-400">— compare au barème officiel (optionnel)</span></label>
                <select value={bankCode} onChange={(e) => setBankCode(e.target.value)} className="input mt-1">
                  <option value="">— Sans barème (audit sur les seules transactions) —</option>
                  {banks.map((b) => (
                    <option key={b.code} value={b.code}>{b.legal_name} ({b.country_iso})</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Email <span className="font-normal text-ink-400">(réception du rapport)</span></label>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@email.com" className="input mt-1" />
                </div>
                <div>
                  <label className="label">Téléphone <span className="font-normal text-ink-400">(mobile money)</span></label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+225 …" className="input mt-1" />
                </div>
              </div>

              <button onClick={() => setStep('payment')} className="btn btn-primary btn-lg w-full">
                Continuer vers le paiement <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step: payment ── */}
        {step === 'payment' && plan && (
          <div className="mt-7 animate-fade-in-up">
            <div className="card space-y-5 p-6 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
                <Building2 className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm text-ink-500">Montant à régler</p>
                <p className="font-display text-4xl text-ink-900">{fmt(plan.priceFcfa)} <span className="text-2xl text-ink-400">FCFA</span></p>
                <p className="mt-1 text-sm text-ink-500">{plan.label} · paiement mobile money (CinetPay)</p>
              </div>
              <button onClick={pay} disabled={isBusy} className="btn btn-accent btn-lg w-full">
                {isBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> Traitement…</> : <><CheckCircle2 className="h-4 w-4" /> Payer et lancer l'audit</>}
              </button>
              <div className="flex items-center justify-center gap-4 text-xs text-ink-400">
                <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Paiement sécurisé</span>
                <button onClick={() => setStep('quote')} className="hover:text-ink-700">← Modifier</button>
              </div>
              <p className="text-[11px] text-ink-400">
                Sans clés marchandes configurées, le paiement est simulé (aucun débit).
              </p>
            </div>
          </div>
        )}

        {/* ── Step: report ── */}
        {step === 'report' && (
          <div className="mt-7 animate-fade-in-up">
            {!audit ? (
              <div className="card flex flex-col items-center gap-3 p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-accent-600" />
                <p className="font-medium text-ink-800">{auditStep || 'Audit en cours…'}</p>
                <p className="text-sm text-ink-500">Analyse par le moteur complet (19 détecteurs).</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="card flex items-center gap-3 border-emerald-200 bg-emerald-50/60 p-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-ink-900">Audit terminé{paymentMode === 'sandbox' ? ' (paiement simulé)' : ''}</p>
                    <p className="text-sm text-ink-500">{fmtDate(periodStart)} → {fmtDate(periodEnd)} · {months} mois</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <StatTile label="Transactions" value={String(audit.statistics.totalTransactions)} />
                  <StatTile label="Anomalies" value={String(audit.statistics.totalAnomalies)} tone={audit.statistics.totalAnomalies > 0 ? 'warn' : 'ok'} />
                  <StatTile label="Récupérable" value={`${fmt(audit.statistics.totalAnomalyAmount)}`} sub="FCFA" tone="gold" />
                </div>

                {audit.summary && (
                  <div className="card p-5">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${audit.summary.status === 'CRITICAL' ? 'bg-red-100 text-red-700' : audit.summary.status === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {audit.summary.status}
                      </span>
                      <p className="text-sm text-ink-700">{audit.summary.message}</p>
                    </div>
                    <p className="mt-3 text-[11px] text-ink-400">
                      {usedOfficialGrid
                        ? '✓ Comparé au barème officiel de votre banque (référentiel L2).'
                        : 'Audit sur les seules transactions (aucun barème officiel sélectionné ou disponible).'}
                    </p>
                  </div>
                )}

                {audit.anomalies.length > 0 && (
                  <div className="card p-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Anomalies détectées</p>
                    <ul className="divide-y divide-primary-100">
                      {audit.anomalies.slice(0, 10).map((a) => (
                        <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                          <span className="text-ink-700">{ANOMALY_TYPE_LABELS[a.type] ?? a.type}</span>
                          <span className="font-semibold text-accent-700">{fmt(a.amount)} FCFA</span>
                        </li>
                      ))}
                    </ul>
                    {audit.anomalies.length > 10 && (
                      <p className="mt-2 text-xs text-ink-400">+ {audit.anomalies.length - 10} autres dans le rapport complet.</p>
                    )}
                  </div>
                )}

                <button onClick={downloadReport} className="btn btn-primary btn-lg w-full">
                  <Download className="h-4 w-4" /> Télécharger le rapport complet
                </button>
                <div className="flex items-center justify-center gap-4 text-xs text-ink-400">
                  <button onClick={reset} className="inline-flex items-center gap-1 hover:text-ink-700">
                    <RotateCcw className="h-3 w-3" /> Nouvel audit
                  </button>
                  <span>· Vos données ne sont pas conservées</span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function StatTile({ label, value, sub, tone = 'default' }: { label: string; value: string; sub?: string; tone?: 'default' | 'ok' | 'warn' | 'gold' }) {
  const valueColor = tone === 'gold' ? 'text-accent-700' : tone === 'warn' ? 'text-amber-600' : tone === 'ok' ? 'text-emerald-600' : 'text-ink-900';
  return (
    <div className="card p-4 text-center">
      <p className="text-[11px] uppercase tracking-wide text-ink-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="text-[10px] text-ink-400">{sub}</p>}
    </div>
  );
}
