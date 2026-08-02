// Régression : l'import « depuis la liste des banques » (BanksPage) doit
// écrire les valeurs dans l'espace de noms du FORMULAIRE (tenueCompte.*, …),
// le seul lu par la grille (GridSummaryCard) et l'audit — PAS dans l'espace
// brut du registre (accountFees.*). Un bug historique faisait
// setByPath(structured, 'accountFees.tenueCompte.particulier', …) → valeurs
// perdues → « paires détectées » mais « aucune donnée » importée.
import { describe, it, expect } from 'vitest';
import {
  applyExtractedValuesToConditions,
  getEmptyFullConditions,
  customFeesToFeeSchedules,
  type CustomFee,
} from '../../conditionsForm';

describe('import BanksPage → espace de noms du formulaire', () => {
  it('les clés registre atterrissent sur les chemins lus par la grille', () => {
    // Ce que produit la modale de vérification (commit.conditions), clés = registre.
    const extractedValues: Record<string, number> = {
      'accountFees.tenueCompte.particulier': 5000,
      'accountFees.tenueCompte.entreprise': 25000,
      'accountFees.fraisCloture': 3000,
      'accountFees.attestationSolde': 2000,
    };

    const c = applyExtractedValuesToConditions(getEmptyFullConditions(), extractedValues) as any;

    // Chemins RÉELLEMENT lus par GridSummaryCard :
    expect(c.tenueCompte.particulierLocal).toBe(5000);
    expect(c.tenueCompte.entreprise).toBe(25000);
    expect(c.clotureCompte.particulier).toBe(3000);
    expect(c.releves.attestationSolde).toBe(2000);

    // L'espace brut du registre ne doit PAS être utilisé comme stockage.
    expect(c.accountFees).toBeUndefined();
  });

  it('les rubriques custom deviennent des FeeSchedule (audit)', () => {
    const customFees: CustomFee[] = [
      { id: '1', label: 'Frais SMS', amount: 100, type: 'fixed', frequency: 'per_operation', category: 'ebanking' },
    ];
    const fees = customFeesToFeeSchedules(customFees);
    expect(fees).toHaveLength(1);
    expect(fees[0].name).toBe('Frais SMS');
    expect(fees[0].amount).toBe(100);
  });
});
