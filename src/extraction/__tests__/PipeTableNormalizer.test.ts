// ============================================================================
// Tests — PipeTableNormalizer (explodePipeDelimitedItems / isPipeDelimited)
// ============================================================================
// Verrouille la normalisation des relevés "mainframe" (NSIA Banque CI & co)
// où les colonnes sont délimitées par « ! » / « | » dans un même item texte.
// Doit exploser ces items en sous-items positionnés ET rester transparent
// (no-op) pour les relevés tabulaires classiques.
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  explodePipeDelimitedItems,
  isPipeDelimited,
} from '../bank-statement/PipeTableNormalizer';
import type { PositionedItem } from '../bank-statement/types';

function pipeItems(): PositionedItem[] {
  // Reproduit le motif NSIA : ≥8 items contenant « ! »
  const items: PositionedItem[] = [];
  for (let i = 0; i < 10; i++) {
    items.push({
      text: `!0${i}/01/2025 !31/12/2024 !SCPM`,
      page: 1,
      x: 133,
      y: 400 - i * 8,
      width: 147,
      height: 8,
    });
  }
  return items;
}

describe('isPipeDelimited', () => {
  it('détecte un tableau bordé « ! »', () => {
    expect(isPipeDelimited(pipeItems())).toBe(true);
  });

  it('ne se déclenche pas sur un relevé classique (pas de bordure)', () => {
    const normal: PositionedItem[] = [
      { text: '12/03/2024', page: 1, x: 0, y: 100, width: 40, height: 8 },
      { text: 'VIREMENT', page: 1, x: 60, y: 100, width: 50, height: 8 },
      { text: '250 000', page: 1, x: 200, y: 100, width: 40, height: 8 },
    ];
    expect(isPipeDelimited(normal)).toBe(false);
  });

  it('ne se déclenche pas sous le seuil minimal d\'items bordés', () => {
    const few: PositionedItem[] = [
      { text: 'Note ! importante', page: 1, x: 0, y: 100, width: 80, height: 8 },
      { text: 'Autre ! ligne', page: 1, x: 0, y: 90, width: 80, height: 8 },
    ];
    expect(isPipeDelimited(few)).toBe(false);
  });
});

describe('explodePipeDelimitedItems', () => {
  it('explose un item bordé en sous-items positionnés et triés en X', () => {
    const exploded = explodePipeDelimitedItems(pipeItems());
    // Chaque item "!00/01/2025 !31/12/2024 !SCPM" → 3 segments
    const firstRow = exploded.filter((it) => it.y === 400);
    expect(firstRow.map((i) => i.text)).toEqual(['00/01/2025', '31/12/2024', 'SCPM']);
    // X croissant : date < date valeur < utilisateur
    expect(firstRow[0].x).toBeLessThan(firstRow[1].x);
    expect(firstRow[1].x).toBeLessThan(firstRow[2].x);
  });

  it('retire les segments vides (bordures pures)', () => {
    const items: PositionedItem[] = Array.from({ length: 9 }, (_, i) => ({
      text: '850.000!',
      page: 1,
      x: 560,
      y: 400 - i * 8,
      width: 30,
      height: 8,
    }));
    const exploded = explodePipeDelimitedItems(items);
    // "850.000!" → ["850.000", ""] → seul "850.000" conservé
    expect(exploded.every((it) => it.text === '850.000')).toBe(true);
    expect(exploded.length).toBe(9);
  });

  it('renvoie les items inchangés pour un relevé classique (no-op)', () => {
    const normal: PositionedItem[] = [
      { text: '12/03/2024', page: 1, x: 0, y: 100, width: 40, height: 8 },
      { text: 'VIREMENT', page: 1, x: 60, y: 100, width: 50, height: 8 },
      { text: '250 000', page: 1, x: 200, y: 100, width: 40, height: 8 },
    ];
    expect(explodePipeDelimitedItems(normal)).toEqual(normal);
  });

  it('préserve la page et le Y des sous-items', () => {
    const exploded = explodePipeDelimitedItems(pipeItems());
    expect(exploded.every((it) => it.page === 1)).toBe(true);
    // une des lignes d'origine est à y=400
    expect(exploded.some((it) => it.y === 400)).toBe(true);
  });
});
