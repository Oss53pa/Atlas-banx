import { describe, it, expect } from 'vitest';
import {
  AUDIT_PLANS,
  getPlan,
  countAuditedMonths,
  planForMonths,
  isPlanSufficient,
} from '../auditPlans';

const r = (start: string, end: string) => ({ start: new Date(start), end: new Date(end) });

describe('AUDIT_PLANS', () => {
  it('expose 3 forfaits 3/6/12 mois triés', () => {
    expect(AUDIT_PLANS.map((p) => p.months)).toEqual([3, 6, 12]);
  });
  it('getPlan renvoie le bon forfait / lève sur inconnu', () => {
    expect(getPlan('6m').months).toBe(6);
    // @ts-expect-error test d'un id invalide
    expect(() => getPlan('9m')).toThrow();
  });
});

describe('countAuditedMonths', () => {
  it('compte les mois calendaires distincts', () => {
    expect(countAuditedMonths([r('2025-01-05', '2025-03-20')])).toBe(3); // jan,fev,mar
  });
  it('ne compte pas deux fois les mois chevauchants', () => {
    expect(countAuditedMonths([r('2025-01-01', '2025-02-28'), r('2025-02-10', '2025-03-05')])).toBe(3);
  });
  it('une plage à cheval sur 2 mois compte 2', () => {
    expect(countAuditedMonths([r('2025-01-28', '2025-02-02')])).toBe(2);
  });
  it('ignore les plages invalides', () => {
    expect(countAuditedMonths([r('2025-05-01', '2025-01-01')])).toBe(0);
    expect(countAuditedMonths([])).toBe(0);
  });
  it('12 mois pleins → 12', () => {
    expect(countAuditedMonths([r('2024-01-15', '2024-12-15')])).toBe(12);
  });
});

describe('planForMonths', () => {
  it('rattache au plus petit forfait couvrant', () => {
    expect(planForMonths(1)?.id).toBe('3m');
    expect(planForMonths(3)?.id).toBe('3m');
    expect(planForMonths(4)?.id).toBe('6m');
    expect(planForMonths(6)?.id).toBe('6m');
    expect(planForMonths(7)?.id).toBe('12m');
    expect(planForMonths(12)?.id).toBe('12m');
  });
  it('renvoie null hors bornes', () => {
    expect(planForMonths(0)).toBeNull();
    expect(planForMonths(13)).toBeNull();
  });
});

describe('isPlanSufficient', () => {
  it('vérifie la couverture', () => {
    expect(isPlanSufficient(getPlan('6m'), 6)).toBe(true);
    expect(isPlanSufficient(getPlan('6m'), 7)).toBe(false);
  });
});
