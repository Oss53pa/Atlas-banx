// Filtre qualité en sortie d'extraction : écarte le bruit OCR flagrant
// (fragments < 3 lettres, fusions/en-têtes > 90 car.) sans toucher aux
// libellés normaux.
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

describe('filtre qualité des paires', () => {
  it('écarte fragments et fusions, garde les libellés normaux', () => {
    y = 800;
    const items: PositionedItem[] = [
      ...row('Tenue de compte particulier', '5 000'),                 // OK
      ...row('bh', '2 224'),                                          // fragment < 3 lettres → drop
      ...row('T1 222', '1 512'),                                      // 1 lettre → drop
      ...row('Exemple de calcul representatif de la formule du TEG applique aux credits a la clientele taux interet', '10'), // > 90 car. → drop
      ...row('Attestation de solde', '3 000'),                        // OK
    ];
    const { pairs } = extractLabelValuePairs(items, 1);
    const labels = pairs.map((p) => p.label.toLowerCase());

    expect(labels).toContain('tenue de compte particulier');
    expect(labels).toContain('attestation de solde');
    expect(labels.some((l) => l === 'bh')).toBe(false);
    expect(labels.some((l) => l.startsWith('t1'))).toBe(false);
    expect(labels.some((l) => l.length > 90)).toBe(false);
  });
});
