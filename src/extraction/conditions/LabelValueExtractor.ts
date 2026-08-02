// ============================================================================
// ATLASBANX — Label-Value Extractor for Conditions documents
// ============================================================================
// For each visual row of the document, this module isolates:
//   • The rightmost numeric cluster → the value
//   • Everything to the left of it → the label
//
// Then it tracks "section headers" — rows that look like titles (no amount,
// taller font height, often in caps or bold) — and tags each pair with the
// most recent section so downstream matching can disambiguate similar labels
// between sections (e.g., "Tenue de compte" might appear under both
// "Particuliers" and "Entreprises").
// ============================================================================

import type { PositionedItem, ReconstructedRow } from '../bank-statement/types';
import { computeBoundingBox } from '../bank-statement/types';
import { findAmounts, parseAmount } from '../bank-statement/AmountParser';
import type { LabelValuePair } from './types';
import { clusterRowsFromItems } from '../bank-statement/HeaderDetector';
import { segmentColumnBands } from './columnBands';

/** Section number prefix at the start of a label (eg "10.1.2", "8.1") */
const SECTION_NUMBER_PREFIX = /^(?:\d+(?:\.\d+){1,5})\s+/;

/** Qualitative values commonly used in tariff grids. Order matters — the
 *  more specific patterns are tested first. */
const QUALITATIVE_PATTERNS: Array<{ q: NonNullable<LabelValuePair['qualitative']>; re: RegExp }> = [
  { q: 'gratuit',     re: /\b(gratuit|gratuite|gratuits|gratuites|sans\s*frais|free)\b/i },
  { q: 'neant',       re: /\bn[eé]ant\b/i },
  { q: 'franco',      re: /\bfranco\b/i },
  { q: 'souscription', re: /\b[aà]\s*la\s*souscription\b/i },
  { q: 'consulter',   re: /\bnous\s*consulter\b/i },
];

/** Strip a leading section number from a label, if present. */
function stripSectionNumber(label: string): string {
  return label.replace(SECTION_NUMBER_PREFIX, '').trim();
}

// ── Réparation OCR des chiffres ─────────────────────────────────────────────
// L'OCR confond fréquemment lettres et chiffres dans les montants ("5 O00",
// "l 250", "25.S00"). On corrige ces confusions — mais UNIQUEMENT à l'intérieur
// de tokens déjà « numériques » : contenant au moins un vrai chiffre et
// composés exclusivement de chiffres, séparateurs, signes et sosies connus.
// Un vrai libellé ("Compte", "Gratuit", "3D Secure") contient d'autres lettres
// → il n'est jamais numérique → jamais touché. La substitution est 1 char → 1
// char (longueur préservée), donc les index restent valides et le libellé est
// toujours découpé sur le texte ORIGINAL, jamais corrompu.
const OCR_DIGIT_LOOKALIKE: Record<string, string> = {
  O: '0', o: '0', Q: '0',
  I: '1', l: '1', '|': '1',
  Z: '2', z: '2',
  S: '5', s: '5',
  G: '6',
  B: '8',
};
const NUMERIC_SEP_CHARS = '.,+-()';

/** Un token est « numérique » s'il a ≥1 vrai chiffre, ≥2 caractères
 *  chiffre-ou-sosie, et AUCUN caractère hors {chiffres, sosies, séparateurs}. */
function isNumericishToken(tok: string): boolean {
  if (!/[0-9]/.test(tok)) return false;
  let digitLike = 0;
  for (const ch of tok) {
    if (ch >= '0' && ch <= '9') { digitLike++; continue; }
    if (ch in OCR_DIGIT_LOOKALIKE) { digitLike++; continue; }
    if (NUMERIC_SEP_CHARS.includes(ch)) continue;
    return false; // toute autre lettre → ce n'est pas un montant → on n'y touche pas
  }
  return digitLike >= 2;
}

/** Remplace les sosies de chiffres uniquement dans les tokens numériques.
 *  Longueur strictement préservée (index conservés). */
function repairNumericTokens(text: string): string {
  return text
    .split(/(\s+)/) // garde les blancs comme tokens → jointure exacte
    .map((tok) => {
      if (/^\s*$/.test(tok) || !isNumericishToken(tok)) return tok;
      return tok.replace(/./g, (ch) => OCR_DIGIT_LOOKALIKE[ch] ?? ch);
    })
    .join('');
}

