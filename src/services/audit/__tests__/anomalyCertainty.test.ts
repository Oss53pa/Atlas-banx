import { describe, it, expect } from 'vitest';
import { partitionByCertainty, CERTAINTY_THRESHOLD } from '../anomalyCertainty';
import { AnomalyType, Severity, type Anomaly } from '../../../types';

function a(confidence: number, amount: number): Anomaly {
  return {
    id: Math.random().toString(36).slice(2), type: AnomalyType.OVERCHARGE, severity: Severity.MEDIUM,
    confidence, amount, transactions: [], evidence: [], recommendation: '',
    status: 'pending', detectedAt: new Date('2025-01-01'),
  } as Anomaly;
}

describe('partitionByCertainty', () => {
  it('ne compte que les anomalies ≥ 90% dans le montant à recouvrer', () => {
    const p = partitionByCertainty([a(0.95, 10000), a(0.9, 5000), a(0.6, 99000), a(0.2, 40000)]);
    expect(p.certain).toHaveLength(2);
    expect(p.uncertain).toHaveLength(2);
    expect(p.certainAmount).toBe(15000);
    expect(p.uncertainAmount).toBe(139000);
  });

  it('le seuil est bien 90%', () => {
    expect(CERTAINTY_THRESHOLD).toBe(0.9);
    const p = partitionByCertainty([a(0.8999, 1000)]);
    expect(p.certain).toHaveLength(0);
    expect(p.certainAmount).toBe(0);
  });

  it('confiance manquante → traitée comme incertaine (prudence)', () => {
    const p = partitionByCertainty([{ ...a(0, 3000), confidence: undefined } as unknown as Anomaly]);
    expect(p.certain).toHaveLength(0);
    expect(p.uncertainAmount).toBe(3000);
  });
});
