// ============================================================================
// ATLASBANX — Column-band segmentation for multi-column conditions layouts
// ============================================================================
// Many bank tariff brochures (« Conditions Générales de Banque ») lay several
// independent tariff tables SIDE BY SIDE across the page — a newspaper-style
// multi-column layout. A page-wide Y clustering then merges cells from
// unrelated blocks that happen to share a Y coordinate, producing garbled
// rows where only the rightmost number survives and every label is mangled.
//
// This module finds the vertical whitespace corridors (gutters) that separate
// those blocks and splits the page's items into bands, so each block's rows
// can be reconstructed independently.
//
// Safety: the caller only USES the split if it yields at least as many valid
// label/value pairs as the single-band extraction. A wrong split (e.g. cutting
// a normal label→value two-column layout down the middle) strands numbers with
// no label or labels with no number, both of which produce ZERO pairs — so it
// is always rejected by that guard.
// ============================================================================

import type { PositionedItem } from '../bank-statement/types';
import { looksLikeAmount } from '../bank-statement/AmountParser';

/** X interval covered by an item. */
function itemLeft(it: PositionedItem): number {
  return it.x;
}
function itemRight(it: PositionedItem): number {
  return it.x + (it.width ?? Math.max(4, it.text.length * 4));
}

/** Un token « textuel » (libellé) = contient des lettres et n'est pas un montant. */
function isTextToken(it: PositionedItem): boolean {
  return /[a-zA-ZÀ-ÿ]/.test(it.text) && !looksLikeAmount(it.text);
}

/**
 * Vrai si le contenu juste À DROITE de `cutX` est majoritairement TEXTUEL
 * (des libellés de la colonne suivante) plutôt que numérique. C'est ce qui
 * distingue une vraie gouttière INTER-colonnes (à droite : des libellés) d'un
 * simple gap libellé→valeur INTERNE à une colonne (à droite : des valeurs).
 */
function rightSideIsLabels(cutX: number, items: PositionedItem[], pageWidth: number): boolean {
  const win = pageWidth * 0.15;
  const near = items
    .filter((it) => itemLeft(it) >= cutX && itemLeft(it) < cutX + win)
    .sort((a, b) => itemLeft(a) - itemLeft(b))
    .slice(0, 16);
  if (near.length < 3) return false; // rien de substantiel à droite → bord de page
  const textCount = near.filter(isTextToken).length;
  return textCount >= near.length * 0.5;
}

/**
 * Split a page's items into vertical column bands separated by full-height
 * whitespace gutters. Returns one band (the input) when the page is a single
 * column, or when it is too small to confidently segment.
 *
 * @param items  items of a SINGLE page
 */
export function segmentColumnBands(items: PositionedItem[]): PositionedItem[][] {
  // Too few items → not worth segmenting; a single block.
  if (items.length < 24) return [items];

  let minX = Infinity;
  let maxX = -Infinity;
  for (const it of items) {
    minX = Math.min(minX, itemLeft(it));
    maxX = Math.max(maxX, itemRight(it));
  }
  const pageWidth = maxX - minX;
  if (!Number.isFinite(pageWidth) || pageWidth <= 0) return [items];

  // Occupancy histogram along X (fine bins). On compte le NOMBRE d'items par
  // bin (densité), pas un simple booléen : un titre pleine largeur, un pied de
  // page ou un libellé qui déborde ne doivent PAS masquer une gouttière réelle.
  const BINS = 400;
  const binW = pageWidth / BINS;
  const binCount = new Uint16Array(BINS);
  for (const it of items) {
    const l = Math.max(0, Math.floor((itemLeft(it) - minX) / binW));
    const r = Math.min(BINS - 1, Math.floor((itemRight(it) - minX) / binW));
    for (let b = l; b <= r; b++) binCount[b]++;
  }

  // Nombre de lignes approximatif (Y distincts, tolérance verticale). Sert à
  // définir une gouttière comme un corridor de FAIBLE densité : quelques lignes
  // seulement le traversent (titre, ligne d'exemple TEG, libellé débordant),
  // vs une colonne réelle occupée par la majorité des lignes.
  const yKeys = new Set<number>();
  for (const it of items) yKeys.add(Math.round(it.y / 3));
  const approxRows = Math.max(1, yKeys.size);
  // Tolère jusqu'à ~10% des lignes traversant le corridor (titre/débordement).
  const gutterMaxCount = Math.max(1, Math.round(approxRows * 0.1));
  const isGutterBin = (b: number): boolean => binCount[b] <= gutterMaxCount;

  // Find interior gutters: maximal runs of LOW-DENSITY bins with real content on
  // BOTH sides. A gutter must be wide enough to be a real column separator and
  // not an ordinary intra-row cell gap.
  const MIN_GUTTER_FRAC = 0.03; // ≥ 3% of page width
  const minGutterBins = Math.max(3, Math.ceil((pageWidth * MIN_GUTTER_FRAC) / binW));

  const cutXs: number[] = [];
  let run = 0;
  let sawContentBefore = false;
  for (let b = 0; b < BINS; b++) {
    if (!isGutterBin(b)) {
      if (run >= minGutterBins && sawContentBefore) {
        // A qualifying gutter ends here → cut at its center — mais SEULEMENT si
        // ce qui suit est une nouvelle colonne de libellés (pas la colonne de
        // valeurs d'un simple gap libellé→valeur interne).
        const center = b - run / 2;
        const cutX = minX + center * binW;
        // `b` = premier bin de contenu APRÈS la gouttière → bord droit réel.
        const rightEdgeX = minX + b * binW;
        if (rightSideIsLabels(rightEdgeX, items, pageWidth)) {
          cutXs.push(cutX);
        }
      }
      run = 0;
      sawContentBefore = true;
    } else {
      run++;
    }
  }

  if (cutXs.length === 0) return [items];

  // Build band boundaries: [minX, cut1, cut2, ..., maxX].
  const bounds = [minX, ...cutXs, maxX];
  const bands: PositionedItem[][] = Array.from({ length: bounds.length - 1 }, () => []);
  for (const it of items) {
    const center = (itemLeft(it) + itemRight(it)) / 2;
    let band = 0;
    for (let i = 1; i < bounds.length - 1; i++) {
      if (center >= bounds[i]) band = i;
    }
    bands[band].push(it);
  }

  // Drop bands that are too sparse to be a real block (noise / page furniture),
  // and merge back if we ended up with a single meaningful band.
  const MIN_BAND_ITEMS = Math.max(8, Math.floor(items.length * 0.08));
  const kept = bands.filter((b) => b.length >= MIN_BAND_ITEMS);
  if (kept.length <= 1) return [items];
  return kept;
}
