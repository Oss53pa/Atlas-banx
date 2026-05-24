// ============================================================================
// Tests — HeaderDetector (clusterRows / detectTableStructure)
// ============================================================================
// Le détecteur découvre la structure du tableau d'un relevé en lisant la
// ligne d'en-tête (positions X/Y), sans colonnes hardcodées. Ces tests
// verrouillent : le clustering des items en lignes, et la reconnaissance
// des rôles de colonnes (date / libellé / débit / crédit / solde) en FR/EN.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { clusterRows, detectTableStructure } from '../bank-statement/HeaderDetector';
import type { PositionedItem, ReconstructedRow } from '../bank-statement/types';

function item(text: string, x: number, y: number, width = 30, page = 1): PositionedItem {
  return { text, x, y, width, height: 8, page };
}

describe('clusterRows', () => {
  it('groupe les items de même Y (à la tolérance près) en lignes', () => {
    const items: PositionedItem[] = [
      item('A', 0, 100),
      item('B', 50, 101), // même ligne que A (Δy=1 ≤ 3)
      item('C', 0, 80),   // ligne en dessous
    ];
    const rows = clusterRows(items, 1, 3);
    expect(rows.length).toBe(2);
    expect(rows[0].items.map((i) => i.text)).toEqual(['A', 'B']);
    expect(rows[1].items.map((i) => i.text)).toEqual(['C']);
  });

  it('trie les lignes de haut en bas (Y décroissant)', () => {
    const rows = clusterRows([item('bas', 0, 10), item('haut', 0, 200)], 1, 3);
    expect(rows[0].items[0].text).toBe('haut');
    expect(rows[1].items[0].text).toBe('bas');
  });

  it('trie les items d\'une ligne de gauche à droite (X croissant)', () => {
    const rows = clusterRows([item('droite', 300, 100), item('gauche', 0, 100)], 1, 3);
    expect(rows[0].items.map((i) => i.text)).toEqual(['gauche', 'droite']);
  });

  it('filtre par page', () => {
    const items = [item('p1', 0, 100, 30, 1), item('p2', 0, 100, 30, 2)];
    expect(clusterRows(items, 1).length).toBe(1);
    expect(clusterRows(items, 2).length).toBe(1);
  });
});

describe('detectTableStructure', () => {
  function headerRow(labels: Array<[string, number]>): ReconstructedRow {
    // Espacement > 8 entre labels pour qu'ils soient des groupes distincts
    return {
      page: 1,
      y: 500,
      items: labels.map(([t, x]) => item(t, x, 500, 35)),
    };
  }

  it('détecte une structure Débit/Crédit (layout A)', () => {
    const row = headerRow([
      ['Date', 0],
      ['Libellé', 60],
      ['Débit', 200],
      ['Crédit', 280],
      ['Solde', 360],
    ]);
    const struct = detectTableStructure([row]);
    expect(struct).not.toBeNull();
    const roles = struct!.columns.map((c) => c.role);
    expect(roles).toContain('date');
    expect(roles).toContain('description');
    expect(roles).toContain('debit');
    expect(roles).toContain('credit');
    expect(roles).toContain('balance');
    expect(struct!.confidence).toBeGreaterThan(0);
  });

  it('détecte une structure Montant unique (layout B)', () => {
    const row = headerRow([
      ['Date', 0],
      ['Description', 60],
      ['Montant', 220],
      ['Solde', 320],
    ]);
    const struct = detectTableStructure([row]);
    expect(struct).not.toBeNull();
    expect(struct!.columns.map((c) => c.role)).toContain('amount');
  });

  it('reconnaît la terminologie anglaise (Date/Description/Debit/Credit/Balance)', () => {
    const row = headerRow([
      ['Date', 0],
      ['Description', 60],
      ['Debit', 200],
      ['Credit', 280],
      ['Balance', 360],
    ]);
    const struct = detectTableStructure([row]);
    expect(struct).not.toBeNull();
    expect(struct!.columns.map((c) => c.role)).toEqual(
      expect.arrayContaining(['date', 'description', 'debit', 'credit', 'balance']),
    );
  });

  it('calcule des bornes xRight ordonnées (chaque colonne borne la suivante)', () => {
    const row = headerRow([
      ['Date', 0],
      ['Libellé', 60],
      ['Débit', 200],
      ['Crédit', 280],
      ['Solde', 360],
    ]);
    const cols = detectTableStructure([row])!.columns;
    for (let i = 0; i < cols.length - 1; i++) {
      expect(cols[i].xRight).toBeLessThanOrEqual(cols[i + 1].xLeft);
    }
  });

  it('retourne null sans colonne date', () => {
    const row = headerRow([
      ['Libellé', 60],
      ['Débit', 200],
      ['Crédit', 280],
    ]);
    expect(detectTableStructure([row])).toBeNull();
  });

  it('retourne null sans colonne montant', () => {
    const row = headerRow([
      ['Date', 0],
      ['Libellé', 60],
      ['Référence', 200],
    ]);
    expect(detectTableStructure([row])).toBeNull();
  });

  it('retourne null avec moins de 3 labels', () => {
    const row = headerRow([['Date', 0], ['Solde', 200]]);
    expect(detectTableStructure([row])).toBeNull();
  });
});
