// ============================================================================
// Tests — RubricClassifier (classement exhaustif)
// ============================================================================
// Garantit que CHAQUE paire est classée (registre OU rubrique custom), que les
// doublons sont fusionnés, que le registre prime sur les correspondances
// fortes, et que la catégorie/segmentation des rubriques custom est correcte.
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  classifyPairs,
  cleanRubricLabel,
  customRubricKey,
  sectionToCategory,
  isCustomRubricKey,
  parseCustomRubricKey,
} from '../conditions/RubricClassifier';
import type { LabelValuePair } from '../conditions/types';

function pair(p: Partial<LabelValuePair> & { label: string; value: number }): LabelValuePair {
  return { rawValue: String(p.value), confidence: 0.9, page: 1, y: 100, ...p };
}

describe('RubricClassifier — exhaustivité', () => {
  it('assigne une rubrique à CHAQUE paire (aucune non rattachée)', () => {
    const pairs = [
      pair({ label: 'Tenue de compte particulier', value: 5000, unit: 'FCFA' }),
      pair({ label: 'Pesocolations religieuses clé', value: 93, unit: 'FCFA' }),
      pair({ label: 'zzz libellé totalement inconnu', value: 12, unit: 'FCFA' }),
    ];
    const { perPair } = classifyPairs(pairs);
    expect(perPair).toHaveLength(3);
    for (const c of perPair) {
      expect(c.key).toBeTruthy();
    }
  });

  it('fait primer le registre sur une correspondance forte', () => {
    const { perPair } = classifyPairs([
      pair({ label: 'Tenue de compte particulier', value: 5000, unit: 'FCFA' }),
    ]);
    expect(perPair[0].source).toBe('registry');
    expect(perPair[0].key).toContain('tenueCompte');
  });

  it('auto-crée une rubrique custom pour un libellé hors registre', () => {
    const { perPair, catalog } = classifyPairs([
      pair({ label: 'Cotisation club avantages plus', value: 1500, unit: 'FCFA' }),
    ]);
    expect(perPair[0].source).toBe('custom');
    expect(isCustomRubricKey(perPair[0].key)).toBe(true);
    expect(catalog).toHaveLength(1);
  });
});

describe('RubricClassifier — déduplication', () => {
  it('fusionne deux lignes identiques en une seule rubrique custom', () => {
    const { perPair, catalog } = classifyPairs([
      pair({ label: 'Cotisation club avantages', value: 1500, unit: 'FCFA', y: 100 }),
      pair({ label: 'Cotisation club avantages', value: 1500, unit: 'FCFA', y: 200 }),
    ]);
    expect(perPair[0].key).toBe(perPair[1].key);
    expect(catalog).toHaveLength(1);
  });

  it('déduplique malgré accents / casse / espaces', () => {
    const k1 = customRubricKey('compte', 'Frais de DOSSIER  spécial');
    const k2 = customRubricKey('compte', 'frais de dossier special');
    expect(k1).toBe(k2);
  });
});

describe('RubricClassifier — catégorie & nettoyage', () => {
  it('mappe la section vers la bonne catégorie d\'onglet', () => {
    expect(sectionToCategory('SERVICES BANQUE À DISTANCE', 'Abonnement')).toBe('ebanking');
    expect(sectionToCategory(undefined, 'Cotisation carte VISA')).toBe('cartes');
    expect(sectionToCategory('Virements', 'Virement SWIFT')).toBe('virements');
    expect(sectionToCategory('Crédits', 'Agios débiteurs')).toBe('credits');
    expect(sectionToCategory('Opérations de guichet', 'Retrait espèces')).toBe('guichet');
    expect(sectionToCategory(undefined, 'libellé neutre')).toBe('divers');
  });

  it('nettoie le bruit OCR du libellé', () => {
    expect(cleanRubricLabel('2.2.3.3.6 Port de lettre FCFA')).toBe('Port de lettre');
    expect(cleanRubricLabel('22336 Frais de tenue TTC')).toBe('Frais de tenue');
    // Ne vide jamais : repli sur l'original si le nettoyage supprime tout
    expect(cleanRubricLabel('123').length).toBeGreaterThan(0);
  });

  it('parse une clé custom', () => {
    const key = customRubricKey('cartes', 'Cotisation VISA');
    const parsed = parseCustomRubricKey(key);
    expect(parsed?.category).toBe('cartes');
    expect(parsed?.slug).toBeTruthy();
  });
});
