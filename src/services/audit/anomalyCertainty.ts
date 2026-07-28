// ============================================================================
// ATLASBANX — Séparation anomalies CERTAINES vs À CONFIRMER
// ============================================================================
// Une somme n'est « à recouvrer » que si l'anomalie qui la porte est PROUVÉE.
// On dissocie donc les anomalies CERTAINES (confiance ≥ 90 %) des anomalies
// À CONFIRMER (< 90 %), et le montant à recouvrer ne compte QUE les certaines.
// Les anomalies à confirmer sont présentées à part (à investiguer), sans être
// chiffrées dans le total réclamable — pour ne jamais surestimer la promesse.
// ============================================================================

import { AnomalyType, type Anomaly } from '../../types';

/** Seuil de certitude : au-delà, l'anomalie est considérée prouvée. */
export const CERTAINTY_THRESHOLD = 0.9;

/**
 * Types d'anomalies dont le `amount` représente une somme RÉELLEMENT
 * RÉCUPÉRABLE (des frais indus que le client peut réclamer). Les autres types
 * (AML, trésorerie, rapprochement, conformité, opérations suspectes) portent
 * dans `amount` un VOLUME (dépôts, profondeur de découvert, flux) qui n'est PAS
 * réclamable : les compter gonflerait le total à recouvrer et ferait payer le
 * client sur de l'argent qu'il ne peut pas récupérer.
 */
export const RECOVERABLE_ANOMALY_TYPES: ReadonlySet<AnomalyType> = new Set([
  AnomalyType.OVERCHARGE,
  AnomalyType.DUPLICATE_FEE,
  AnomalyType.GHOST_FEE,
  AnomalyType.INTEREST_ERROR,
  AnomalyType.UNAUTHORIZED,
  AnomalyType.ROUNDING_ABUSE,
  AnomalyType.VALUE_DATE_ERROR,
  AnomalyType.FEE_ANOMALY,
  AnomalyType.LIMIT_EXCEEDED,
]);

/** true si le montant de l'anomalie est une somme réclamable (frais indus). */
export function isRecoverableAnomaly(a: Anomaly): boolean {
  return RECOVERABLE_ANOMALY_TYPES.has(a.type);
}

export interface CertaintyPartition {
  certain: Anomaly[];
  uncertain: Anomaly[];
  /** Montant à recouvrer = somme des anomalies CERTAINES uniquement (FCFA). */
  certainAmount: number;
  /** Montant des anomalies à confirmer (non compté dans le réclamable). */
  uncertainAmount: number;
}

/** Confiance normalisée d'une anomalie (0–1). Défaut prudent : 0. */
function conf(a: Anomaly): number {
  const c = (a as { confidence?: number }).confidence;
  return typeof c === 'number' && Number.isFinite(c) ? c : 0;
}

/**
 * Partitionne les anomalies en certaines (≥ seuil) et à confirmer (< seuil),
 * et calcule les montants respectifs.
 */
export function partitionByCertainty(
  anomalies: Anomaly[],
  threshold: number = CERTAINTY_THRESHOLD,
): CertaintyPartition {
  const certain: Anomaly[] = [];
  const uncertain: Anomaly[] = [];
  for (const a of anomalies) (conf(a) >= threshold ? certain : uncertain).push(a);
  // Les montants « à recouvrer » / « à confirmer » ne comptent QUE les
  // anomalies dont le montant est réclamable (frais indus). Une alerte AML ou
  // un creux de trésorerie reste listée dans certain/uncertain mais n'entre
  // dans AUCUN total chiffré (son `amount` est un volume, pas une créance).
  const sumRecoverable = (xs: Anomaly[]) =>
    xs.reduce((s, a) => s + (isRecoverableAnomaly(a) ? (a.amount || 0) : 0), 0);
  return {
    certain,
    uncertain,
    certainAmount: sumRecoverable(certain),
    uncertainAmount: sumRecoverable(uncertain),
  };
}
