// Régression NSIA : une grille tarifaire en 3 colonnes avec un TITRE pleine
// largeur (« CONDITIONS GÉNÉRALES DE BANQUE » + ligne TEG) qui traverse les
// gouttières. Avant le fix (occupation binaire), le titre masquait les
// gouttières → 1 seule bande → fusion des 3 colonnes → charabia. Le fix
// (densité + discriminateur « libellés à droite ») rétablit les 3 colonnes.
import { describe, it, expect } from 'vitest';
import { segmentColumnBands } from '../columnBands';
import { extractLabelValuePairs } from '../LabelValueExtractor';
import type { PositionedItem } from '../../bank-statement/types';

function tok(text: string, x: number, y: number, width = text.length * 6): PositionedItem {
  return { text, page: 1, x, y, width, height: 8 };
}

function nsiaLike(): PositionedItem[] {
  const items: PositionedItem[] = [];
  const cols = [
    { x0: 0, valX: 260 },
    { x0: 360, valX: 620 },
    { x0: 720, valX: 980 },
  ];
  const labels = [
    'Tenue de compte', 'Frais de retrait', 'Virement interne', 'Commission de mouvement',
    'Agios debiteurs', 'Cotisation carte', 'Cheque certifie', 'Opposition cheque',
    'Attestation de solde', 'Cloture de compte', 'Droit de timbre', 'Assurance compte',
    'Alerte SMS', 'Consultation en ligne', 'Retrait DAB', 'Paiement TPE',
  ];
  const values = ['2 000', '500', '1 500', '3 000', '4 500', '6 000', '5 000', '10 000',
    '3 000', '20 000', '250', '1 200', '100', '750', '150', '75'];

  cols.forEach((c, ci) => {
    labels.forEach((label, row) => {
      const y = 380 - row * 20;
      let x = c.x0;
      for (const w of label.split(' ')) { items.push(tok(w, x, y)); x += w.length * 6 + 6; }
      items.push(tok(values[(row + ci) % values.length], c.valX, y, 30));
    });
  });

  // Titre + sous-titre + ligne TEG : 3 lignes pleine largeur traversant tout.
  ['CONDITIONS GENERALES DE BANQUE', 'Tarifs des produits et services Particuliers',
   'Exemple TEG 11,143% Taux usure 15% TBB 10,7%'].forEach((title, i) => {
    const y = 440 + i * 20;
    let x = 0;
    for (const w of title.split(' ')) { items.push(tok(w, x, y)); x += w.length * 8 + 10; }
  });
  return items;
}

describe('layout multi-colonnes avec titre traversant (NSIA)', () => {
  it('sépare les 3 colonnes malgré le titre pleine largeur', () => {
    expect(segmentColumnBands(nsiaLike()).length).toBe(3);
  });

  it('extrait des paires propres (pas de lignes fusionnées entre colonnes)', () => {
    const { pairs } = extractLabelValuePairs(nsiaLike(), 1);
    // 16 lignes × 3 colonnes ≈ 48 paires ; sans le fix on obtenait ~16 charabias.
    expect(pairs.length).toBeGreaterThanOrEqual(40);
    // Libellés EXACTS d'une colonne de gauche et d'une de droite → aucune
    // fusion inter-colonnes (un libellé fusionné ne serait jamais égal à ceci).
    const labels = pairs.map((p) => p.label.toLowerCase());
    expect(labels.some((l) => l === 'tenue de compte')).toBe(true);
    expect(labels.some((l) => l === 'cheque certifie')).toBe(true);
  });
});
