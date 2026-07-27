// ============================================================================
// ATLASBANX — Forfaits d'audit par durée + comptage des périodes auditées
// ============================================================================
// Le prix repose sur un FORFAIT PAR DURÉE : 3 mois, 6 mois ou 1 an de relevés.
// L'application compte le nombre de périodes (mois calendaires) réellement
// couvertes par les relevés importés, puis rattache ce nombre au forfait.
//
// ⚠️ Les montants ci-dessous sont des VALEURS PAR DÉFAUT à ajuster (tarification
//    commerciale). XOF/XAF = FCFA (zones UEMOA/CEMAC), EUR en secours.
// ============================================================================

export type AuditPlanId = '3m' | '6m' | '12m';

export interface AuditPlan {
  id: AuditPlanId;
  /** Nombre de mois de relevés couverts par le forfait. */
  months: number;
  label: string;
  /** Prix indicatifs — à remplacer par la grille commerciale réelle. */
  priceFcfa: number;
  priceEur: number;
}

/** Forfaits, triés par durée croissante. */
export const AUDIT_PLANS: readonly AuditPlan[] = [
  { id: '3m', months: 3, label: '3 mois de relevés', priceFcfa: 15000, priceEur: 25 },
  { id: '6m', months: 6, label: '6 mois de relevés', priceFcfa: 25000, priceEur: 40 },
  { id: '12m', months: 12, label: '1 an de relevés', priceFcfa: 40000, priceEur: 65 },
] as const;

export function getPlan(id: AuditPlanId): AuditPlan {
  const plan = AUDIT_PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Forfait inconnu: ${id}`);
  return plan;
}

// ----------------------------------------------------------------------------
// Comptage des périodes (mois calendaires) auditées
// ----------------------------------------------------------------------------

export interface DateRange {
  start: Date;
  end: Date;
}

/** Clé de mois `YYYY-MM` (UTC) pour dédoublonner les mois couverts. */
function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Compte le nombre de mois calendaires DISTINCTS couverts par un ensemble de
 * plages [start, end] (bornes incluses). Deux relevés qui se chevauchent ne
 * comptent pas double ; une plage à cheval sur 2 mois compte 2 mois.
 * Les plages invalides (end < start) sont ignorées.
 */
export function countAuditedMonths(ranges: readonly DateRange[]): number {
  const months = new Set<string>();
  for (const { start, end } of ranges) {
    if (!(start instanceof Date) || !(end instanceof Date)) continue;
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    if (end.getTime() < start.getTime()) continue;
    // Itère mois par mois du début à la fin (en UTC, ancré au 1er du mois).
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
    while (cursor.getTime() <= last.getTime()) {
      months.add(monthKey(cursor));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  }
  return months.size;
}

/**
 * Rattache un nombre de mois audités au plus petit forfait qui le COUVRE.
 * Renvoie null si aucun forfait ne suffit (au-delà de 12 mois → à traiter
 * hors forfait standard, ex. multiples ou offre sur mesure).
 */
export function planForMonths(auditedMonths: number): AuditPlan | null {
  if (auditedMonths <= 0) return null;
  const sorted = [...AUDIT_PLANS].sort((a, b) => a.months - b.months);
  return sorted.find((p) => auditedMonths <= p.months) ?? null;
}

/** Le forfait couvre-t-il le nombre de mois audités ? */
export function isPlanSufficient(plan: AuditPlan, auditedMonths: number): boolean {
  return auditedMonths <= plan.months;
}
