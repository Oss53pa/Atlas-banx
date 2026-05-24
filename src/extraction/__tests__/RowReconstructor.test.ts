// ============================================================================
// Tests — RowReconstructor (snapRowToColumns / mergeMultilineTransactions /
//          filterNoise)
// ============================================================================
// Une fois la structure connue, ce module mappe chaque item à sa colonne,
// fusionne les transactions multi-lignes (lignes sans date repliées sur la
// précédente), et filtre le bruit (en-tête, "Page X sur Y", "Total", soldes).
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  snapRowToColumns,
  mergeMultilineTransactions,
  filterNoise,
} from '../bank-statement/RowReconstructor';
import type {
  PositionedItem,
  ReconstructedRow,
  MappedRow,
  TableStructure,
} from '../bank-statement/types';

function item(text: string, x: number, y = 400, width = 30, page = 1): PositionedItem {
  return { text, x, y, width, height: 8, page };
}

// Structure type layout A : Date | Libellé | Débit | Crédit | Solde
const STRUCTURE: TableStructure = {
  headerY: 500,
  headerPage: 1,
  confidence: 0.9,
  columns: [
    { role: 'date',        label: 'Date',    xLeft: 0,   xRight: 59,  page: 1 },
    { role: 'description', label: 'Libellé', xLeft: 60,  xRight: 199, page: 1 },
    { role: 'debit',       label: 'Débit',   xLeft: 200, xRight: 279, page: 1 },
    { role: 'credit',      label: 'Crédit',  xLeft: 280, xRight: 359, page: 1 },
    { role: 'balance',     label: 'Solde',   xLeft: 360, xRight: 500, page: 1 },
  ],
};

describe('snapRowToColumns', () => {
  it('mappe chaque item à la colonne contenant son centre X', () => {
    const row: ReconstructedRow = {
      page: 1,
      y: 400,
      items: [
        item('12/03/2024', 0),
        item('VIREMENT', 60),
        item('SALAIRE', 100),
        item('250 000', 280), // colonne crédit
        item('1 250 000', 360), // colonne solde
      ],
    };
    const mapped = snapRowToColumns(row, STRUCTURE);
    expect(mapped.cells.date).toBe('12/03/2024');
    expect(mapped.cells.description).toBe('VIREMENT SALAIRE');
    expect(mapped.cells.credit).toBe('250 000');
    expect(mapped.cells.balance).toBe('1 250 000');
    expect(mapped.cells.debit).toBeUndefined();
  });

  it('rattache un item hors colonne à la colonne la plus proche', () => {
    const row: ReconstructedRow = {
      page: 1,
      y: 400,
      items: [item('5 000', 600)], // au-delà de toutes les colonnes → solde (plus proche)
    };
    const mapped = snapRowToColumns(row, STRUCTURE);
    expect(mapped.cells.balance).toBe('5 000');
  });
});

describe('mergeMultilineTransactions', () => {
  it('replie une ligne sans date sur la transaction précédente', () => {
    const rows: MappedRow[] = [
      { page: 1, y: 400, items: [item('x', 0)], cells: { date: '12/03/2024', description: 'CHEQUE', debit: '50 000' } },
      { page: 1, y: 388, items: [item('y', 60)], cells: { description: 'N° 1234567' } },
    ];
    const merged = mergeMultilineTransactions(rows);
    expect(merged.length).toBe(1);
    expect(merged[0].cells.description).toBe('CHEQUE N° 1234567');
    expect(merged[0].cells.debit).toBe('50 000');
  });

  it('démarre une nouvelle transaction à chaque ligne datée', () => {
    const rows: MappedRow[] = [
      { page: 1, y: 400, items: [item('a', 0)], cells: { date: '01/01/2024', description: 'OP1' } },
      { page: 1, y: 388, items: [item('b', 0)], cells: { date: '02/01/2024', description: 'OP2' } },
    ];
    const merged = mergeMultilineTransactions(rows);
    expect(merged.length).toBe(2);
    expect(merged[0].cells.description).toBe('OP1');
    expect(merged[1].cells.description).toBe('OP2');
  });

  it('ne fusionne pas un montant déjà présent (garde le premier)', () => {
    const rows: MappedRow[] = [
      { page: 1, y: 400, items: [item('a', 0)], cells: { date: '01/01/2024', debit: '10 000' } },
      { page: 1, y: 388, items: [item('b', 0)], cells: { debit: '99 999' } },
    ];
    const merged = mergeMultilineTransactions(rows);
    expect(merged[0].cells.debit).toBe('10 000');
  });
});

