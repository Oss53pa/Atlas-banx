// ============================================================================
// ATLASBANX — Séparation anomalies CERTAINES vs À CONFIRMER
// ============================================================================
// Une somme n'est « à recouvrer » que si l'anomalie qui la porte est PROUVÉE.
// On dissocie donc les anomalies CERTAINES (confiance ≥ 90 %) des anomalies
// À CONFIRMER (< 90 %), et le montant à recouvrer ne compte QUE les certaines.
// Les anomalies à confirmer sont présentées à part (à investiguer), sans être
// chiffrées dans le total réclamable — pour ne jamais surestimer la promesse.
// ============================================================================

import type { Anomaly } from '../../types';

/** Seuil de certitude : au-delà, l'anomalie est considérée prouvée. */
export const CERTAINTY_THRESHOLD = 0.9;

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
  const sum = (xs: Anomaly[]) => xs.reduce((s, a) => s + (a.amount || 0), 0);
  return {
    certain,
    uncertain,
    certainAmount: sum(certain),
    uncertainAmount: sum(uncertain),
  };
}
