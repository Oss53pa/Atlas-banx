import { describe, it, expect } from 'vitest';
import { buildExpressReport, reportToHtml, type ExpressTxn } from '../expressReport';

const txns: ExpressTxn[] = [
  { date: new Date('2025-01-10'), description: 'Virement reçu salaire', amount: 500000 },
  { date: new Date('2025-01-15'), description: 'Frais de tenue de compte', amount: -2000 },
  { date: new Date('2025-02-05'), description: 'Retrait GAB', amount: -50000 },
  { date: new Date('2025-03-20'), description: 'Commission virement', amount: -1500 },
];

describe('buildExpressReport', () => {
  const r = buildExpressReport(txns);

  it('dérive la période et le nombre de mois', () => {
    expect(r.periodStart?.toISOString().slice(0, 10)).toBe('2025-01-10');
    expect(r.periodEnd?.toISOString().slice(0, 10)).toBe('2025-03-20');
    expect(r.monthsAudited).toBe(3);
    expect(r.plan?.id).toBe('3m');
  });

  it('totalise débits/crédits', () => {
    expect(r.totalCredit).toBe(500000);
    expect(r.totalDebit).toBe(53500);
  });

  it('repère les frais (tenue + commission, pas le retrait GAB)', () => {
    expect(r.feesTotal).toBe(3500);
    expect(r.feeLines).toHaveLength(2);
  });

  it('gère une entrée vide', () => {
    const empty = buildExpressReport([]);
    expect(empty.periodStart).toBeNull();
    expect(empty.monthsAudited).toBe(0);
    expect(empty.plan).toBeNull();
  });

  it('produit un HTML autonome', () => {
    const html = reportToHtml(r);
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('Rapport');
    expect(html).toContain('Frais de tenue de compte');
  });
});
