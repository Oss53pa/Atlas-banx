// ============================================================================
// ATLASBANX — Segment & effective-period detector for conditions documents
// ============================================================================
// Bank tariff brochures publish one grid per clientèle segment and per
// application period. Both signals are usually right there in the file name
// and the first-page header, e.g.:
//
//   "CONDITIONS-DE-BANQUE-APPLICABLES-S2-2021_-PARTICULIERS_NSIA-BANQUE-CI.pdf"
//   header: "Tarifs des produits et services offerts à la clientèle des
//            Entreprises et Professionnels — applicables à partir de juillet 2021"
//
// We extract:
//   • segment       → particuliers | entreprises | associations
//   • effectiveDate → the date the grid takes effect (semester / month / date)
//
// Pure functions, no side effects — unit-tested in isolation.
// ============================================================================

import type { TariffSegment } from '../../types';
import { normalizeForMatch } from '../normalize';

export interface SegmentDetection {
  segment: TariffSegment | null;
  confidence: number;      // 0-1
  evidence: string;        // human-readable reason (for the UI / audit trail)
}

export interface PeriodDetection {
  effectiveDate: Date | null;
  /** Short label like "S2 2021" or "juillet 2021". */
  label: string | null;
  evidence: string;
}

// ─── Segment ────────────────────────────────────────────────────────────────
// Order matters: associations & professionnels are tested before the broad
// "entreprise"/"particulier" so a doc titled "Professionnels" isn't mislabelled.
const SEGMENT_PATTERNS: Array<{ segment: TariffSegment; re: RegExp; weight: number }> = [
  { segment: 'associations', re: /\b(association|associations|asso|ong|organisation non gouvernementale|but non lucratif)\b/, weight: 1 },
  { segment: 'entreprises',  re: /\b(entreprise|entreprises|professionnel|professionnels|pme|pmi|corporate|societe|sociétés|societes|personne morale|grandes entreprises)\b/, weight: 1 },
  { segment: 'particuliers', re: /\b(particulier|particuliers|personne physique|grand public|retail|clientele privee|clientèle privée)\b/, weight: 1 },
];

/**
 * Detect the clientèle segment from the file name and/or the document header
 * text. File-name hits are weighted highest (they are the most deliberate),
 * header hits next. Returns null when there is no clear signal.
 */
export function detectSegment(fileName?: string, headerText?: string): SegmentDetection {
  // Collapse every non-alphanumeric separator (_ - . / etc.) to a space so
  // \b word boundaries fire on file-name tokens like "…_PARTICULIERS_NSIA…".
  const tokenize = (s: string) => normalizeForMatch(s).replace(/[^a-z0-9]+/g, ' ');
  const nameN = tokenize(fileName ?? '');
  const headN = tokenize(headerText ?? '');

  // File name wins when it carries a segment token.
  for (const { segment, re } of SEGMENT_PATTERNS) {
    if (re.test(nameN)) {
      return { segment, confidence: 0.95, evidence: `Nom de fichier : « ${fileName} »` };
    }
  }
  // Otherwise look at the header. Count hits to disambiguate mixed headers.
  const counts = new Map<TariffSegment, number>();
  for (const { segment, re } of SEGMENT_PATTERNS) {
    const m = headN.match(new RegExp(re.source, 'g'));
    if (m) counts.set(segment, (counts.get(segment) ?? 0) + m.length);
  }
  if (counts.size > 0) {
    const [best] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return {
      segment: best[0],
      confidence: counts.size === 1 ? 0.85 : 0.65,
      evidence: `En-tête du document (${best[1]} occurrence${best[1] > 1 ? 's' : ''})`,
    };
  }
  return { segment: null, confidence: 0, evidence: 'Aucun indice de segment détecté' };
}

// ─── Effective period ────────────────────────────────────────────────────────
const MONTHS: Record<string, number> = {
  janvier: 0, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
  juillet: 6, aout: 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11,
};

