// ============================================================================
// Tests — LabelValueExtractor (extractLabelValuePairs)
// ============================================================================
// Pour chaque ligne d'un document de conditions, isole le libellé (gauche) et
// la valeur (cluster numérique à droite, OU valeur qualitative type
// "Gratuit"). Suit aussi les en-têtes de section pour désambiguïser.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { extractLabelValuePairs } from '../conditions/LabelValueExtractor';
import type { PositionedItem } from '../bank-statement/types';

let yCursor = 800;
function makeRow(words: string[], opts: { height?: number } = {}): PositionedItem[] {
  const y = yCursor;
  yCursor -= 20; // lignes espacées de 20 (> tolérance 3)
  return words.map((text, i) => ({
    text,
    x: i * 40,
    y,
    width: 35,
    height: opts.height ?? 8,
    page: 1,
  }));
}

describe('extractLabelValuePairs — valeurs numériques', () => {
  it('extrait label + valeur + unité FCFA depuis "Frais de tenue ... 5 000 FCFA"', () => {
    yCursor = 800;
    const items = makeRow(['Frais', 'de', 'tenue', 'de', 'compte', '5 000', 'FCFA']);
    const { pairs } = extractLabelValuePairs(items, 1);
    expect(pairs.length).toBe(1);
    expect(pairs[0].label.toLowerCase()).toContain('tenue');
    expect(pairs[0].value).toBe(5000);
    expect(pairs[0].unit).toBe('FCFA');
  });

  it('détecte l\'unité pourcentage', () => {
    yCursor = 800;
    const items = makeRow(['Taux', 'découvert', 'autorisé', '14,5', '%']);
    const { pairs } = extractLabelValuePairs(items, 1);
    expect(pairs.length).toBe(1);
    expect(pairs[0].value).toBe(14.5);
    expect(pairs[0].unit).toBe('%');
  });

  it('utilise le cluster numérique le plus à droite comme valeur', () => {
    // "Carnet 25 chèques 3 000" → le label contient "25" mais la valeur est 3 000
    yCursor = 800;
    const items = makeRow(['Carnet', '25', 'chèques', '3 000']);
    const { pairs } = extractLabelValuePairs(items, 1);
    expect(pairs[0].value).toBe(3000);
  });
});

describe('extractLabelValuePairs — valeurs qualitatives', () => {
  it('détecte "Gratuit" (value=0, qualitative=gratuit)', () => {
    yCursor = 800;
    const items = makeRow(['Virement', 'interne', 'Gratuit']);
    const { pairs } = extractLabelValuePairs(items, 1);
    expect(pairs.length).toBe(1);
    expect(pairs[0].value).toBe(0);
    expect(pairs[0].qualitative).toBe('gratuit');
    expect(pairs[0].label.toLowerCase()).toContain('virement');
  });

  it('détecte "Nous consulter"', () => {
    yCursor = 800;
    const items = makeRow(['Garantie', 'bancaire', 'Nous', 'consulter']);
    const { pairs } = extractLabelValuePairs(items, 1);
    expect(pairs[0].qualitative).toBe('consulter');
  });
});

describe('extractLabelValuePairs — sections', () => {
  it('rattache une paire à la section en-tête précédente (tout en majuscules)', () => {
    yCursor = 800;
    const section = makeRow(['CONDITIONS', 'PARTICULIERS']); // pas de montant, all caps → section
    const line = makeRow(['Tenue', 'de', 'compte', '5 000', 'FCFA']);
    const { pairs, sections } = extractLabelValuePairs([...section, ...line], 1);
    expect(sections).toContain('CONDITIONS PARTICULIERS');
    expect(pairs.length).toBe(1);
    expect(pairs[0].section).toBe('CONDITIONS PARTICULIERS');
  });
});
