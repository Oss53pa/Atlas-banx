import { describe, it, expect } from 'vitest';
import { l2ToBankConditions } from '../l2ToBankConditions';
import type { PublicRefCondition } from '../../../services/publicBankReference';

const conds: PublicRefCondition[] = [
  { rubric_code: 'compte.tenue_mensuelle', value_numeric: 2000, dimensions: { profil: 'particulier' } },
  { rubric_code: 'compte.tenue_mensuelle', value_numeric: 8000, dimensions: { profil: 'corporate' } },
  { rubric_code: 'compte.releve_mensuel', value_numeric: 500, dimensions: null },
  { rubric_code: 'decouverts.taux_autorise', value_numeric: 15, dimensions: null },
  { rubric_code: 'decouverts.taux_non_autorise', value_numeric: 24, dimensions: null },
  { rubric_code: 'decouverts.commission_mouvement', value_numeric: 0.25, dimensions: null },
  { rubric_code: 'cartes.paiement_etranger', value_numeric: 2.5, dimensions: null },
  { rubric_code: 'compte.attestation_solde', value_numeric: null, dimensions: null }, // ignoré
];

describe('l2ToBankConditions', () => {
  const bc = l2ToBankConditions({ bankCode: 'NSIA-CI', bankName: 'NSIA', conditions: conds, segment: 'particulier' });

  it('mappe les taux de découvert en InterestRate (décimal)', () => {
    expect(bc.interestRates.find((r) => r.type === 'authorized')?.rate).toBeCloseTo(0.15);
    expect(bc.interestRates.find((r) => r.type === 'unauthorized')?.rate).toBeCloseTo(0.24);
  });

  it('mappe les pourcentages en fee percentage', () => {
    expect(bc.fees.find((f) => f.code === 'decouverts.commission_mouvement')?.type).toBe('percentage');
    expect(bc.fees.find((f) => f.code === 'cartes.paiement_etranger')?.type).toBe('percentage');
  });

  it('peuple accountFees structuré (relevé mensuel)', () => {
    expect(bc.accountFees?.releveCompte.mensuel).toBe(500);
  });

  it('applique la tenue de compte du SEGMENT particulier', () => {
    expect(bc.accountFees?.tenueCompte.particulier).toBe(2000);
    expect(bc.accountFees?.tenueCompte.entreprise).toBe(0);
  });

  it('applique la tenue de compte du SEGMENT entreprise (corporate)', () => {
    const bcEnt = l2ToBankConditions({ bankCode: 'NSIA-CI', conditions: conds, segment: 'corporate' });
    expect(bcEnt.accountFees?.tenueCompte.entreprise).toBe(8000);
    expect(bcEnt.accountFees?.tenueCompte.particulier).toBe(0);
  });

  it('ignore les valeurs nulles', () => {
    expect(bc.fees.find((f) => f.code === 'compte.attestation_solde')).toBeUndefined();
  });
});
