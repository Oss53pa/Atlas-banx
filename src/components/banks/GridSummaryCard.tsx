// ============================================================================
// ATLASBANX — GridSummaryCard
// ============================================================================
// Affiche un résumé humanisé d'une ConditionGrid en lisant les sections
// nominales (tenueCompte, fraisCartes, virements, …) plutôt que les arrays
// legacy `fees[]` / `interestRates[]` (qui sont vides dans notre modèle).
// Une section n'est rendue que si elle a au moins une valeur non nulle.
//
// Utilisé par BankGridsPanel pour le viewer principal de la page Banques.
// ============================================================================

import {
  Calendar, Clock, FileText, Pencil, Receipt, CreditCard,
  ArrowLeftRight, Percent, Smartphone, Wallet,
  Banknote,
} from 'lucide-react';
import { Card, CardBody, Button, Badge } from '../ui';
import type { ConditionGrid, BankConditions } from '../../types';
import { formatCurrency } from '../../utils';

interface GridSummaryCardProps {
  grid: ConditionGrid;
  currency: 'XAF' | 'XOF';
  onEdit?: () => void;
  onViewSource?: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers de formatage
// ────────────────────────────────────────────────────────────────────────────

function fmtMoney(value: number, currency: 'XAF' | 'XOF'): string {
  return formatCurrency(value, currency);
}

function fmtPercent(value: number): string {
  // Les taux sont stockés sous forme décimale (0.18) OU en pourcent (18).
  // Heuristique : > 1 → déjà en pourcent ; ≤ 1 → décimal à multiplier.
  const pct = value > 1 ? value : value * 100;
  return `${pct.toFixed(2).replace(/\.?0+$/, '')} %`;
}

function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Extraction des paires (label, valeur) non nulles d'une section
// ────────────────────────────────────────────────────────────────────────────

interface FieldDescriptor {
  key: string;
  label: string;
  format: 'money' | 'percent' | 'boolean';
}

interface SectionDescriptor {
  id: string;
  title: string;
  icon: React.ReactNode;
  // Permet 1 ou 2 niveaux de nesting (ex. tenueCompte.particulierLocal).
  path: string;
  fields: FieldDescriptor[];
}

const SECTIONS: SectionDescriptor[] = [
  {
    id: 'tenueCompte',
    title: 'Tenue de compte',
    icon: <Banknote className="w-3.5 h-3.5" />,
    path: 'tenueCompte',
    fields: [
      { key: 'particulierLocal',    label: 'Particulier (local)',  format: 'money' },
      { key: 'particulierEtranger', label: 'Particulier (étranger)', format: 'money' },
      { key: 'professionnel',       label: 'Professionnel',         format: 'money' },
      { key: 'entreprise',          label: 'Entreprise',            format: 'money' },
      { key: 'association',         label: 'Association',           format: 'money' },
      { key: 'compteEpargne',       label: 'Compte épargne',        format: 'money' },
      { key: 'compteDevises',       label: 'Compte devises',        format: 'money' },
    ],
  },
  {
    id: 'releves',
    title: 'Relevés & attestations',
    icon: <Receipt className="w-3.5 h-3.5" />,
    path: 'releves',
    fields: [
      { key: 'mensuelPapier',          label: 'Relevé mensuel papier', format: 'money' },
      { key: 'mensuelEmail',           label: 'Relevé mensuel email',  format: 'money' },
      { key: 'duplicata',              label: 'Duplicata',             format: 'money' },
      { key: 'releveAnnuel',           label: 'Relevé annuel',         format: 'money' },
      { key: 'attestationSolde',       label: 'Attestation de solde',  format: 'money' },
      { key: 'certificatNonEngagement',label: 'Cert. non-engagement',  format: 'money' },
      { key: 'rib',                    label: 'RIB',                   format: 'money' },
    ],
  },
  {
    id: 'fraisCartes',
    title: 'Frais cartes',
    icon: <CreditCard className="w-3.5 h-3.5" />,
    path: 'fraisCartes',
    fields: [
      { key: 'retraitDabPropre',         label: 'Retrait DAB (propre)',  format: 'money' },
      { key: 'retraitDabAutre',          label: 'Retrait DAB (autre banque)', format: 'money' },
      { key: 'retraitDabInternational',  label: 'Retrait DAB international', format: 'money' },
      { key: 'paiementTpePropre',        label: 'Paiement TPE (propre)', format: 'money' },
      { key: 'paiementTpeAutre',         label: 'Paiement TPE (autre)',  format: 'money' },
      { key: 'paiementTpeInternational', label: 'Paiement TPE int.',     format: 'money' },
      { key: 'paiementInternet',         label: 'Paiement internet',     format: 'money' },
      { key: 'oppositionCarte',          label: 'Opposition carte',      format: 'money' },
      { key: 'renouvellementAnticipe',   label: 'Renouvellement anticipé', format: 'money' },
      { key: 'codeOublie',               label: 'Code oublié',           format: 'money' },
      { key: 'carteCaptee',              label: 'Carte captée',          format: 'money' },
      { key: 'consultationSolde',        label: 'Consultation solde',    format: 'money' },
    ],
  },
  {
    id: 'virements',
    title: 'Virements',
    icon: <ArrowLeftRight className="w-3.5 h-3.5" />,
    path: 'virements',
    fields: [
      { key: 'interneFrais',                   label: 'Interne',               format: 'money' },
      { key: 'nationalMemeBank',               label: 'National (même banque)', format: 'money' },
      { key: 'nationalAutreBank',              label: 'National (autre banque)', format: 'money' },
      { key: 'nationalAutreBankCommission',    label: 'Commission autre banque', format: 'percent' },
      { key: 'zoneMonetaire',                  label: 'Zone monétaire',         format: 'money' },
      { key: 'zoneMonetaireCommission',        label: 'Commission zone mon.',   format: 'percent' },
      { key: 'international',                  label: 'International',          format: 'money' },
      { key: 'internationalCommission',        label: 'Commission international', format: 'percent' },
      { key: 'swift',                          label: 'Frais SWIFT',            format: 'money' },
      { key: 'instantane',                     label: 'Instantané',             format: 'money' },
      { key: 'permanent',                      label: 'Permanent',              format: 'money' },
      { key: 'rejetVirement',                  label: 'Rejet de virement',      format: 'money' },
    ],
  },
  {
    id: 'cheques',
    title: 'Chèques',
    icon: <FileText className="w-3.5 h-3.5" />,
    path: 'cheques',
    fields: [
      { key: 'carnet25',                       label: 'Chéquier 25 formules',  format: 'money' },
      { key: 'carnet50',                       label: 'Chéquier 50 formules',  format: 'money' },
      { key: 'carnet100',                      label: 'Chéquier 100 formules', format: 'money' },
      { key: 'chequeGuichet',                  label: 'Chèque au guichet',     format: 'money' },
      { key: 'chequeCertifie',                 label: 'Chèque certifié',       format: 'money' },
      { key: 'chequeBanque',                   label: 'Chèque de banque',      format: 'money' },
      { key: 'oppositionCheque',               label: 'Opposition',            format: 'money' },
      { key: 'chequeImpaye',                   label: 'Chèque impayé',         format: 'money' },
      { key: 'chequeRetourne',                 label: 'Chèque retourné',       format: 'money' },
      { key: 'encaissementPlace',              label: 'Encaissement sur place', format: 'money' },
      { key: 'encaissementDeplacement',        label: 'Encaissement déplacement', format: 'money' },
      { key: 'encaissementEtranger',           label: 'Encaissement étranger',  format: 'money' },
      { key: 'encaissementEtrangerCommission', label: 'Commission étranger',    format: 'percent' },
    ],
  },
  {
    id: 'credits',
    title: 'Crédits & agios',
    icon: <Percent className="w-3.5 h-3.5" />,
    path: 'credits',
    fields: [
      { key: 'decouvertAutorise',     label: 'Taux découvert autorisé',     format: 'percent' },
      { key: 'decouvertNonAutorise',  label: 'Taux découvert non autorisé', format: 'percent' },
      { key: 'commissionMouvement',   label: 'Commission de mouvement',     format: 'percent' },
      { key: 'commissionPlusForte',   label: 'Commission plus forte découverte', format: 'percent' },
      { key: 'tauxUsure',             label: 'Taux d\'usure légal',         format: 'percent' },
      { key: 'fraisDossierCredit',    label: 'Frais de dossier crédit',     format: 'money' },
      { key: 'creditConsommationMin', label: 'Crédit conso (min)',          format: 'percent' },
      { key: 'creditConsommationMax', label: 'Crédit conso (max)',          format: 'percent' },
      { key: 'creditImmobilierMin',   label: 'Crédit immo (min)',           format: 'percent' },
      { key: 'creditImmobilierMax',   label: 'Crédit immo (max)',           format: 'percent' },
      { key: 'creditPME',             label: 'Crédit PME',                   format: 'percent' },
      { key: 'penaliteRetard',        label: 'Pénalité de retard',           format: 'money' },
    ],
  },
  {
    id: 'ebanking',
    title: 'E-banking',
    icon: <Smartphone className="w-3.5 h-3.5" />,
    path: 'ebanking',
    fields: [
      { key: 'abonnementMensuel',    label: 'Abonnement mensuel',    format: 'money' },
      { key: 'abonnementAnnuel',     label: 'Abonnement annuel',     format: 'money' },
      { key: 'parOperation',         label: 'Par opération',         format: 'money' },
      { key: 'virementEnLigne',      label: 'Virement en ligne',     format: 'money' },
      { key: 'smsAlerte',            label: 'SMS alerte (unité)',    format: 'money' },
      { key: 'smsAlerteAbonnement',  label: 'SMS alerte (abo.)',     format: 'money' },
      { key: 'mobileBanking',        label: 'Mobile banking',        format: 'money' },
      { key: 'ussd',                 label: 'USSD',                  format: 'money' },
    ],
  },
  {
    id: 'divers',
    title: 'Divers',
    icon: <Wallet className="w-3.5 h-3.5" />,
    path: 'divers',
    fields: [
      { key: 'coffrePetit',         label: 'Coffre petit',         format: 'money' },
      { key: 'coffreMoyen',         label: 'Coffre moyen',         format: 'money' },
      { key: 'coffreGrand',         label: 'Coffre grand',         format: 'money' },
      { key: 'assuranceCompte',     label: 'Assurance compte',     format: 'money' },
      { key: 'garantieBancaire',    label: 'Garantie bancaire',    format: 'money' },
      { key: 'garantieLocative',    label: 'Garantie locative',    format: 'money' },
      { key: 'cautionMarche',       label: 'Caution de marché',    format: 'money' },
      { key: 'lettreInjonction',    label: 'Lettre d\'injonction', format: 'money' },
      { key: 'saisieAttribution',   label: 'Saisie attribution',   format: 'money' },
      { key: 'mainLevee',           label: 'Main levée',           format: 'money' },
      { key: 'procuration',         label: 'Procuration',          format: 'money' },
      { key: 'successionFrais',     label: 'Succession (frais)',   format: 'money' },
      { key: 'successionCommission',label: 'Succession (commission)', format: 'percent' },
      { key: 'avoirInactif',        label: 'Avoir inactif',        format: 'money' },
      { key: 'fraisInactivite',     label: 'Frais d\'inactivité',  format: 'money' },
      { key: 'droitTimbre',         label: 'Droit de timbre',      format: 'money' },
      { key: 'tvaServices',         label: 'TVA services',         format: 'percent' },
    ],
  },
];

function extractSectionRows(
  conditions: BankConditions,
  section: SectionDescriptor,
  currency: 'XAF' | 'XOF',
): Array<{ label: string; display: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sectionData = (conditions as any)[section.path];
  if (!sectionData || typeof sectionData !== 'object') return [];

  const rows: Array<{ label: string; display: string }> = [];
  for (const field of section.fields) {
    const raw = sectionData[field.key];
    if (typeof raw !== 'number' || raw === 0 || !Number.isFinite(raw)) continue;
    const display = field.format === 'percent' ? fmtPercent(raw) : fmtMoney(raw, currency);
    rows.push({ label: field.label, display });
  }
  return rows;
}

// ────────────────────────────────────────────────────────────────────────────
// Cartes par réseau — sont stockées dans conditions.cartes[] (array)
// ────────────────────────────────────────────────────────────────────────────

interface CardEntry {
  id?: string;
  nom?: string;
  reseau?: string;
  cotisationAnnuelle?: number;
}

function extractCardCotisations(
  conditions: BankConditions,
  currency: 'XAF' | 'XOF',
): Array<{ label: string; display: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cartes = (conditions as any).cartes as CardEntry[] | undefined;
  if (!Array.isArray(cartes)) return [];
  return cartes
    .filter((c) => typeof c.cotisationAnnuelle === 'number' && c.cotisationAnnuelle > 0)
    .map((c) => ({
      label: `${c.nom ?? 'Carte'}${c.reseau ? ` (${c.reseau})` : ''}`,
      display: fmtMoney(c.cotisationAnnuelle!, currency),
    }));
}

// ────────────────────────────────────────────────────────────────────────────
// Composant principal
// ────────────────────────────────────────────────────────────────────────────

export function GridSummaryCard({ grid, currency, onEdit, onViewSource }: GridSummaryCardProps) {
  const sectionRows = SECTIONS
    .map((s) => ({ section: s, rows: extractSectionRows(grid.conditions, s, currency) }))
    .filter((sr) => sr.rows.length > 0);

  const cardCotisations = extractCardCotisations(grid.conditions, currency);

  const totalRows = sectionRows.reduce((n, sr) => n + sr.rows.length, 0) + cardCotisations.length;

  return (
    <Card>
      <CardBody className="p-3">
        {/* Header — période + source */}
        <div className="flex items-start justify-between gap-2 mb-3 pb-3 border-b border-primary-100">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-primary-900 truncate">{grid.name}</h3>
              <Badge
                variant={grid.status === 'active' ? 'success' : 'secondary'}
                className="text-[10px] py-0 shrink-0"
              >
                {grid.status === 'active' ? 'Active' : grid.status === 'archived' ? 'Archivée' : 'Brouillon'}
              </Badge>
              <span className="text-[10px] text-primary-400 shrink-0">v{grid.version}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-primary-500">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Du {fmtDate(grid.effectiveDate)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {grid.expirationDate ? `Au ${fmtDate(grid.expirationDate)}` : 'Indéterminée'}
              </span>
              {grid.sourceDocument && (
                <button
                  type="button"
                  onClick={onViewSource}
                  className="inline-flex items-center gap-1 hover:text-primary-700 hover:underline truncate max-w-[280px]"
                  title={grid.sourceDocument.name}
                >
                  <FileText className="w-3 h-3 shrink-0" />
                  <span className="truncate">{grid.sourceDocument.name}</span>
                </button>
              )}
            </div>
          </div>
          {onEdit && (
            <Button size="sm" variant="secondary" className="h-7 text-xs shrink-0" onClick={onEdit}>
              <Pencil className="w-3 h-3 mr-1" />
              Éditer
            </Button>
          )}
        </div>

        {/* Body — sections non vides */}
        {totalRows === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs text-primary-500 mb-2">
              Aucune valeur renseignée dans cette grille.
            </p>
            {onEdit && (
              <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={onEdit}>
                <Pencil className="w-3 h-3 mr-1" />
                Configurer
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 max-h-[calc(100vh-380px)] overflow-y-auto pr-1">
            {/* Cartes — section spéciale (depuis l'array conditions.cartes[]) */}
            {cardCotisations.length > 0 && (
              <SectionBlock
                icon={<CreditCard className="w-3.5 h-3.5" />}
                title="Cotisations cartes"
                rows={cardCotisations}
              />
            )}

            {sectionRows.map(({ section, rows }) => (
              <SectionBlock
                key={section.id}
                icon={section.icon}
                title={section.title}
                rows={rows}
              />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Bloc d'une section — titre + liste compacte des valeurs non nulles
// ────────────────────────────────────────────────────────────────────────────

interface SectionBlockProps {
  icon: React.ReactNode;
  title: string;
  rows: Array<{ label: string; display: string }>;
}

function SectionBlock({ icon, title, rows }: SectionBlockProps) {
  return (
    <div className="border border-primary-100 rounded-md bg-white">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary-50 border-b border-primary-100 rounded-t-md">
        <span className="text-primary-600">{icon}</span>
        <h4 className="text-[11px] font-semibold text-primary-900 uppercase tracking-wide">
          {title}
        </h4>
        <span className="ml-auto text-[10px] text-primary-400">{rows.length}</span>
      </div>
      <ul className="divide-y divide-primary-50">
        {rows.map((r, idx) => (
          <li key={idx} className="flex items-center justify-between px-2.5 py-1 text-xs">
            <span className="text-primary-700 truncate pr-2">{r.label}</span>
            <span className="font-medium text-primary-900 tabular-nums shrink-0">{r.display}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