/** UTC date builder (matches the app's UTC-safe date handling). */
function utc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

/**
 * Detect the date a grid takes effect from the file name / header. Recognises:
 *   • explicit dates      "01/07/2021", "2021-07-01"
 *   • "à partir de <mois> <année>"  → first day of that month
 *   • semesters           "S1-2021" → 01/01/2021, "S2 2021" → 01/07/2021
 *   • trimesters          "T3 2021" → 01/07/2021
 *   • bare year           "2021"    → 01/01/2021 (low confidence)
 */
export function detectEffectivePeriod(fileName?: string, headerText?: string): PeriodDetection {
  const hay = `${fileName ?? ''} ${headerText ?? ''}`;
  const hayN = normalizeForMatch(hay);

  // NB: we use digit lookarounds (?<!\d)/(?!\d) rather than \b — file names
  // glue tokens with underscores ("_01/07/2021", "S2-2021_", "_2023") where
  // \b fails because "_" is a word char.
  // 1. Explicit dd/mm/yyyy or dd-mm-yyyy
  const dmy = hay.match(/(?<!\d)(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?!\d)/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const day = +d, mon = +m - 1, year = +y;
    if (mon >= 0 && mon <= 11 && day >= 1 && day <= 31) {
      return { effectiveDate: utc(year, mon, day), label: `${d}/${m}/${y}`, evidence: `Date explicite : ${dmy[0]}` };
    }
  }
  // 2. ISO yyyy-mm-dd
  const iso = hay.match(/(?<!\d)(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)/);
  if (iso) {
    const year = +iso[1], mon = +iso[2] - 1, day = +iso[3];
    if (mon >= 0 && mon <= 11) {
      return { effectiveDate: utc(year, mon, day), label: iso[0], evidence: `Date ISO : ${iso[0]}` };
    }
  }
  // 3. "à partir de <mois> <année>" or just "<mois> <année>"
  const monthNames = Object.keys(MONTHS).join('|');
  const monthRe = new RegExp(`(?:a partir de\\s+|applicables?\\s+(?:a partir de\\s+|au\\s+)?)?\\b(${monthNames})\\s+(\\d{4})(?!\\d)`);
  const mMatch = hayN.match(monthRe);
  if (mMatch) {
    const mon = MONTHS[mMatch[1]];
    const year = +mMatch[2];
    return { effectiveDate: utc(year, mon, 1), label: `${mMatch[1]} ${year}`, evidence: `Mois d'entrée en vigueur : ${mMatch[1]} ${year}` };
  }
  // 4. Semester Sx-YYYY / Sx YYYY
  const sem = hayN.match(/(?<![a-z0-9])s\s?([12])\s?[-_ ]?\s?(\d{4})(?!\d)/);
  if (sem) {
    const semester = +sem[1];
    const year = +sem[2];
    const mon = semester === 1 ? 0 : 6; // S1 → janvier, S2 → juillet
    return { effectiveDate: utc(year, mon, 1), label: `S${semester} ${year}`, evidence: `Semestre : S${semester} ${year}` };
  }
  // 5. Trimester Tx-YYYY
  const tri = hayN.match(/(?<![a-z0-9])t\s?([1-4])\s?[-_ ]?\s?(\d{4})(?!\d)/);
  if (tri) {
    const q = +tri[1];
    const year = +tri[2];
    const mon = (q - 1) * 3;
    return { effectiveDate: utc(year, mon, 1), label: `T${q} ${year}`, evidence: `Trimestre : T${q} ${year}` };
  }
  // 6. Bare year (low confidence — start of year)
  const yr = hayN.match(/(?<!\d)(20\d{2})(?!\d)/);
  if (yr) {
    const year = +yr[1];
    return { effectiveDate: utc(year, 0, 1), label: `${year}`, evidence: `Année : ${year}` };
  }

  return { effectiveDate: null, label: null, evidence: 'Aucune période détectée' };
}
