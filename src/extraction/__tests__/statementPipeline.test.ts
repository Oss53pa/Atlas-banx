// Bout-en-bout (positions → transactions) de la chaîne relevé, telle
// qu'utilisée par extractStatement — et par les scans depuis que l'OCR fournit
// des items positionnés (bbox 400 DPI) au lieu du texte libre.
import { describe, it, expect } from 'vitest';
import { clusterRows, detectTableStructure } from '../bank-statement/HeaderDetector';
import { snapRowToColumns, filterNoise, mergeMultilineTransactions } from '../bank-statement/RowReconstructor';
import { buildTransaction } from '../bank-statement/TransactionBuilder';
import type { PositionedItem } from '../bank-statement/types';

function it_(text: string, x: number, y: number): PositionedItem {
  return { text, x, y, width: Math.max(20, text.length * 6), height: 8, page: 1 };
}

// En-tête + 3 écritures (débit/crédit séparés) alignées en colonnes.
function statementItems(): PositionedItem[] {
  const cols = { date: 0, lib: 60, debit: 200, credit: 280, solde: 360 };
  const items: PositionedItem[] = [
    it_('Date', cols.date, 500), it_('Libellé', cols.lib, 500),
    it_('Débit', cols.debit, 500), it_('Crédit', cols.credit, 500), it_('Solde', cols.solde, 500),
  ];
  const rows: Array<[string, string, 'debit' | 'credit', string, string]> = [
    ['05/01/2024', 'Virement recu salaire', 'credit', '150 000', '1 150 000'],
    ['06/01/2024', 'Retrait GAB', 'debit', '50 000', '1 100 000'],
    ['07/01/2024', 'Frais tenue de compte', 'debit', '2 000', '1 098 000'],
  ];
  rows.forEach(([date, lib, side, amt, solde], i) => {
    const y = 480 - i * 20;
    items.push(it_(date, cols.date, y));
    items.push(it_(lib, cols.lib, y));
    items.push(it_(amt, side === 'debit' ? cols.debit : cols.credit, y));
    items.push(it_(solde, cols.solde, y));
  });
  return items;
}

describe('pipeline relevé (position-aware, bout-en-bout)', () => {
  it('détecte le tableau et construit les transactions signées', () => {
    const items = statementItems();
    const rows = clusterRows(items, 1, 3);
    const struct = detectTableStructure(rows);
    expect(struct).not.toBeNull();

    const mapped = rows.map((r) => snapRowToColumns(r, struct!));
    const merged = mergeMultilineTransactions(filterNoise(mapped, struct!));
    const txs = merged.map((r) => buildTransaction(r, struct!)).filter(Boolean) as NonNullable<ReturnType<typeof buildTransaction>>[];

    expect(txs.length).toBe(3);
    const byDesc = (needle: string) => txs.find((t) => t.description.toLowerCase().includes(needle));

    expect(byDesc('salaire')!.amount).toBe(150000);   // crédit → positif
    expect(byDesc('retrait')!.amount).toBe(-50000);   // débit → négatif
    expect(byDesc('tenue')!.amount).toBe(-2000);
  });
});
