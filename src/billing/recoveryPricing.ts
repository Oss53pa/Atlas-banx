// ============================================================================
// ATLASBANX — Tarification indexée sur le montant récupérable (audit express)
// ============================================================================
// Principe de valeur : le client ne doit JAMAIS payer plus que ce qu'il peut
// récupérer. On lance l'audit AVANT paiement (aperçu gratuit), on montre le
// montant récupérable estimé, et le prix est une fraction de ce montant —
// borné par un plancher et un plafond, et NUL en dessous d'un seuil (sinon
// facturer un petit récupérable détruirait la promesse de valeur).
//
// Le gain net (récupérable − prix) est toujours affiché et toujours positif.
//
// ⚠️ Paramètres commerciaux — ajustables sans toucher au reste du code.
// ============================================================================

export const RECOVERY_PRICING = {
  /** Fraction du récupérable facturée (déblocage du rapport actionnable). */
  RATE: 0.2,
  /** Prix plancher quand on facture (FCFA). */
  MIN_PRICE: 1500,
  /** Prix plafond, quel que soit le récupérable (FCFA). */
  MAX_PRICE: 20000,
  /**
   * Seuil de récupérable en dessous duquel le rapport est GRATUIT : trop faible
   * pour qu'un paiement laisse un gain net intéressant. Protège la marque.
   */
  FREE_BELOW: 8000,
  /** Arrondi commercial du prix (FCFA). */
  ROUND_TO: 500,
} as const;

export interface RecoveryPricing {
  /** Montant récupérable estimé (FCFA, arrondi, ≥ 0). */
  recoverableFcfa: number;
  /** Prix à payer (FCFA) — 0 si gratuit. */
  priceFcfa: number;
  /** true quand le rapport est offert (récupérable < seuil). */
  isFree: boolean;
  /** Gain net pour le client (récupérable − prix), toujours ≥ 0. */
  netGainFcfa: number;
  /** Taux effectif appliqué (prix / récupérable) — 0 si gratuit. */
  effectiveRate: number;
}

/**
 * Calcule le prix du déblocage du rapport à partir du montant récupérable.
 * Garantit `priceFcfa < recoverableFcfa` (gain net strictement positif) dès
 * lors qu'on facture, grâce au seuil de gratuité.
 */
export function pricingForRecovery(recoverableFcfa: number): RecoveryPricing {
  const rec = Math.max(0, Math.round(recoverableFcfa || 0));

  if (rec < RECOVERY_PRICING.FREE_BELOW) {
    return {
      recoverableFcfa: rec,
      priceFcfa: 0,
      isFree: true,
      netGainFcfa: rec,
      effectiveRate: 0,
    };
  }

  const raw = rec * RECOVERY_PRICING.RATE;
  const rounded = Math.round(raw / RECOVERY_PRICING.ROUND_TO) * RECOVERY_PRICING.ROUND_TO;
  const price = Math.min(
    RECOVERY_PRICING.MAX_PRICE,
    Math.max(RECOVERY_PRICING.MIN_PRICE, rounded),
  );

  return {
    recoverableFcfa: rec,
    priceFcfa: price,
    isFree: false,
    netGainFcfa: rec - price,
    effectiveRate: price / rec,
  };
}
