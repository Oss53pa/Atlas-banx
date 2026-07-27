// ============================================================================
// ATLASBANX — Funnel « Audit express » (Particulier, sans compte)
// ============================================================================
// Parcours public, éphémère : import d'un relevé → devis (forfait selon le
// nombre de mois détectés) → paiement (CinetPay, simulé en sandbox) → rapport
// détaillé téléchargeable. Aucune donnée n'est conservée durablement.
// ============================================================================

import { useMemo, useRef, useState } from 'react';
import { UploadCloud, Loader2, FileText, CheckCircle2, AlertCircle, Download, ArrowRight } from 'lucide-react';
import { extractStatement } from '../../extraction/bank-statement';
import { buildExpressReport, reportToHtml, type ExpressReport, type ExpressTxn } from '../../billing/express/expressReport';
import { getPaymentProvider } from '../../billing/payments';

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
  const [report, setReport] = useState<ExpressReport | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState<'sandbox' | 'live'>('sandbox');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setIsBusy(true);
    try {
      const result = await extractStatement(file);
      const txns: ExpressTxn[] = result.candidates.map((c) => ({
        date: c.date,
        description: c.description,
        amount: c.amount,
      }));
      const built = buildExpressReport(txns);
      if (built.txCount === 0 || !built.plan) {
        setError(
          built.txCount === 0
            ? "Aucune transaction détectée dans ce relevé. Essayez un PDF de meilleure qualité."
            : "La durée détectée dépasse nos forfaits standards (>12 mois). Contactez-nous pour une offre sur mesure.",
        );
        setReport(built.txCount === 0 ? null : built);
        return;
      }
      setReport(built);
      setStep('quote');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'analyse du relevé.");
    } finally {
      setIsBusy(false);
    }
  };

  const pay = async () => {
    if (!report?.plan) return;
    setError(null);
    setIsBusy(true);
    try {
      const provider = getPaymentProvider();
      setPaymentMode(provider.mode);
      const reference = `axb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const init = await provider.initiate({
        amount: report.plan.priceFcfa,
        currency: 'XOF',
        description: `Audit express — ${report.plan.label}`,
        reference,
        customerEmail: email || undefined,
        customerPhone: phone || undefined,
      });
      // En live, on redirigerait vers init.redirectUrl ; en sandbox on vérifie directement.
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec du paiement.');
    } finally {
      setIsBusy(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;
    const blob = new Blob([reportToHtml(report)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rapport-audit-express.html';
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
          Sans création de compte. Importez, payez, obtenez votre rapport détaillé. Vos données ne
          sont pas conservées.
        </p>

        {/* Progress */}
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

        {/* Step: import */}
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

        {/* Step: quote */}
        {step === 'quote' && report?.plan && (
          <div className="mt-8 space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50">Période détectée</p>
                <p className="text-lg font-semibold">
                  {fmtDate(report.periodStart)} → {fmtDate(report.periodEnd)}
                </p>
                <p className="text-xs text-white/40">{report.monthsAudited} mois · {report.txCount} transactions</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/50">{report.plan.label}</p>
                <p className="text-2xl font-bold text-amber-300">{fmt(report.plan.priceFcfa)} FCFA</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (réception du rapport)"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/25 focus:border-amber-400/50 focus:outline-none"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Téléphone (mobile money)"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/25 focus:border-amber-400/50 focus:outline-none"
              />
            </div>
            <button
              onClick={() => setStep('payment')}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-ink-950 hover:bg-amber-400"
            >
              Continuer vers le paiement <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Step: payment */}
        {step === 'payment' && report?.plan && (
          <div className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-7">
            <p className="text-sm text-white/70">
              Paiement CinetPay (mobile money) — <span className="font-semibold">{fmt(report.plan.priceFcfa)} FCFA</span> pour {report.plan.label}.
            </p>
            <button
              onClick={pay}
              disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-ink-950 hover:bg-amber-400 disabled:opacity-40"
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {isBusy ? 'Traitement…' : 'Payer et générer le rapport'}
            </button>
            <p className="text-[11px] text-white/35">
              Le prestataire de paiement réel se branche via les clés marchandes CinetPay ; tant
              qu'elles ne sont pas configurées, le paiement est simulé (aucun débit).
            </p>
          </div>
        )}

        {/* Step: report */}
        {step === 'report' && report && (
          <div className="mt-8 space-y-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-7">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">
                Paiement {paymentMode === 'sandbox' ? 'simulé ' : ''}confirmé — rapport prêt
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Kpi label="Transactions" value={String(report.txCount)} />
              <Kpi label="Débits (FCFA)" value={fmt(report.totalDebit)} />
              <Kpi label="Crédits (FCFA)" value={fmt(report.totalCredit)} />
              <Kpi label="Frais repérés" value={`${fmt(report.feesTotal)} FCFA`} />
            </div>
            {report.feeLines.length > 0 && (
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm">
                <p className="mb-2 text-xs uppercase tracking-wide text-white/40">Frais et commissions</p>
                <ul className="space-y-1">
                  {report.feeLines.slice(0, 8).map((f, i) => (
                    <li key={i} className="flex justify-between gap-2 text-white/70">
                      <span className="truncate">{fmtDate(f.date ?? null)} · {f.description}</span>
                      <span className="text-red-300">{fmt(-f.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              onClick={downloadReport}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-ink-950 hover:bg-amber-400"
            >
              <Download className="h-4 w-4" /> Télécharger le rapport détaillé
            </button>
            <p className="text-[11px] text-white/35">
              Vos données ne sont pas conservées : rechargez la page pour tout effacer.
            </p>
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
