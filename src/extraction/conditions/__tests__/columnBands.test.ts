import { describe, it, expect } from 'vitest';
import { segmentColumnBands } from '../columnBands';
import { extractLabelValuePairs } from '../LabelValueExtractor';
import type { PositionedItem } from '../../bank-statement/types';

// Build a token with a width so band segmentation can compute X coverage.
function tok(text: string, x: number, y: number, width = text.length * 6): PositionedItem {
  return { text, page: 1, x, y, width, height: 8 };
}

// Two tariff tables laid SIDE BY SIDE (multi-column page layout). Left block
// lives at x∈[0,120], right block at x∈[240,400] — a wide empty gutter between.
// Both blocks share the same Y rows, so a page-wide Y clustering would merge
// them into garbled rows. Amounts use thousands separators (as real CEMAC/
// UEMOA tariffs do), which the amount parser reads correctly.
function sideBySideLayout(): PositionedItem[] {
  const items: PositionedItem[] = [];
  const left: Array<[string, string]> = [
    ['Tenue de compte', '2 000'],
    ['Frais de retrait', '500'],
    ['Virement interne', '1 500'],
    ['Commission mouvement', '3 000'],
    ['Agios debiteurs', '4 500'],
    ['Cotisation carte', '6 000'],
  ];
  const right: Array<[string, string]> = [
    ['Carte Visa Classic', '25 000'],
    ['Carte Visa Gold', '50 000'],
    ['Chequier 25 feuilles', '3 500'],
    ['Assurance moyens paiement', '1 200'],
    ['Alerte SMS', '100'],
    ['Consultation en ligne', '750'],
  ];
  left.forEach(([label, val], row) => {
    const y = 400 - row * 20;
    let x = 0;
    for (const w of label.split(' ')) { items.push(tok(w, x, y)); x += w.length * 6 + 6; }
    items.push(tok(val, 95, y, 24)); // value column of the LEFT block
  });
  right.forEach(([label, val], row) => {
    const y = 400 - row * 20; // same Y as left block
    let x = 240;
    for (const w of label.split(' ')) { items.push(tok(w, x, y)); x += w.length * 6 + 6; }
    items.push(tok(val, 375, y, 24)); // value column of the RIGHT block
  });
  return items;
}

// A single flowing column with ragged label lengths: the value sits right after
// each label, so its X varies per row → no full-height interior gutter.
function raggedSingleColumn(): PositionedItem[] {
  const rows: Array<[string, string]> = [
    ['Compte', '1 000'],
    ['Tenue de compte mensuelle', '2 500'],
    ['Carte', '15 000'],
    ['Virement permanent externe vers autre banque', '3 000'],
    ['SMS', '100'],
    ['Assurance perte et vol des moyens de paiement', '1 200'],
    ['Cheque', '500'],
    ['Cotisation carte Visa Gold internationale', '50 000'],
  ];
  const items: PositionedItem[] = [];
  rows.forEach(([label, val], row) => {
    const y = 400 - row * 20;
    let x = 0;
    for (const w of label.split(' ')) { items.push(tok(w, x, y)); x += w.length * 6 + 6; }
    items.push(tok(val, x + 10, y, 24)); // value X depends on label length → ragged
  });
  return items;
}

describe('segmentColumnBands', () => {
  it('splits a side-by-side layout into two bands', () => {
    const bands = segmentColumnBands(sideBySideLayout());
    expect(bands.length).toBe(2);
  });

  it('keeps a ragged single-column layout as one band', () => {
    expect(segmentColumnBands(raggedSingleColumn()).length).toBe(1);
  });
});

describe('extractLabelValuePairs with multi-column layout', () => {
  it('recovers pairs from BOTH side-by-side blocks (not one garbled row per line)', () => {
    const { pairs } = extractLabelValuePairs(sideBySideLayout(), 1);
    // 6 rows × 2 blocks = 12 clean pairs (page-wide clustering would give ~6 garbled ones).
    expect(pairs.length).toBeGreaterThanOrEqual(11);
    const labels = pairs.map((p) => p.label.toLowerCase());
    // A label from the LEFT block and one from the RIGHT block both survive, intact.
    expect(labels.some((l) => l.includes('tenue de compte'))).toBe(true);
    expect(labels.some((l) => l.includes('carte visa'))).toBe(true);
    // The left block's value is NOT contaminated by the right block's tokens.
    const tenue = pairs.find((p) => p.label.toLowerCase().includes('tenue de compte'));
    expect(tenue?.value).toBe(2000);
  });

  it('does not regress a ragged single-column layout', () => {
    const { pairs } = extractLabelValuePairs(raggedSingleColumn(), 1);
    expect(pairs.length).toBeGreaterThanOrEqual(8);
    const carte = pairs.find((p) => p.label.toLowerCase() === 'carte');
    expect(carte?.value).toBe(15000);
  });
});