/** Detect a qualitative value embedded in a row text. Returns null if none. */
function detectQualitative(text: string): NonNullable<LabelValuePair['qualitative']> | null {
  for (const { q, re } of QUALITATIVE_PATTERNS) {
    if (re.test(text)) return q;
  }
  return null;
}

/** Heuristic: a row is a section header if it has no parseable amount and
 *  looks like a title (≥1 word, height in upper percentile, often uppercase). */
function looksLikeSection(row: ReconstructedRow, allHeights: number[]): boolean {
  const fullText = row.items.map((i) => i.text).join(' ').trim();
  if (!fullText) return false;
  if (fullText.length < 4) return false;

  // Drop if any amount is detected
  if (findAmounts(fullText).length > 0) return false;

  // Title-like: short-ish, alpha-heavy, no punctuation patterns of regular text
  if (fullText.length > 80) return false;

  // Height percentile: a section header is typically larger than body text
  const avgHeight = row.items.reduce((s, i) => s + (i.height ?? 8), 0) / row.items.length;
  const sorted = [...allHeights].sort((a, b) => a - b);
  const p70 = sorted[Math.floor(sorted.length * 0.7)] ?? 0;
  const isTaller = avgHeight >= p70 * 1.05;

  // Or all-caps / mostly uppercase
  const letters = fullText.replace(/[^a-zA-ZÀ-ÿ]/g, '');
  const upperRatio = letters
    ? letters.split('').filter((c) => c === c.toUpperCase()).length / letters.length
    : 0;
  const isUpper = letters.length >= 3 && upperRatio >= 0.7;

  return isTaller || isUpper;
}

interface SplitResult {
  label: string;
  value: number;
  rawValue: string;
  unit?: LabelValuePair['unit'];
  confidence: number;
  qualitative?: LabelValuePair['qualitative'];
}

/** Detect a value at the right end of a row, OR a qualitative value
 *  ("Gratuit", "Nous consulter", etc.) anywhere in the row.
 *  Strategy: try numeric first (rightmost cluster = value). If no number,
 *  fall back to qualitative detection. */
function splitLabelValue(row: ReconstructedRow): SplitResult | null {
  const text = row.items.map((i) => i.text).join(' ').trim();
  // Réparation OCR des chiffres AVANT détection des montants. `scanText` a la
  // même longueur que `text` (les index coïncident) : on cherche le montant
  // dans `scanText` (chiffres corrigés) mais on découpe TOUJOURS le libellé
  // dans `text` (original, jamais corrompu).
  const scanText = repairNumericTokens(text);
  const amounts = findAmounts(scanText);

  // ─── Path A: numeric value present ────────────────────────────────────
  if (amounts.length > 0) {
    // Use the rightmost amount as the value
    const last = amounts[amounts.length - 1];
    const labelText = text.slice(0, last.start).trim();
    const trailing = text.slice(last.end).trim();

    // Strip section number prefix + dotted/dashed leaders + trailing punct
    let cleanLabel = stripSectionNumber(labelText);
    cleanLabel = cleanLabel.replace(/[.…\s\-:]+$/, '').trim();
    if (cleanLabel.length < 2) return null;

    // Reject "labels" that are 100% digits — these are stray sub-amounts
    if (/^\d+([.,]\d+)?$/.test(cleanLabel)) return null;

    const parsed = parseAmount(last.raw);
    if (!parsed) return null;

    let unit: LabelValuePair['unit'] | undefined;
    const combined = `${last.raw} ${trailing}`.toLowerCase();
    if (/%|pour\s*cent|p\.cent/.test(combined)) unit = '%';
    else if (/fcfa|xaf|xof|f\s*cfa/.test(combined)) {
      unit = parsed.currency === 'XAF' ? 'XAF' : 'FCFA';
    } else if (/eur|€/.test(combined)) unit = 'EUR';
    else if (/usd|\$/.test(combined)) unit = 'USD';
    else if (/jours?|days?/.test(combined)) unit = 'days';
    else if (parsed.currency) {
      if (parsed.currency === 'XAF' || parsed.currency === 'XOF') unit = parsed.currency;
      else if (parsed.currency === 'EUR' || parsed.currency === 'USD') unit = parsed.currency;
    }

    return {
      label: cleanLabel,
      value: Math.abs(parsed.value),
      rawValue: last.raw,
      unit,
      confidence: parsed.confidence,
    };
  }

  // ─── Path B: qualitative value (no number, but a known phrase) ────────
  const qualitative = detectQualitative(text);
  if (qualitative) {
    // The label is everything except the qualitative phrase. Strip the
    // matched phrase + section number prefix.
    let label = text;
    for (const { re } of QUALITATIVE_PATTERNS) {
      label = label.replace(re, '');
    }
    label = stripSectionNumber(label).replace(/[.…\s\-:]+$/, '').trim();
    if (label.length < 2) return null;
    if (/^\d+([.,]\d+)?$/.test(label)) return null;

    const phraseMatch =
      QUALITATIVE_PATTERNS.find((p) => p.q === qualitative)?.re.exec(text)?.[0] ?? '';

    return {
      label,
      value: 0,
      rawValue: phraseMatch.trim(),
      confidence: 0.8, // qualitative match is reliable
      qualitative,
    };
  }

  return null;
}

