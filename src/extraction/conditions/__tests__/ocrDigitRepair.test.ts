// Régression : réparation des sosies de chiffres OCR (O→0, l→1, S→5, …) dans
// les montants, SANS jamais corrompre les libellés.
import { describe, it, expect } from 'vitest';
import { extractLabelValuePairs } from '../LabelValueExtractor';
import type { PositionedItem } from '../../bank-statement/types';

let y = 800;
function row(labelWords: string[], amountWords: string[]): PositionedItem[] {
  const yy = (y -= 20);
  const items: PositionedItem[] = [];
  let x = 50;
  for (const w of labelWords) {
    items.push({ text: w, page: 1, x, y: yy, width: w.length * 5, height: 10 });
    x += (w.length + 1) * 5;
  }
  x = 480; // montant calé à droite
  for (const w of amountWords) {
    items.push({ text: w, page: 1, x, y: yy, width: w.length * 5, height: 10 });
    x += (w.length + 1) * 5;
  }
  return items;
}

function find(pairs: { label: string; value: number }[], needle: string) {
  return pairs.find((p) => p.label.toLowerCase().includes(needle));
}

describe('réparation OCR des chiffres', () => {
  it('corrige les montants corrompus et garde les libellés intacts', () => {
    y = 800;
    const items: PositionedItem[] = [
      ...row(['Frais', 'de', 'tenue', 'de', 'compte'], ['5', 'O00', 'FCFA']), // O→0
      ...row(['Tenue', 'compte', 'entreprise'], ['25.O00']),                   // O→0 dans groupe
      ...row(['Commission', 'de', 'mouvement'], ['l250']),                     // l→1 collé
      ...row(['Virement', 'externe'], ['S00', 'FCFA']),                        // S→5
    ];
    const { pairs } = extractLabelValuePairs(items, 1);

    expect(find(pairs, 'tenue de compte')?.value).toBe(5000);
    expect(find(pairs, 'tenue compte entreprise')?.value).toBe(25000);
    expect(find(pairs, 'commission de mouvement')?.value).toBe(1250);
    expect(find(pairs, 'virement externe')?.value).toBe(500);

    // Les libellés ne doivent PAS avoir de chiffre injecté.
    for (const p of pairs) expect(p.label).not.toMatch(/[0-9]/);
  });

  it("ne transforme pas un libellé contenant une lettre-sosie en faux montant", () => {
    y = 800;
    // "3D Secure" : 'D' n'est pas un sosie → le token "3D" reste intact ; la
    // valeur extraite est le vrai montant à droite, pas "30".
    const items = row(['Paiement', '3D', 'Secure'], ['1', '500']);
    const { pairs } = extractLabelValuePairs(items, 1);
    const p = pairs[0];
    expect(p.value).toBe(1500);
    expect(p.label).toContain('3D');
  });
});
