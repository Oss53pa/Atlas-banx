// ============================================================================
// Tests — conditionsForm (getEmptyFullConditions / applyExtractedValuesTo
//          Conditions / mergeBankConditions)
// ============================================================================
// Le module partagé qui projette les `extractedValues` d'un document (clés
// FieldRegistry) vers la forme riche FullBankConditions du formulaire. C'est
// le cœur de la synthèse "une grille par document" : BanksPage l'utilise pour
// construire les conditions de chaque ConditionGrid au save.
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  getEmptyFullConditions,
  applyExtractedValuesToConditions,
  mergeBankConditions,
  customFeesToFeeSchedules,
  type CustomFee,
} from '../conditionsForm';

describe('customFeesToFeeSchedules — rubriques custom → catalogue d\'audit', () => {
  const fee = (p: Partial<CustomFee>): CustomFee => ({
    id: 'x', label: 'Frais X', amount: 5000, type: 'fixed',
    frequency: 'per_operation', category: 'divers', ...p,
  });

  it('mappe un frais fixe en FeeSchedule fixed', () => {
    const [fs] = customFeesToFeeSchedules([fee({ label: 'Port de lettre', amount: 5000, category: 'compte' })]);
    expect(fs.type).toBe('fixed');
    expect(fs.amount).toBe(5000);
    expect(fs.name).toBe('Port de lettre');
    expect(fs.code).toContain('CUSTOM');
  });

  it('mappe un frais % en percentage (décimal)', () => {
    const [fs] = customFeesToFeeSchedules([fee({ label: 'Commission change', amount: 2, type: 'percent', category: 'guichet' })]);
    expect(fs.type).toBe('percentage');
    expect(fs.percentage).toBeCloseTo(0.02);
  });

  it('renvoie un tableau vide pour aucune rubrique', () => {
    expect(customFeesToFeeSchedules([])).toEqual([]);
  });
});

describe('getEmptyFullConditions', () => {
  it('produit un squelette tout à zéro / vide', () => {
    const c = getEmptyFullConditions();
    expect(c.tenueCompte.particulierLocal).toBe(0);
    expect(c.virements.interneGratuit).toBe(false);
    expect(c.cartes).toEqual([]);
    expect(c.documents).toEqual([]);
    expect(c.customFees).toEqual([]);
  });

  it('retourne un nouvel objet à chaque appel (pas de partage de référence)', () => {
    const a = getEmptyFullConditions();
    const b = getEmptyFullConditions();
    a.tenueCompte.particulierLocal = 999;
    expect(b.tenueCompte.particulierLocal).toBe(0);
  });
});

describe('applyExtractedValuesToConditions — dot-paths traduits', () => {
  it('mappe une clé FieldRegistry vers le chemin du formulaire', () => {
    const c = applyExtractedValuesToConditions(getEmptyFullConditions(), {
      'accountFees.tenueCompte.particulier': 5000,
    });
    expect(c.tenueCompte.particulierLocal).toBe(5000);
  });

  it('mappe plusieurs sections en une passe', () => {
    const c = applyExtractedValuesToConditions(getEmptyFullConditions(), {
      'accountFees.tenueCompte.professionnel': 10000,
      'creditFees.tauxUsureLegal': 18,
      'transferFees.virementInternational.swift': 15000,
    });
    expect(c.tenueCompte.professionnel).toBe(10000);
    expect(c.credits.tauxUsure).toBe(18);
    expect(c.virements.swift).toBe(15000);
  });

  it('laisse passer les clés déjà au format formulaire (passthrough)', () => {
    const c = applyExtractedValuesToConditions(getEmptyFullConditions(), {
      'cheques.carnet25': 3000,
    });
    expect(c.cheques.carnet25).toBe(3000);
  });

  it('ignore les valeurs null / undefined', () => {
    const c = applyExtractedValuesToConditions(getEmptyFullConditions(), {
      'accountFees.tenueCompte.particulier': null,
      'accountFees.tenueCompte.professionnel': undefined,
    });
    expect(c.tenueCompte.particulierLocal).toBe(0);
    expect(c.tenueCompte.professionnel).toBe(0);
  });

  it('ne mute pas l\'objet base (renvoie un clone)', () => {
    const base = getEmptyFullConditions();
    applyExtractedValuesToConditions(base, { 'accountFees.tenueCompte.particulier': 5000 });
    expect(base.tenueCompte.particulierLocal).toBe(0);
  });
});

describe('applyExtractedValuesToConditions — patchers cartes', () => {
  it('upsert une Visa Gold dans le tableau cartes[] (cotisation)', () => {
    const c = applyExtractedValuesToConditions(getEmptyFullConditions(), {
      'cardFees.visaGold': 30000,
    });
    const gold = c.cartes.find((card) => card.reseau === 'VISA' && /gold/i.test(card.nom));
    expect(gold).toBeDefined();
    expect(gold!.cotisationAnnuelle).toBe(30000);
  });

  it('upsert plusieurs types de cartes', () => {
    const c = applyExtractedValuesToConditions(getEmptyFullConditions(), {
      'cardFees.visaClassic': 15000,
      'cardFees.gimac': 5000,
    });
    expect(c.cartes.some((x) => /classic/i.test(x.nom) && x.cotisationAnnuelle === 15000)).toBe(true);
    expect(c.cartes.some((x) => x.reseau === 'GIMAC' && x.cotisationAnnuelle === 5000)).toBe(true);
  });
});

describe('mergeBankConditions', () => {
  it('renvoie le squelette vide quand bankData est null', () => {
    const empty = getEmptyFullConditions();
    expect(mergeBankConditions(empty, null)).toEqual(empty);
  });

  it('fusionne les sections objet clé-à-clé en préservant les sous-clés manquantes', () => {
    const merged = mergeBankConditions(getEmptyFullConditions(), {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tenueCompte: { particulierLocal: 7000 } as any,
    });
    expect(merged.tenueCompte.particulierLocal).toBe(7000);
    // sous-clé non fournie → reste à 0 (pas undefined)
    expect(merged.tenueCompte.professionnel).toBe(0);
  });

  it('copie les tableaux (cartes / documents) tels quels', () => {
    const merged = mergeBankConditions(getEmptyFullConditions(), {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documents: [{ id: 'd1', name: 'grille.pdf', isActive: true } as any],
    });
    expect(merged.documents).toHaveLength(1);
    expect(merged.documents[0].id).toBe('d1');
  });
});