/**
 * Reconstruct label/value pairs from an ordered list of visual rows on one
 * page (or one column band). Section headers encountered along the way are
 * appended to `sections` and tagged onto subsequent pairs.
 */
function pairsFromRows(
  rows: ReconstructedRow[],
  page: number,
  allHeights: number[],
  sections: string[],
): LabelValuePair[] {
  const pairs: LabelValuePair[] = [];
  let currentSection: string | undefined;

  for (const row of rows) {
    const split = splitLabelValue(row);

    if (!split) {
      // Maybe a section header
      if (looksLikeSection(row, allHeights)) {
        const text = row.items.map((i) => i.text).join(' ').trim();
        currentSection = text;
        if (!sections.includes(text)) sections.push(text);
      }
      continue;
    }

    pairs.push({
      label: split.label,
      rawValue: split.rawValue,
      value: split.value,
      unit: split.unit,
      qualitative: split.qualitative,
      confidence: split.confidence,
      page,
      y: row.y,
      section: currentSection,
      boundingBox: computeBoundingBox(row.items),
    });
  }

  return pairs;
}

export function extractLabelValuePairs(
  items: PositionedItem[],
  totalPages: number,
): { pairs: LabelValuePair[]; sections: string[] } {
  const pairs: LabelValuePair[] = [];
  const sections: string[] = [];

  // Compute global height percentile (used by section detection)
  const allHeights = items.map((i) => i.height ?? 8);

  for (let p = 1; p <= totalPages; p++) {
    const pageItems = items.filter((it) => it.page === p);
    if (pageItems.length === 0) continue;

    // ── Single-column baseline: cluster rows across the whole page ────────
    const baselineSections: string[] = [];
    const baselineRows = clusterRowsFromItems(pageItems, p, 3);
    const baselinePairs = pairsFromRows(baselineRows, p, allHeights, baselineSections);

    // ── Multi-column attempt: segment into vertical bands, cluster rows
    //    WITHIN each band, and extract per band. Only adopt this if it yields
    //    strictly MORE pairs — a wrong split can never win (it strands numbers
    //    without labels / labels without numbers, both → 0 pairs).
    const bands = segmentColumnBands(pageItems);
    let chosenPairs = baselinePairs;
    let chosenSections = baselineSections;

    if (bands.length > 1) {
      const bandSections: string[] = [];
      const bandPairs: LabelValuePair[] = [];
      // Process bands left-to-right for stable section ordering.
      const orderedBands = [...bands].sort(
        (a, b) => Math.min(...a.map((i) => i.x)) - Math.min(...b.map((i) => i.x)),
      );
      for (const band of orderedBands) {
        const rows = clusterRowsFromItems(band, p, 3);
        bandPairs.push(...pairsFromRows(rows, p, allHeights, bandSections));
      }
      if (bandPairs.length > baselinePairs.length) {
        chosenPairs = bandPairs;
        chosenSections = bandSections;
      }
    }

    pairs.push(...chosenPairs);
    for (const s of chosenSections) if (!sections.includes(s)) sections.push(s);
  }

  return { pairs, sections };
}