describe('filterNoise', () => {
  it('supprime les lignes au-dessus/à l\'en-tête sur la page d\'en-tête', () => {
    const rows: MappedRow[] = [
      { page: 1, y: 520, items: [], cells: { description: 'En-tête banque' } }, // > headerY 500
      { page: 1, y: 400, items: [], cells: { date: '12/03/2024', description: 'OP' } },
    ];
    const kept = filterNoise(rows, STRUCTURE);
    expect(kept.length).toBe(1);
    expect(kept[0].cells.description).toBe('OP');
  });

  it('supprime "Page X sur Y", "Total", "Solde initial/final"', () => {
    const rows: MappedRow[] = [
      { page: 2, y: 100, items: [], cells: { description: 'Page 1 sur 3' } },
      { page: 2, y: 90, items: [], cells: { description: 'Total' } },
      { page: 2, y: 80, items: [], cells: { description: 'Solde initial au 01/01' } },
      { page: 2, y: 70, items: [], cells: { date: '12/03/2024', description: 'VRAIE OP' } },
    ];
    const kept = filterNoise(rows, STRUCTURE);
    expect(kept.length).toBe(1);
    expect(kept[0].cells.description).toBe('VRAIE OP');
  });

  it('supprime les lignes entièrement vides', () => {
    const rows: MappedRow[] = [{ page: 2, y: 100, items: [], cells: {} }];
    expect(filterNoise(rows, STRUCTURE).length).toBe(0);
  });

  it('supprime le chrome d\'en-tête répété (format NSIA mainframe)', () => {
    // Bloc d'en-tête qui se répète en haut de chaque page et fuyait comme
    // de fausses transactions (cf. réconciliation Groupe Behira : +104).
    const chrome: MappedRow[] = [
      { page: 3, y: 540, items: [], cells: { description: 'HISTORIQUE DES MOUVEMENTS DU 01/01/2025 AU 31/12/2025' } },
      { page: 3, y: 490, items: [], cells: { description: 'Compte No ..: 01281 XOF 29225103' } },
      { page: 3, y: 480, items: [], cells: { description: 'No Client ..: 826371' } },
      { page: 3, y: 525, items: [], cells: { description: 'Date ........: 29 Janvier 2026', credit: '3' } }, // "Page : 3"
      { page: 3, y: 500, items: [], cells: { description: 'Age Dev Chap. Compte Nom Intitule' } },
      { page: 3, y: 458, items: [], cells: { date: 'Date compta', description: 'Libelle', debit: 'Debit', credit: 'Credit' } },
      { page: 14, y: 89, items: [], cells: { description: 'Total mouvements', debit: '661.722.696', credit: '578.834.680' } },
    ];
    expect(filterNoise(chrome, STRUCTURE).length).toBe(0);
  });

  it('NE supprime PAS une vraie transaction commençant par "TOTAL..." (TotalEnergies)', () => {
    // Garde-fou : /^total\b/ ne doit pas matcher "TOTALENERGIES" (pas de
    // frontière de mot après "total").
    const rows: MappedRow[] = [
      { page: 5, y: 200, items: [], cells: { date: '15/01/2025', description: 'TOTALENERGIES MARKETING COTE D IVOIRE', credit: '113.162.940' } },
      { page: 5, y: 190, items: [], cells: { date: '16/01/2025', description: 'VIREMENT RTGS RECU', credit: '5.000.000' } },
    ];
    expect(filterNoise(rows, STRUCTURE).length).toBe(2);
  });
});
