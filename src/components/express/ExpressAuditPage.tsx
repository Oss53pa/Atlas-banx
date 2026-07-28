// ============================================================================
// ATLASBANX — Funnel « Audit express » (Particulier, sans compte)
// ============================================================================
// Parcours public, éphémère, à VALEUR PROUVÉE AVANT PAIEMENT :
//   import relevé → analyse GRATUITE (audit complet, mêmes 19 détecteurs que
//   l'offre Entreprise via runFullAudit) → révélation du montant récupérable +
//   prix indexé sur ce montant (jamais > au récupérable ; offert sous un seuil)
//   → déblocage payant du rapport détaillé → rapport A4 + détail.
// Aucune donnée conservée.
//
// Mise en page : sidebar bleue (notice + progression) à gauche, contenu sur la
// largeur restante. Titres en Grand Hotel (font-display), reste en Dosis
// (font-sans).
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud, Loader2, FileText, CheckCircle2, AlertCircle, Download, ArrowRight,
  ArrowLeft, Lock, RotateCcw, Sparkles,
} from 'lucide-react';
import { extractStatement } from '../../extraction/bank-statement';
import { runFullAudit } from '../../services/audit/runFullAudit';
import { countAuditedMonths } from '../../billing/auditPlans';
import { pricingForRecovery, type RecoveryPricing } from '../../billing/recoveryPricing';
import { auditReportToHtml } from '../../billing/express/auditReportHtml';
import { buildParticulierComplaintLetter, complaintLetterToHtml } from '../../billing/express/complaintLetter';
import { CGV_PARTICULIER_VERSION, CGV_PARTICULIER_SECTIONS } from '../../billing/express/cgvParticulier';
import { l2ToBankConditions } from '../../billing/express/l2ToBankConditions';
import { getPaymentProvider } from '../../billing/payments';
import { fetchPublicBankReference, fetchPublicBankList } from '../../services/publicBankReference';
import { DEFAULT_BANKS } from '../../store/bankStore';
import { ANOMALY_TYPE_LABELS, AFRICAN_COUNTRIES, type Transaction, type AnalysisResult, type BankConditions } from '../../types';

type Step = 'import' | 'setup' | 'reveal' | 'report';

