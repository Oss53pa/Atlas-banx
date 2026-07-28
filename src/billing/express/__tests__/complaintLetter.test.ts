import { describe, it, expect } from 'vitest';
import { buildParticulierComplaintLetter } from '../complaintLetter';
import { AnomalyType, Severity, type Anomaly } from '../../../types';

function anomaly(partial: Partial<Anomaly>): Anomaly {
  return {
    id: 'a1', type: AnomalyType.OVERCHARGE, severity: Severity.HIGH, confidence: 0.9,
    amount: 5000, transactions: [], evidence: [], recommendation: '',
    status: 'confirmed', detectedAt: new Date('2025-01-01'),
    ...partial,
  } as Anomaly;
}

describe('buildParticulierComplaintLetter', () => {
  const base = {
    clientFullName: 'Awa KONE',
    accountRef: 'CI123',
    bankCode: 'NSIACICI',
    bankLegalName: 'NSIA Banque Côte d\'Ivoire',
    period: { start: new Date('2025-01-02'), end: new Date('2025-12-31') },
    emittedOn: new Date('2026-02-01'),
  };

  it('inclut le nom, la banque, le total et les anomalies chiffrées', () => {
    const r = buildParticulierComplaintLetter({
      ...base,
      anomalies: [anomaly({ id: 'a1', amount: 5000 }), anomaly({ id: 'a2', amount: 3000 })],
      totalRecoverableFcfa: 8000,
    });
    // fr-FR insère une espace insécable comme séparateur de milliers → normaliser.
    const norm = r.text.replace(/[  ]/g, ' ');
    expect(r.itemCount).toBe(2);
    expect(r.totalFcfa).toBe(8000);
    expect(norm).toContain('Awa KONE');
    expect(norm).toContain('NSIA Banque');
    expect(norm).toContain('8 000 FCFA');
    expect(norm).toContain('Compte n° CI123');
  });

  it('ignore les anomalies à montant nul', () => {
    const r = buildParticulierComplaintLetter({
      ...base,
      anomalies: [anomaly({ id: 'a1', amount: 4000 }), anomaly({ id: 'a2', amount: 0 })],
      totalRecoverableFcfa: 4000,
    });
    expect(r.itemCount).toBe(1);
  });

  it('utilise des placeholders quand le nom/compte manquent', () => {
    const r = buildParticulierComplaintLetter({
      ...base, clientFullName: '', accountRef: '',
      anomalies: [anomaly({ amount: 2000 })], totalRecoverableFcfa: 2000,
    });
    expect(r.text).toContain('[Votre nom et prénom]');
    expect(r.text).toContain('[Votre numéro de compte]');
  });
});
