// Strip des numéros de section en tête de libellé, y compris la forme OCR
// « dépointée » (2.2.2.1.5.10 → 2221510) et les séparateurs OCR (. , :).
import { describe, it, expect } from 'vitest';
import { extractLabelValuePairs } from '../LabelValueExtractor';
import type { PositionedItem } from '../../bank-statement/types';

let y = 800;
function row(label: string, amount: string): PositionedItem[] {
  const yy = (y -= 20);
  const items: PositionedItem[] = [];
  let x = 50;
  for (const w of label.split(' ')) { items.push({ text: w, page: 1, x, y: yy, width: w.length * 6, height: 10 }); x += (w.length + 1) * 6; }
  items.push({ text: amount, page: 1, x: 480, y: yy, width: amount.length * 6, height: 10 });
  return items;
}

function labelOf(pairs: { label: string }[], needle: string) {
  return pairs.find((p) => p.label.toLowerCase().includes(needle))?.label;
}

describe('strip numéro de section', () => {
  it('retire les préfixes pointés, OCR-dépointés et à séparateurs', () => {
    y = 800;
    const items: PositionedItem[] = [
      ...row('2221510 Paiement factures CIE', '250'),      // OCR dépointé (≥4)
      ...row('222157 Demande de solde GAB', '500'),        // OCR dépointé (≥4)
      ...row('1.1.1.5:1 Cotisation minimum', '20 000'),    // séparateur ':' OCR
      ...row('2.2.2 Confection de la carte', '25 000'),    // pointé classique
    ];
    const { pairs } = extractLabelValuePairs(items, 1);

    expect(labelOf(pairs, 'paiement factures')).toBe('Paiement factures CIE');
    expect(labelOf(pairs, 'demande de solde')).toBe('Demande de solde GAB');
    expect(labelOf(pairs, 'cotisation minimum')).toBe('Cotisation minimum');
    expect(labelOf(pairs, 'confection')).toBe('Confection de la carte');
  });

  it('ne mange PAS un petit nombre légitime en tête (< 4 chiffres nus)', () => {
    y = 800;
    const { pairs } = extractLabelValuePairs(row('500 cartes prépayées', '1 000'), 1);
    // "500" (3 chiffres, sans séparateur) n'est pas un numéro de section → conservé.
    expect(labelOf(pairs, 'cartes')).toBe('500 cartes prépayées');
  });
});
