import { describe, it, expect } from 'vitest';
import { pricingForRecovery, RECOVERY_PRICING } from '../recoveryPricing';

describe('pricingForRecovery', () => {
  it('offre le rapport quand le récupérable est nul ou faible', () => {
    for (const rec of [0, 1000, RECOVERY_PRICING.FREE_BELOW - 1]) {
      const p = pricingForRecovery(rec);
      expect(p.isFree).toBe(true);
      expect(p.priceFcfa).toBe(0);
      expect(p.netGainFcfa).toBe(Math.round(rec));
    }
  });

  it('facture au seuil et garantit un gain net strictement positif', () => {
    const p = pricingForRecovery(RECOVERY_PRICING.FREE_BELOW);
    expect(p.isFree).toBe(false);
    expect(p.priceFcfa).toBeGreaterThan(0);
    expect(p.priceFcfa).toBeLessThan(p.recoverableFcfa);
    expect(p.netGainFcfa).toBeGreaterThan(0);
  });

  it('le prix ne dépasse JAMAIS le récupérable (gain net toujours > 0)', () => {
    for (let rec = RECOVERY_PRICING.FREE_BELOW; rec <= 5_000_000; rec += 3137) {
      const p = pricingForRecovery(rec);
      expect(p.priceFcfa).toBeLessThan(p.recoverableFcfa);
      expect(p.netGainFcfa).toBeGreaterThan(0);
      expect(p.priceFcfa).toBeGreaterThanOrEqual(RECOVERY_PRICING.MIN_PRICE);
    }
  });

  it('applique 20% SANS plafond, même sur les très gros montants', () => {
    expect(pricingForRecovery(50_000).priceFcfa).toBe(10_000);
    expect(pricingForRecovery(300_000).priceFcfa).toBe(60_000);
    expect(pricingForRecovery(1_000_000).priceFcfa).toBe(200_000);
    const big = pricingForRecovery(10_000_000);
    expect(big.priceFcfa).toBe(2_000_000);
    expect(big.effectiveRate).toBeCloseTo(0.2, 5);
  });
});
