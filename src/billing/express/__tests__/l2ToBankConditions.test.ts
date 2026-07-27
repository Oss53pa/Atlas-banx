import { describe, it, expect } from 'vitest';
import { l2ToBankConditions } from '../l2ToBankConditions';
import type { PublicRefCondition } from '../../../services/publicBankReference';

const conds: PublicRefCondition[] = [
  { rubric_code: 'compte.tenue_mensuelle', value_numeric: 2000, dimensions: null },
  { rubric_code: 'decouverts.taux_autorise', value_numeric: 15, dimensions: null },
  { rubric_code: 'decouverts.taux_non_autorise', value_numeric: 24, dimensions: null },
  { rubric_code: 'decouverts.commission_mouvement', value_numeric: 0.25, dimensions: null },
  { rubric_code: 'cartes.paiement_etranger', value_numeric: 2.5, dimensions: null },
  { rubric_code: 'compte.attestation_solde', value_numeric: null, dimensions: null }, // ignoré
];

describe('l2ToBankConditions', () => {
  const bc = l2ToBankConditions({ bankCode: 'NSIA-CI', bankName: 'NSIA', conditions: conds });

  it('mappe les taux de découvert en InterestRate (décimal)', () => {
    const authorized = bc.interestRates.find((r) => r.type === 'authorized');
    const unauthorized = bc.interestRates.find((r) => r.type === 'unauthorized');
    expect(authorized?.rate).toBeCloseTo(0.15);
    expect(unauthorized?.rate).toBeCloseTo(0.24);
  });

  it('mappe une rubrique fixe (FCFA) en fee fixed', () => {
    const tenue = bc.fees.find((f) => f.code === 'compte.tenue_mensuelle');
    expect(tenue?.type).toBe('fixed');
    expect(tenue?.amount).toBe(2000);
  });

  it('mappe une rubrique en pourcentage en fee percentage', () => {
    const comm = bc.fees.find((f) => f.code === 'decouverts.commission_mouvement');
    expect(comm?.type).toBe('percentage');
    expect(comm?.percentage).toBe(0.25);
    const etr = bc.fees.find((f) => f.code === 'cartes.paiement_etranger');
    expect(etr?.type).toBe('percentage');
  });

  it('ignore les valeurs nulles', () => {
    expect(bc.fees.find((f) => f.code === 'compte.attestation_solde')).toBeUndefined();
  });

  it('renseigne les métadonnées', () => {
    expect(bc.bankCode).toBe('NSIA-CI');
    expect(bc.isActive).toBe(true);
    expect(bc.currency).toBe('XOF');
  });
});