// Catalogue complet des banques (CEMAC + UEMOA), groupé par zone puis par pays,
// pour l'affichage en <optgroup>. Le funnel express doit permettre de choisir
// N'IMPORTE quelle banque des deux régions — pas seulement celles dont le
// barème officiel L2 est déjà publié.
const BANKS_BY_ZONE: { zone: 'CEMAC' | 'UEMOA'; countries: { iso: string; name: string; banks: typeof DEFAULT_BANKS }[] }[] = (() => {
  const zones: ('CEMAC' | 'UEMOA')[] = ['UEMOA', 'CEMAC'];
  return zones.map((zone) => {
    const inZone = DEFAULT_BANKS.filter((b) => b.zone === zone);
    const byCountry = new Map<string, typeof DEFAULT_BANKS>();
    for (const b of inZone) {
      const list = byCountry.get(b.country) ?? [];
      list.push(b);
      byCountry.set(b.country, list);
    }
    const countries = Array.from(byCountry.entries())
      .map(([iso, banks]) => ({
        iso,
        name: AFRICAN_COUNTRIES[iso] ?? iso,
        banks: banks.slice().sort((a, b) => a.name.localeCompare(b.name, 'fr')),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    return { zone, countries };
  });
})();

const STEPS: { id: Step; label: string; hint: string }[] = [
  { id: 'import', label: 'Votre relevé', hint: 'Importez votre PDF' },
  { id: 'setup', label: 'Analyse gratuite', hint: 'Banque & type de relevé' },
  { id: 'reveal', label: 'Votre potentiel', hint: 'Montant récupérable estimé' },
  { id: 'report', label: 'Rapport', hint: 'Détail & lettre de réclamation' },
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
  const [pricing, setPricing] = useState<RecoveryPricing | null>(null);
  const [audit, setAudit] = useState<AnalysisResult | null>(null);
  const [auditStep, setAuditStep] = useState<string>('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [clientName, setClientName] = useState('');
  const [accountRef, setAccountRef] = useState('');
  const [bankCode, setBankCode] = useState('');
  // Codes des banques dont le barème officiel L2 est publié — sert à annoter
  // le catalogue (« barème officiel disponible ») sans restreindre le choix.
  const [officialGridCodes, setOfficialGridCodes] = useState<Set<string>>(new Set());
  const [segment, setSegment] = useState<'particulier' | 'pme' | 'corporate'>('particulier');
  const [usedOfficialGrid, setUsedOfficialGrid] = useState(false);
  // Barème L2 utilisé (banque + version + date d'effet) — cité dans la méthodologie.
  const [refGrid, setRefGrid] = useState<
    { bankName: string; bankCode: string; versionLabel?: string | null; effectiveFrom?: string | null } | null
  >(null);
  const [paymentMode, setPaymentMode] = useState<'sandbox' | 'live'>('sandbox');
  // Acceptation des CGV — OBLIGATOIRE avant tout import de relevé.
  const [cgvAccepted, setCgvAccepted] = useState(false);
  const [cgvChecked, setCgvChecked] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchPublicBankList().then((list) => {
      if (!cancelled) setOfficialGridCodes(new Set(list.map((b) => b.code)));
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
      setTransactions(txs);
      setPeriodStart(start);
      setPeriodEnd(end);
      setMonths(m);
      setStep('setup');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'analyse du relevé.");
    } finally {
      setIsBusy(false);
    }
  };

  // Aperçu GRATUIT : on lance l'audit AVANT paiement pour révéler le montant
  // récupérable et en déduire un prix indexé (le client ne paie jamais plus
  // que ce qu'il récupère). Le détail actionnable reste verrouillé jusqu'au
  // paiement (ou offert si le récupérable est trop faible).
  const analyze = async () => {
    setError(null);
    setIsBusy(true);
    setStep('reveal');
    setAuditStep('Lancement de l\'analyse…');
    try {
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
          const b = DEFAULT_BANKS.find((x) => x.code === bankCode);
          setRefGrid({
            bankName: ref.legalName ?? b?.name ?? bankCode,
            bankCode,
            versionLabel: ref.versionLabel ?? null,
            effectiveFrom: ref.effectiveFrom ?? null,
          });
        }
      }
      const result = await runFullAudit({
        transactions, bankConditions, bankCode: bankCode || undefined,
        onProgress: (_pct, s) => setAuditStep(s),
      });
      setAudit(result);
      setPricing(pricingForRecovery(result.statistics.totalAnomalyAmount));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'analyse.");
      setStep('setup');
    } finally {
      setIsBusy(false);
    }
  };

  // Déblocage payant du rapport détaillé (uniquement si le récupérable dépasse
  // le seuil de gratuité). L'audit est DÉJÀ calculé — on ne facture que le
  // détail + le rapport + la lettre de réclamation.
  const unlock = async () => {
    if (!pricing || pricing.isFree) { setStep("report"); return; }
    setError(null);
    setIsBusy(true);
    try {
      const provider = getPaymentProvider();
      const reference = `axb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const init = await provider.initiate({
        amount: pricing.priceFcfa, currency: 'XOF',
        description: `Audit express — déblocage rapport (${fmt(pricing.recoverableFcfa)} FCFA récupérables) · CGV v${CGV_PARTICULIER_VERSION} acceptées`,
        reference, customerEmail: email || undefined, customerPhone: phone || undefined,
      });
      setPaymentMode(init.mode);
      if (init.redirectUrl) { window.location.href = init.redirectUrl; return; }
      const check = await provider.verify(init.transactionId);
      if (check.status !== 'succeeded') { setError('Paiement non confirmé. Réessayez.'); return; }
      setStep('report');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec du paiement.');
    } finally {
      setIsBusy(false);
    }
  };

  // Rapport détaillé aux STANDARDS INTERNATIONAUX : on réutilise le générateur
  // premium de l'application (PremiumReportService — PDF vectoriel : page de
  // garde, synthèse, détail par anomalie avec références tarifaires et
  // comparaison contractuelle, méthodologie, glossaire, références
  // réglementaires COBAC/BCEAO, certificat d'intégrité). Import dynamique pour
  // ne pas alourdir le chargement initial du funnel.
  const downloadReport = async () => {
    if (!audit) return;
    setIsBusy(true);
    try {
      const { PremiumReportService } = await import('../../services/PremiumReportService');
      const { sha256Hex, archiveExpressReport } = await import('../../billing/express/reportArchive');
      const bank = DEFAULT_BANKS.find((b) => b.code === bankCode);
      const reportRef = `AXB-${Date.now().toString(36).toUpperCase()}`;
      // Livrable CERTIFIÉ : PDF chiffré, permissions « impression seule » →
      // NON MODIFIABLE. build() (sans le journal d'audit de download()).
      const doc = await PremiumReportService.build(
        {
          title: "Rapport d'audit bancaire — Particulier",
          clientName: clientName.trim() || 'Titulaire du compte',
          period: { start: periodStart ?? new Date(), end: periodEnd ?? new Date() },
          anomalies: audit.anomalies,
          statistics: audit.statistics,
          summary: audit.summary,
          analysisMode: usedOfficialGrid ? 'Barème officiel (référentiel L2)' : 'Transactions',
          banks: bank ? [{ name: bank.name, code: bank.code }] : undefined,
          referenceGrids: refGrid ? [refGrid] : undefined,
          auditId: reportRef,
        },
        undefined,
        { userPermissions: ['print'] },
      );

      // Octets EXACTS du PDF → empreinte identique à celle du fichier remis.
      const buffer = doc.output('arraybuffer') as ArrayBuffer;
      const pdfSha256 = await sha256Hex(buffer);

      // Archive Atlas (empreinte + métadonnées non nominatives). Best-effort.
      void archiveExpressReport({
        reportRef, pdfSha256,
        bankCode: bankCode || undefined,
        periodStart, periodEnd,
        anomalyCount: audit.statistics.totalAnomalies,
        totalRecoverable: audit.statistics.totalAnomalyAmount,
        usedOfficialGrid,
      });

      // Enregistrement du MÊME buffer (pas de re-sérialisation).
      const blob = new Blob([buffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rapport-audit-atlasbanx.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      // Repli : rapport HTML A4 imprimable si la génération PDF échoue.
      console.error('[express] génération PDF premium échouée, repli HTML:', err);
      const html = auditReportToHtml(audit, {
        periodStart, periodEnd, months,
        planLabel: pricing && !pricing.isFree ? `Rapport débloqué (${fmt(pricing.priceFcfa)} FCFA)` : 'Rapport offert',
      });
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rapport-audit-atlasbanx.html';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsBusy(false);
    }
  };

  // Lettre de réclamation prête à envoyer — réutilise le résultat du MÊME
  // moteur de détection + l'annuaire d'adresses des banques.
  const downloadComplaintLetter = () => {
    if (!audit) return;
    const bank = DEFAULT_BANKS.find((b) => b.code === bankCode);
    const { text } = buildParticulierComplaintLetter({
      clientFullName: clientName,
      accountRef,
      bankCode: bankCode || '',
      bankLegalName: bank?.name ?? '',
      period: { start: periodStart, end: periodEnd },
      anomalies: audit.anomalies,
      totalRecoverableFcfa: audit.statistics.totalAnomalyAmount,
    });
    const blob = new Blob([complaintLetterToHtml(text)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lettre-reclamation-banque.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setStep('import'); setError(null); setAudit(null); setPricing(null);
    setTransactions([]); setBankCode(''); setEmail(''); setPhone('');
    setClientName(''); setAccountRef(''); setUsedOfficialGrid(false); setRefGrid(null);
  };

  return (
    <div className="min-h-screen flex bg-canvas-100 font-sans text-ink-800">
      {/* ================= SIDEBAR BLEUE — note explicative ================= */}
      <aside className="hidden md:flex w-72 lg:w-80 flex-shrink-0 flex-col justify-between bg-gradient-to-b from-ink-800 via-ink-900 to-ink-950 px-7 py-9 text-white lg:px-8">
        <div>
          <button onClick={() => navigate('/landing')} className="font-display text-3xl text-gradient-gold leading-none">
            AtlasBanx
          </button>
          <p className="mt-8 font-display text-4xl leading-tight text-white">Audit express</p>

          {/* Note explicative */}
          <div className="mt-6 space-y-6 text-sm leading-relaxed text-white/60">
            <p>
              Vérifiez en quelques minutes que votre banque ne vous facture pas de{' '}
              <span className="text-white/85">frais indus</span> — sans créer de compte.
            </p>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-300">Comment ça marche</p>
              <ol className="space-y-1.5 text-[13px]">
                <li>1. Importez votre relevé bancaire (PDF).</li>
                <li>2. <span className="text-white/85">Analyse gratuite</span> : découvrez le montant récupérable.</li>
                <li>3. Débloquez le rapport détaillé — le prix ne dépasse jamais votre gain.</li>
              </ol>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-300">Notre promesse</p>
              <p className="text-[13px]">
                Vous voyez ce que vous pouvez récupérer <span className="text-white/85">avant</span> de payer.
                Le tarif est une fraction du récupérable ; si le montant est trop faible, le rapport est
                <span className="text-white/85"> offert</span>. Vous gagnez toujours plus que ce que vous payez.
              </p>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-300">Ce que nous détectons</p>
              <p className="text-[13px]">
                Frais en double, frais fantômes, surfacturation, erreurs d'agios, dates de valeur
                abusives et non-conformités OHADA — via le même moteur (19 détecteurs) que l'offre
                Entreprise.
              </p>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-300">Confidentialité</p>
              <p className="text-[13px]">
                Aucun compte. Votre relevé n'est <span className="text-white/85">pas conservé</span> — supprimé
                en fin de parcours. Seule une empreinte du rapport certifié est archivée (preuve en cas de
                contrôle), sans aucune donnée personnelle.
              </p>
            </div>
          </div>
        </div>

        <p className="border-t border-white/10 pt-4 text-[10px] uppercase tracking-[0.18em] text-white/25">
          © 2026 Atlas Studio · CEMAC &amp; UEMOA
        </p>
      </aside>

      {/* ================= CONTENU (largeur restante) ================= */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Barre du haut (mobile + retour) */}
        <header className="flex h-16 items-center justify-between border-b border-primary-100/70 bg-white/70 px-5 backdrop-blur md:justify-end">
          <button onClick={() => navigate('/landing')} className="font-display text-2xl text-ink-900 md:hidden">AtlasBanx</button>
          <button onClick={() => navigate('/landing')} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800">
            <ArrowLeft className="h-4 w-4" /> Accueil
          </button>
        </header>

        {/* ============ BARRIÈRE CGV — avant TOUT import ============ */}
        {!cgvAccepted ? (
          <div className="flex-1 px-5 py-8 sm:px-10 sm:py-12">
            <div className="mx-auto w-full max-w-3xl">
              <h1 className="font-display text-4xl sm:text-5xl text-ink-900 leading-tight">Avant de commencer</h1>
              <p className="mt-1.5 text-[15px] text-ink-500">
                Merci de lire et d'accepter nos Conditions Générales de Vente. L'analyse de votre relevé est
                gratuite ; vous ne payez que si vous choisissez de débloquer le rapport détaillé.
              </p>

              <div className="card mt-6 max-h-[52vh] overflow-y-auto p-6">
                <p className="text-[11px] uppercase tracking-[0.16em] text-accent-600">
                  Conditions Générales de Vente — Audit express (particuliers) · v{CGV_PARTICULIER_VERSION}
                </p>
                <div className="mt-4 space-y-5">
                  {CGV_PARTICULIER_SECTIONS.map((s) => (
                    <div key={s.title}>
                      <h2 className="text-sm font-semibold text-ink-900">{s.title}</h2>
                      <div className="mt-1 space-y-1.5">
                        {s.body.map((p, i) => (
                          <p key={i} className="text-[13px] leading-relaxed text-ink-600">{p}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-xl border border-primary-200 bg-white p-4 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={cgvChecked}
                  onChange={(e) => setCgvChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-primary-300 text-ink-900 focus:ring-ink-400"
                />
                <span>
                  J'ai lu et j'accepte les <strong>Conditions Générales de Vente</strong> (v{CGV_PARTICULIER_VERSION}).
                  Je demande l'exécution immédiate du service. Je reconnais qu'aucune donnée de mon relevé n'est
                  conservée, et qu'une <strong>empreinte du rapport certifié</strong> est archivée à des fins de preuve.
                </span>
              </label>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button onClick={() => navigate('/landing')} className="text-sm text-ink-500 hover:text-ink-800">
                  ← Retour à l'accueil
                </button>
                <button
                  onClick={() => setCgvAccepted(true)}
                  disabled={!cgvChecked}
                  className="btn btn-primary btn-lg sm:w-auto disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Accepter et commencer <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
        <>
        {/* Stepper horizontal (progression des étapes) — étapes nommées */}
        <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 border-b border-primary-100/70 bg-white/40 px-4 py-3">
          {STEPS.map((s, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            return (
              <div key={s.id} className="flex items-center">
                <div className="flex items-center gap-2">
                  <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    done ? 'bg-emerald-500 text-white' : active ? 'bg-accent-500 text-white' : 'bg-primary-100 text-ink-400'
                  }`}>{done ? '✓' : i + 1}</span>
                  <span className={`text-xs font-medium sm:text-[13px] ${
                    done ? 'text-emerald-700' : active ? 'text-ink-900' : 'text-ink-400'
                  }`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <span className={`mx-2 hidden h-px w-6 sm:block lg:w-10 ${done ? 'bg-emerald-400' : 'bg-primary-200'}`} />}
              </div>
            );
          })}
        </div>

        <div className="flex-1 px-5 py-8 sm:px-10 sm:py-12">
          <div className="w-full">
            {/* Titre de section */}
            <h1 className="font-display text-4xl sm:text-5xl text-ink-900 leading-tight">
              {step === 'import' && 'Importez votre relevé'}
              {step === 'setup' && 'Analyse gratuite'}
              {step === 'reveal' && (audit ? 'Votre potentiel' : 'Analyse en cours')}
              {step === 'report' && 'Votre rapport'}
            </h1>
            <p className="mt-1.5 text-[15px] text-ink-500">
              {step === 'import' && 'Déposez votre relevé bancaire (PDF). L\'OCR gère les scans.'}
              {step === 'setup' && 'Sélectionnez votre banque et le type de relevé — l\'analyse est gratuite.'}
              {step === 'reveal' && (audit ? 'Voici ce que vous pourriez récupérer — sans encore payer.' : 'Le moteur complet analyse vos transactions.')}
              {step === 'report' && 'Détail des frais indus, agios et dates de valeur.'}
            </p>

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
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); if (!isBusy) void handleFile(e.dataTransfer.files?.[0] ?? null); }}
                  className={`card cursor-pointer p-12 text-center transition-all ${
                    dragOver ? 'border-accent-400 bg-accent-50/40 shadow-card-hover' : 'hover:border-primary-200 hover:shadow-card-hover'
                  }`}
                >
                  <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
                    {isBusy ? <Loader2 className="h-7 w-7 animate-spin" /> : <UploadCloud className="h-7 w-7" />}
                  </span>
                  <p className="mt-4 text-lg font-semibold text-ink-900">
                    {isBusy ? 'Analyse de votre relevé…' : 'Glissez votre relevé PDF ici'}
                  </p>
                  <p className="mt-1 text-sm text-ink-500">{isBusy ? 'Extraction des transactions (OCR inclus).' : 'ou cliquez pour parcourir vos fichiers.'}</p>
                  {!isBusy && <span className="btn btn-primary btn-lg mt-6 pointer-events-none"><FileText className="h-4 w-4" /> Choisir un PDF</span>}
                  <p className="mt-4 text-[11px] text-ink-400">Format PDF · relevé bancaire · OCR pour les scans</p>
                  <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden"
                    onChange={(e) => { void handleFile(e.target.files?.[0] ?? null); e.target.value = ''; }} />
                </div>
              </div>
            )}

            {/* ── Step: setup (analyse gratuite) ── */}
            {step === 'setup' && (
              <div className="mt-7 space-y-4 animate-fade-in-up">
                <div className="card overflow-hidden">
                  <div className="flex flex-col gap-4 bg-gradient-to-br from-ink-800 to-ink-950 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-white/50">Période détectée</p>
                      <p className="mt-1 text-xl font-semibold">{fmtDate(periodStart)} → {fmtDate(periodEnd)}</p>
                      <p className="mt-0.5 text-sm text-white/50">{months} mois · {transactions.length} transactions</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs uppercase tracking-wide text-white/50">Analyse</p>
                      <p className="font-display text-4xl text-gradient-gold leading-none">Gratuite</p>
                      <p className="text-sm text-white/50">payez seulement si ça vaut le coup</p>
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
                          }`}>{opt.label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Votre banque <span className="font-normal text-ink-400">— CEMAC &amp; UEMOA · compare au barème officiel si disponible (optionnel)</span></label>
                    <select value={bankCode} onChange={(e) => setBankCode(e.target.value)} className="input mt-1">
                      <option value="">— Sans barème (audit sur les seules transactions) —</option>
                      {BANKS_BY_ZONE.map((z) =>
                        z.countries.map((c) => (
                          <optgroup key={`${z.zone}-${c.iso}`} label={`${z.zone} · ${c.name}`}>
                            {c.banks.map((b) => (
                              <option key={b.code} value={b.code}>
                                {b.name}{officialGridCodes.has(b.code) ? '  ✓ barème officiel' : ''}
                              </option>
                            ))}
                          </optgroup>
                        )),
                      )}
                    </select>
                    <p className="mt-1.5 text-[11px] text-ink-400">
                      {DEFAULT_BANKS.length} banques référencées (CEMAC + UEMOA). Les banques marquées «&nbsp;✓ barème officiel&nbsp;» sont comparées au tarif publié ; les autres sont auditées sur les seules transactions.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label">Nom complet <span className="font-normal text-ink-400">(pour la lettre de réclamation)</span></label>
                      <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Prénom NOM" className="input mt-1" />
                    </div>
                    <div>
                      <label className="label">N° de compte <span className="font-normal text-ink-400">(optionnel)</span></label>
                      <input value={accountRef} onChange={(e) => setAccountRef(e.target.value)} placeholder="CI••• …" className="input mt-1" />
                    </div>
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
                  <button onClick={analyze} disabled={isBusy} className="btn btn-primary btn-lg w-full">
                    {isBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyse…</> : <><Sparkles className="h-4 w-4" /> Analyser gratuitement mon relevé</>}
                  </button>
                  <p className="text-center text-[11px] text-ink-400">Aucun paiement à cette étape. Vous verrez d'abord ce que vous pouvez récupérer.</p>
                </div>
              </div>
            )}

            {/* ── Step: reveal (potentiel + prix indexé) ── */}
            {step === 'reveal' && (
              <div className="mt-7 animate-fade-in-up">
                {!audit || !pricing ? (
                  <div className="card flex flex-col items-center gap-3 p-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-accent-600" />
                    <p className="font-medium text-ink-800">{auditStep || 'Analyse en cours…'}</p>
                    <p className="text-sm text-ink-500">Moteur complet (19 détecteurs) — gratuit.</p>
                  </div>
                ) : pricing.recoverableFcfa <= 0 ? (
                  /* Relevé conforme : rien à récupérer */
                  <div className="space-y-4">
                    <div className="card border-emerald-200 bg-emerald-50/60 p-6 text-center">
                      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white"><CheckCircle2 className="h-6 w-6" /></span>
                      <p className="mt-3 font-display text-3xl text-ink-900">Relevé conforme</p>
                      <p className="mt-1 text-sm text-ink-500">
                        Aucun frais indu détecté sur {transactions.length} transactions
                        {usedOfficialGrid ? ', y compris face au barème officiel de votre banque.' : '.'}
                      </p>
                    </div>
                    <button onClick={() => { setStep("report"); }} className="btn btn-primary btn-lg w-full">
                      Voir le rapport (offert) <ArrowRight className="h-4 w-4" />
                    </button>
                    <button onClick={reset} className="mx-auto flex items-center gap-1 text-xs text-ink-400 hover:text-ink-700"><RotateCcw className="h-3 w-3" /> Nouvel audit</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Bandeau récupérable */}
                    <div className="card overflow-hidden">
                      <div className="bg-gradient-to-br from-ink-800 to-ink-950 p-6 text-center text-white">
                        <p className="text-xs uppercase tracking-[0.16em] text-white/50">Montant potentiellement récupérable</p>
                        <p className="mt-1 font-display text-5xl text-gradient-gold leading-none sm:text-6xl">{fmt(pricing.recoverableFcfa)}</p>
                        <p className="mt-1 text-sm text-white/50">FCFA · {audit.statistics.totalAnomalies} anomalie{audit.statistics.totalAnomalies > 1 ? 's' : ''} détectée{audit.statistics.totalAnomalies > 1 ? 's' : ''} sur {months} mois</p>
                        <p className="mt-2 text-[11px] text-white/40">
                          {usedOfficialGrid ? '✓ Comparé au barème officiel de votre banque (référentiel L2).' : 'Audit sur vos seules transactions (aucun barème officiel disponible).'}
                        </p>
                      </div>
                    </div>

                    {/* Décomposition prix / gain net */}
                    <div className="card p-6">
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-ink-400">Prix du rapport</p>
                          <p className="mt-1 text-2xl font-bold text-ink-900">{fmt(pricing.priceFcfa)}</p>
                          <p className="text-[10px] text-ink-400">FCFA</p>
                        </div>
                        <div className="flex items-center justify-center text-ink-300">
                          <span className="text-2xl">→</span>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-ink-400">Votre gain net</p>
                          <p className="mt-1 text-2xl font-bold text-emerald-600">{fmt(pricing.netGainFcfa)}</p>
                          <p className="text-[10px] text-ink-400">FCFA après déduction</p>
                        </div>
                      </div>
                      <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs text-emerald-800">
                        Vous récupérez potentiellement <strong>{fmt(pricing.netGainFcfa)} FCFA de plus</strong> que le prix du rapport.
                        Le tarif équivaut à {Math.round(pricing.effectiveRate * 100)}% du récupérable — jamais plus.
                      </p>
                    </div>

                    {/* Aperçu flouté du détail (incitation) */}
                    <div className="card p-5">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Aperçu du détail (débloqué après paiement)</p>
                      <ul className="divide-y divide-primary-100">
                        {audit.anomalies.slice(0, 4).map((a) => (
                          <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                            <span className="text-ink-700">{ANOMALY_TYPE_LABELS[a.type] ?? a.type}</span>
                            <span className="select-none font-semibold text-accent-700 blur-sm">•••• FCFA</span>
                          </li>
                        ))}
                      </ul>
                      {audit.anomalies.length > 4 && <p className="mt-2 text-xs text-ink-400">+ {audit.anomalies.length - 4} autres lignes dans le rapport complet.</p>}
                    </div>

                    <button onClick={unlock} disabled={isBusy} className="btn btn-accent btn-lg w-full">
                      {isBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> Traitement…</> : <><Lock className="h-4 w-4" /> Débloquer le rapport détaillé — {fmt(pricing.priceFcfa)} FCFA</>}
                    </button>
                    <div className="flex items-center justify-center gap-4 text-xs text-ink-400">
                      <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Paiement mobile money sécurisé (CinetPay)</span>
                      <button onClick={reset} className="hover:text-ink-700">← Recommencer</button>
                    </div>
                    <p className="text-center text-[11px] text-ink-400">Sans clés marchandes configurées, le paiement est simulé (aucun débit).</p>
                  </div>
                )}
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
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white"><CheckCircle2 className="h-5 w-5" /></span>
                      <div>
                        <p className="font-semibold text-ink-900">
                          {pricing && !pricing.isFree
                            ? `Rapport débloqué${paymentMode === 'sandbox' ? ' (paiement simulé)' : ''}`
                            : 'Rapport (offert)'}
                        </p>
                        <p className="text-sm text-ink-500">
                          {fmtDate(periodStart)} → {fmtDate(periodEnd)} · {months} mois
                          {pricing && !pricing.isFree ? ` · gain net ${fmt(pricing.netGainFcfa)} FCFA` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <StatTile label="Transactions" value={String(audit.statistics.totalTransactions)} />
                      <StatTile label="Anomalies" value={String(audit.statistics.totalAnomalies)} tone={audit.statistics.totalAnomalies > 0 ? 'warn' : 'ok'} />
                      <StatTile label="Récupérable" value={fmt(audit.statistics.totalAnomalyAmount)} sub="FCFA" tone="gold" />
                    </div>
                    {audit.summary && (
                      <div className="card p-5">
                        <div className="flex items-center gap-2">
                          <span className={`badge ${audit.summary.status === 'CRITICAL' ? 'bg-red-100 text-red-700' : audit.summary.status === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{audit.summary.status}</span>
                          <p className="text-sm text-ink-700">{audit.summary.message}</p>
                        </div>
                        <p className="mt-3 text-[11px] text-ink-400">
                          {usedOfficialGrid ? '✓ Comparé au barème officiel de votre banque (référentiel L2).' : 'Audit sur les seules transactions (aucun barème officiel sélectionné ou disponible).'}
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
                        {audit.anomalies.length > 10 && <p className="mt-2 text-xs text-ink-400">+ {audit.anomalies.length - 10} autres dans le rapport complet.</p>}
                      </div>
                    )}
                    {/* Lettre de réclamation prête à envoyer — c'est ce qui transforme
                        « récupérable » en « récupéré ». */}
                    {audit.anomalies.some((a) => (a.amount ?? 0) > 0) && (
                      <div className="card border-accent-200 bg-accent-50/40 p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="flex items-center gap-1.5 font-semibold text-ink-900">
                              <FileText className="h-4 w-4 text-accent-600" /> Votre lettre de réclamation
                            </p>
                            <p className="mt-0.5 text-sm text-ink-500">
                              Courrier formel pré-rempli (montants, période, banque) à imprimer et envoyer à votre agence.
                            </p>
                          </div>
                          <button onClick={downloadComplaintLetter} className="btn btn-accent btn-md whitespace-nowrap">
                            <Download className="h-4 w-4" /> Lettre (A4)
                          </button>
                        </div>
                      </div>
                    )}
                    <button onClick={downloadReport} disabled={isBusy} className="btn btn-primary btn-lg w-full">
                      {isBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> Génération du PDF…</> : <><Download className="h-4 w-4" /> Télécharger le rapport détaillé (PDF)</>}
                    </button>
                    <div className="flex items-center justify-center gap-4 text-xs text-ink-400">
                      <button onClick={reset} className="inline-flex items-center gap-1 hover:text-ink-700"><RotateCcw className="h-3 w-3" /> Nouvel audit</button>
                      <span>· PDF certifié non modifiable · relevé non conservé, empreinte archivée</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </>
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
