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

/** X interval covered by an item. */
function itemLeft(it: PositionedItem): number {
  return it.x;
}
function itemRight(it: PositionedItem): number {
  return it.x + (it.width ?? Math.max(4, it.text.length * 4));
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

  // Occupancy histogram along X (fine bins).
  const BINS = 400;
  const binW = pageWidth / BINS;
  const occupied = new Uint8Array(BINS);
  for (const it of items) {
    const l = Math.max(0, Math.floor((itemLeft(it) - minX) / binW));
    const r = Math.min(BINS - 1, Math.floor((itemRight(it) - minX) / binW));
    for (let b = l; b <= r; b++) occupied[b] = 1;
  }

  // Find interior gutters: maximal runs of empty bins with occupied content on
  // BOTH sides. A gutter must be wide enough to be a real column separator and
  // not an ordinary intra-row cell gap.
  const MIN_GUTTER_FRAC = 0.03; // ≥ 3% of page width
  const minGutterBins = Math.max(3, Math.ceil((pageWidth * MIN_GUTTER_FRAC) / binW));

  const cutXs: number[] = [];
  let run = 0;
  let sawContentBefore = false;
  for (let b = 0; b < BINS; b++) {
    if (occupied[b]) {
      if (run >= minGutterBins && sawContentBefore) {
        // A qualifying gutter ends here → cut at its center.
        const center = b - run / 2;
        cutXs.push(minX + center * binW);
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
