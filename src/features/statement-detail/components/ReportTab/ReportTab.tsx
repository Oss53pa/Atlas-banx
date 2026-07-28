// ============================================================================
// ReportTab — orchestrateur de l'onglet Rapport
// ============================================================================
// Compose TemplateChooser + ReportViewerPage (plein ecran) + ComplaintLetterCard.
// Au clic sur "Generer", le rapport s'ouvre en plein ecran avec le visualiseur.
// ============================================================================

import { useMemo, useState } from 'react';
import { ShieldCheck, Download } from 'lucide-react';
import type {
  Anomaly,
  AccountConvention,
  SignatureType,
  SignedReport,
  ReportRecipient,
  BankReconciliation,
} from '../../types/statement.types';
import { ReportViewerPage } from './ReportViewerPage';
import { ComplaintLetterCard } from './ComplaintLetterCard';
import { formatComplaintLetter } from '../../reports/formatComplaintLetter';
import { resolveBankAddress } from '../../data/bankDirectory';

interface ReportTabProps {
  statement: {
    id: string;
    accountNumber: string;
    bankCode: string;
    bankLegalName: string;
    period: { start: string; end: string };
    clientLegalName: string;
    accountId?: string;
    tenantId?: string;
    organizationId?: string;
  };
  anomalies: Anomaly[];
  convention?: AccountConvention | null;
  reconciliation?: BankReconciliation | null;
  currentUser: { handle: string; displayName: string; role: 'dg' | 'senior' | 'junior' | 'consultation' };
  cabinet: { name: string; addressLines: string[] };
  /** Signature/envoi de la lettre de réclamation depuis le visualiseur. */
  onSignAndSend?: (args: {
    reportId: string;
    signatureType: SignatureType;
    recipients: ReportRecipient[];
    message: string;
  }) => Promise<void>;
  onGenerateComplaintLetter?: (anomalyIds: string[]) => void;
  /** Le résultat d'analyse client est disponible → PDF premium générable. */
  premiumReady?: boolean;
  /** Télécharge le rapport premium certifié (PDF chiffré, non modifiable). */
  onDownloadPremium?: () => void;
}

export function ReportTab(props: ReportTabProps) {
  // Pour la lettre de réclamation ouverte dans le visualiseur : on construit
  // un faux SignedReport (template = 'lettre_reclamation') car le viewer
  // attend toujours un SignedReport en entrée.
  const [letterReport, setLetterReport] = useState<SignedReport | null>(null);

  function handleOpenLetterInViewer(formattedText: string) {
    void formattedText; // injecté via complaintLetterText prop
    const synthLetterReport: SignedReport = {
      id: `letter-${Date.now()}`,
      statementId: props.statement.id,
      template: 'lettre_reclamation',
      signerId: null,
      signerHandle: null,
      signatureType: null,
      documentUrl: '',
      proofBundleUrl: null,
      hash: '—',
      timestampRfc3161: null,
      recipients: [],
      status: 'draft',
      signedAt: null,
      createdAt: new Date().toISOString(),
    };
    setLetterReport(synthLetterReport);
  }

  // Texte de la lettre de réclamation — préparé à l'avance pour pouvoir
  // l'afficher comme « Annexe A » dans le visualiseur du rapport quand
  // l'option « Inclure la lettre de réclamation » est activée.
  const complaintLetterText = useMemo(() => {
    const tariffaires = ['commission_excessive', 'agio_errone', 'frais_double', 'convention_violee'];
    const eligible = props.anomalies.filter(
      (a) => tariffaires.includes(a.type)
        && ['qualified', 'validated', 'signed', 'closed'].includes(a.status),
    );
    if (eligible.length === 0 || !props.convention) return null;

    const bankAddr = resolveBankAddress(props.statement.bankCode);
    const formatted = formatComplaintLetter({
      cabinet: props.cabinet,
      bank: {
        legalName: bankAddr.legalName || props.statement.bankLegalName,
        addressLines: bankAddr.addressLines.length > 0
          ? bankAddr.addressLines
          : [props.statement.bankLegalName],
      },
      client: {
        legalName: props.statement.clientLegalName,
        accountNumber: props.statement.accountNumber,
      },
      period: props.statement.period,
      convention: { id: props.convention.id, signedDate: props.convention.signedDate },
      anomalies: eligible,
      signatory: {
        displayName: props.currentUser.displayName,
        title: props.currentUser.role.toUpperCase(),
      },
    });
    return formatted.text;
  }, [
    props.anomalies, props.convention, props.cabinet,
    props.statement, props.currentUser,
  ]);

  return (
    <>
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {/* Rapport premium certifié — même moteur PDF que l'audit express et la
            page Analyses. Non modifiable (chiffré, impression seule) et archivé
            par Atlas. Disponible dès que l'analyse a été lancée. */}
        {props.onDownloadPremium && (
          <div className="bg-white border border-canvas-200 rounded-lg p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-ink-900">Rapport d'audit premium certifié</div>
              <p className="text-xs text-ink-500 mt-0.5">
                PDF vectoriel complet (détail des frais, renvoi aux conditions bancaires,
                séparation des anomalies certaines ≥ 90 % et à confirmer). Chiffré et non
                modifiable ; une empreinte est archivée par Atlas pour contrôle.
              </p>
              {!props.premiumReady && (
                <p className="text-xs text-amber-700 mt-1.5">
                  Lancez d'abord l'analyse dans l'onglet « Analyse » pour générer ce rapport.
                </p>
              )}
            </div>
            <button
              type="button"
              disabled={!props.premiumReady}
              onClick={() => props.onDownloadPremium?.()}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Télécharger
            </button>
          </div>
        )}

        {/* Lettre de reclamation */}
        <ComplaintLetterCard
          statement={{
            accountNumber: props.statement.accountNumber,
            bankCode: props.statement.bankCode,
            bankLegalName: props.statement.bankLegalName,
            period: props.statement.period,
            clientLegalName: props.statement.clientLegalName,
          }}
          anomalies={props.anomalies}
          convention={props.convention ?? null}
          cabinet={props.cabinet}
          signatory={props.currentUser}
          onGenerate={props.onGenerateComplaintLetter}
          onPreviewInViewer={handleOpenLetterInViewer}
        />
      </div>

      {/* Viewer plein ecran — lettre de reclamation (meme UI que les rapports) */}
      {letterReport && (
        <ReportViewerPage
          report={letterReport}
          statement={props.statement}
          anomalies={props.anomalies}
          reconciliation={props.reconciliation}
          cabinet={props.cabinet}
          complaintLetterText={complaintLetterText}
          currentUser={props.currentUser}
          onSignAndSend={props.onSignAndSend}
          onBack={() => setLetterReport(null)}
        />
      )}
    </>
  );
}
