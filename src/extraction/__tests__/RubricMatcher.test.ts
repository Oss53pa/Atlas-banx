// ============================================================================
// Tests — RubricMatcher (matchRubrics)
// ============================================================================
// Apparie chaque paire label-valeur extraite d'un document de conditions à la
// meilleure FieldDefinition du registre, via similarité floue + compatibilité
// d'unité + contrôle de plage. Ces tests verrouillent les appariements clés et
// les garde-fous (unité incompatible, valeur hors plage, label inconnu).
// ============================================================================

import { describe, it, expect } from 'vitest';
import { matchRubrics } from '../conditions/RubricMatcher';
import type { LabelValuePair } from '../conditions/types';

function pair(partial: Partial<LabelValuePair> & { label: string; value: number }): LabelValuePair {
  return {
    rawValue: String(partial.value),
    confidence: 0.95,
    page: 1,
    y: 100,
    ...partial,
  };
}

describe('matchRubrics — appariements nominaux', () => {
  it('mappe "Tenue de compte particulier" → accountFees.tenueCompte.particulier', () => {
    const { matches } = matchRubrics([
      pair({ label: 'Tenue de compte particulier', value: 5000, unit: 'FCFA' }),
    ]);
    expect(matches['accountFees.tenueCompte.particulier']).toBeDefined();
    expect(matches['accountFees.tenueCompte.particulier'].pair.value).toBe(5000);
  });

  it('garde la meilleure paire quand plusieurs lignes matchent le même champ', () => {
    const { matches } = matchRubrics([
      pair({ label: 'Tenue de compte particulier', value: 5000, unit: 'FCFA', confidence: 0.7 }),
      pair({ label: 'Frais de tenue de compte particulier', value: 5000, unit: 'FCFA', confidence: 0.95 }),
    ]);
    const m = matches['accountFees.tenueCompte.particulier'];
    expect(m).toBeDefined();
    // La meilleure confiance agrégée gagne
    expect(m.pair.confidence).toBe(0.95);
  });
});

describe('matchRubrics — garde-fous', () => {
  it('ne matche pas un label totalement inconnu', () => {
    const { matches } = matchRubrics([
      pair({ label: 'XYZ ZZZ QQQ libellé bidon improbable', value: 42, unit: 'FCFA' }),
    ]);
    expect(Object.keys(matches)).toHaveLength(0);
  });

  it('rejette une unité incompatible (% sur un champ FCFA)', () => {
    // "tenue de compte" est un champ FCFA ; un pourcentage ne doit pas matcher.
    const { matches } = matchRubrics([
      pair({ label: 'Tenue de compte particulier', value: 14.5, unit: '%' }),
    ]);
    expect(matches['accountFees.tenueCompte.particulier']).toBeUndefined();
  });

  it('considère FCFA / XAF / XOF comme interchangeables', () => {
    const xof = matchRubrics([pair({ label: 'Tenue de compte particulier', value: 5000, unit: 'XOF' })]);
    const xaf = matchRubrics([pair({ label: 'Tenue de compte particulier', value: 5000, unit: 'XAF' })]);
    expect(xof.matches['accountFees.tenueCompte.particulier']).toBeDefined();
    expect(xaf.matches['accountFees.tenueCompte.particulier']).toBeDefined();
  });

  it('expose perPair pour le diagnostic', () => {
    const { perPair } = matchRubrics([
      pair({ label: 'Tenue de compte particulier', value: 5000, unit: 'FCFA' }),
    ]);
    expect(perPair.length).toBeGreaterThan(0);
    expect(perPair[0].field.key).toBe('accountFees.tenueCompte.particulier');
  });
});
