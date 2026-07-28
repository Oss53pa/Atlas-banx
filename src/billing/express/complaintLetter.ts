// ============================================================================
// ATLASBANX — Lettre de réclamation PARTICULIER (audit express)
// ============================================================================
// La lettre « cabinet » existante (features/statement-detail) est bâtie autour
// d'une convention signée + d'un signataire cabinet — inadaptée à un
// particulier. On réutilise ici ce qui EST commun (annuaire d'adresses des
// banques, libellés d'anomalies, résultat du MÊME moteur de détection) et on
// produit un courrier formel adapté à un particulier, prêt à imprimer/envoyer.
// ============================================================================

import { ANOMALY_TYPE_LABELS, type Anomaly } from '../../types';
import { resolveBankAddress } from '../../features/statement-detail/data/bankDirectory';

export interface ParticulierLetterInput {
  clientFullName: string;
  accountRef?: string;
  bankCode: string;
  bankLegalName: string;
  period: { start: Date | null; end: Date | null };
  anomalies: Anomaly[];
  /** Montant total récupérable estimé (FCFA). */
  totalRecoverableFcfa: number;
  emittedOn?: Date;
}

function fmtFcfa(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n));
}

function fmtFrenchDate(d: Date): string {
  const months = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Assemble le texte de la lettre de réclamation d'un particulier à partir des
 * anomalies détectées par le moteur d'audit (mêmes anomalies que l'affichage).
 * Ne retient que les anomalies à montant > 0 (frais indus chiffrables).
 */
export function buildParticulierComplaintLetter(
  input: ParticulierLetterInput,
): { text: string; totalFcfa: number; itemCount: number } {
  const items = input.anomalies
    .filter((a) => (a.amount ?? 0) > 0)
    .map((a) => ({
      label: ANOMALY_TYPE_LABELS[a.type] ?? a.type,
      amount: a.amount,
      detail: a.description ?? a.recommendation ?? '',
    }));

  const total = input.totalRecoverableFcfa || items.reduce((s, it) => s + it.amount, 0);
  const emittedOn = input.emittedOn ?? new Date();
  const bankAddr = resolveBankAddress(input.bankCode);
  const bankName = input.bankLegalName || bankAddr.legalName || input.bankCode;
  const name = input.clientFullName.trim() || '[Votre nom et prénom]';
  const account = input.accountRef?.trim() || '[Votre numéro de compte]';

  const lines: string[] = [];
  lines.push(name);
  lines.push(account !== '[Votre numéro de compte]' ? `Compte n° ${account}` : account);
  lines.push('');
  lines.push(`Le ${fmtFrenchDate(emittedOn)}`);
  lines.push('');
  lines.push(`À l'attention du Service Clientèle`);
  lines.push(bankName);
  for (const l of bankAddr.addressLines) lines.push(l);
  lines.push('');
  lines.push(`Objet : Réclamation de frais bancaires indûment prélevés — compte n° ${account}`);
  lines.push('');
  lines.push('Madame, Monsieur,');
  lines.push('');

  const periodTxt =
    input.period.start && input.period.end
      ? `du ${fmtFrenchDate(input.period.start)} au ${fmtFrenchDate(input.period.end)}`
      : 'récente';
  lines.push(
    `Après examen des mouvements de mon compte sur la période ${periodTxt}, j'ai constaté ` +
    `des frais qui ne correspondent pas aux conditions tarifaires applicables et aux règles ` +
    `de transparence bancaire en vigueur dans la zone (BCEAO/COBAC, Acte uniforme OHADA). ` +
    `Je conteste les prélèvements suivants :`,
  );
  lines.push('');

  items.forEach((it, i) => {
    lines.push(`${i + 1}. ${it.label} — ${fmtFcfa(it.amount)} FCFA`);
    if (it.detail) lines.push(`   ${it.detail}`);
  });
  lines.push('');

  lines.push(
    `Le montant total des frais que je vous demande de me restituer s'élève à ` +
    `${fmtFcfa(total)} FCFA. Je vous saurais gré de bien vouloir procéder à leur remboursement ` +
    `sous un délai de 30 jours, et de me confirmer la régularisation par écrit.`,
  );
  lines.push('');
  lines.push(
    `À défaut de réponse satisfaisante dans ce délai, je me réserve le droit de saisir le ` +
    `médiateur bancaire ainsi que l'autorité de supervision compétente.`,
  );
  lines.push('');
  lines.push('Dans l\'attente de votre retour, je vous prie d\'agréer, Madame, Monsieur, l\'expression de mes salutations distinguées.');
  lines.push('');
  lines.push(name);
  lines.push('(signature)');

  return { text: lines.join('\n'), totalFcfa: total, itemCount: items.length };
}

/**
 * Enveloppe la lettre dans une page HTML A4 imprimable (mêmes principes que le
 * rapport : @page A4, couleurs conservées, bouton d'impression écran).
 */
export function complaintLetterToHtml(text: string): string {
  const esc = (s: string) =>
    s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] ?? c));
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lettre de réclamation — AtlasBanx</title>
<style>
  @page { size: A4 portrait; margin: 20mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { background: #eceef3; font-family: "Times New Roman", Georgia, serif; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sheet { width: 180mm; min-height: 267mm; margin: 8mm auto; padding: 22mm 24mm; background: #fff; box-shadow: 0 2px 18px rgba(0,0,0,.12); }
  pre { white-space: pre-wrap; font-family: inherit; font-size: 12.5px; line-height: 1.7; margin: 0; }
  .toolbar { position: fixed; top: 12px; right: 12px; }
  .toolbar button { font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; background: #1a1a2e; color: #fff; border: 0; border-radius: 8px; padding: 8px 14px; box-shadow: 0 2px 10px rgba(0,0,0,.18); }
  @media print { body { background: #fff; } .sheet { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; } .toolbar { display: none !important; } }
</style></head><body>
<div class="toolbar"><button onclick="window.print()">Imprimer / Enregistrer en PDF</button></div>
<div class="sheet"><pre>${esc(text)}</pre></div>
</body></html>`;
}
