// ============================================================================
// ATLASBANX — Row reconstructor
// ============================================================================
// Once the table structure is known, this module:
//   1. Snaps each item to the column whose [xLeft, xRight] bounds it falls into
//   2. Concatenates same-column items into a single cell text
//   3. Merges multi-line transactions: a row WITHOUT a date in its date column
//      is treated as a continuation of the previous logical transaction.
// ============================================================================

import type {
  ColumnRole,
  MappedRow,
  PositionedItem,
  ReconstructedRow,
  TableStructure,
} from './types';

const DATE_LIKE = /\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/;

/**
 * Snap a row's items to the columns of the table structure.
 * Items whose center X lies between [xLeft, xRight) are assigned to that column.
 * If an item falls outside any column, it's appended to the nearest one.
 */
export function snapRowToColumns(
  row: ReconstructedRow,
  structure: TableStructure,
): MappedRow {
  const cells: Partial<Record<ColumnRole, string[]>> = {};
  const cols = structure.columns;

  for (const item of row.items) {
    const centerX = item.x + (item.width ?? 0) / 2;
    let col = cols.find((c) => centerX >= c.xLeft && centerX < c.xRight);
    if (!col) {
      // Snap to nearest column (left or right edge)
      let bestDist = Infinity;
      for (const c of cols) {
        const d = Math.min(Math.abs(centerX - c.xLeft), Math.abs(centerX - c.xRight));
        if (d < bestDist) {
          bestDist = d;
          col = c;
        }
      }
    }
    if (!col) continue;
    if (!cells[col.role]) cells[col.role] = [];
    cells[col.role]!.push(item.text);
  }

  const flat: Partial<Record<ColumnRole, string>> = {};
  for (const [role, parts] of Object.entries(cells) as [ColumnRole, string[]][]) {
    flat[role] = parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  return {
    page: row.page,
    y: row.y,
    cells: flat,
    items: row.items,
  };
}

/**
 * Merge logically-multiline transactions. A row whose `date` cell does NOT
 * contain a date pattern is fused into the most recent row that DID have one.
 * Description, reference, and other text columns are concatenated.
 *
 * This handles bank formats like NSIA where one transaction spans 2-5 visual
 * rows (cheque details, beneficiary, issuer bank, etc.).
 */
export function mergeMultilineTransactions(rows: MappedRow[]): MappedRow[] {
  const merged: MappedRow[] = [];
  for (const row of rows) {
    const dateCell = row.cells.date ?? '';
    const hasDate = DATE_LIKE.test(dateCell);
    const last = merged[merged.length - 1];

    // First row OR row with a fresh date → start a new transaction
    if (!last || hasDate) {
      merged.push({ ...row, cells: { ...row.cells } });
      continue;
    }

    // Continuation — fold this row into the previous one
    for (const role of Object.keys(row.cells) as ColumnRole[]) {
      const value = row.cells[role];
      if (!value) continue;

      // Concatenate descriptive columns; for amount columns keep the first
      // non-empty value (banks rarely split amounts across lines)
      if (
        role === 'description' ||
        role === 'reference' ||
        role === 'type' ||
        role === 'unknown'
      ) {
        last.cells[role] = (last.cells[role] ? last.cells[role] + ' ' : '') + value;
      } else if (!last.cells[role]) {
        last.cells[role] = value;
      }
    }
    last.items.push(...row.items);
  }
  return merged;
}

/**
 * Motifs de "chrome" de relevé qui ne sont jamais des transactions : en-têtes
 * de page répétés, titres de section, lignes de totaux. Sur les relevés
 * multi-pages (NSIA Banque CI & co), ce bloc d'en-tête se répète en haut de
 * CHAQUE page ; sans ce filtre il fuit comme une fausse transaction (la date
 * de période sert d'ancre, le numéro de page tombe en colonne montant →
 * sur-comptage). Ces motifs n'apparaissent pas dans un libellé d'opération
 * réel (VIREMENT, CHEQUE, FRAIS, Benef:, Tireur, Bq Emet:, …).
 */
const STATEMENT_CHROME_PATTERNS: RegExp[] = [
  /historique\s+des\s+mouvements/i,   // titre du relevé
  /compte\s+n[o°]\s*\.{0,4}\s*:/i,    // "Compte No ..:"
  /n[o°]\s+client\s*\.{0,4}\s*:/i,    // "No Client ..:"
  /agence\s*\.{2,}\s*:/i,             // "Agence ......:"
  /\bpage\s*:\s*\d+/i,                // "Page : 3"
  /\bdate\s*\.{3,}/i,                 // "Date ........: 29 Janvier"
  /dev\s+chap/i,                      // en-tête "Age Dev Chap. Compte Nom Intitule"
  /\bintitule\b/i,                    // même en-tête
  /date\s+compta/i,                   // en-tête de colonnes répété
  /^total\b/i,                        // "Total", "Total mouvements"
];

/**
 * Filter rows that are clearly NOT transactions:
 *   - the page header / sub-header (repeated on every page)
 *   - "Page X sur Y" markers
 *   - the totals row at the bottom ("Total mouvements" + 2 amounts)
 *   - opening/closing balance lines ("Solde au …")
 *   - rows above the header on the header page
 */
export function filterNoise(
  rows: MappedRow[],
  structure: TableStructure,
): MappedRow[] {
  return rows.filter((row) => {
    if (row.page === structure.headerPage && row.y >= structure.headerY) {
      // On the header page, skip rows above and including the header line
      return false;
    }

    const allText = Object.values(row.cells).join(' ').toLowerCase();
    if (!allText) return false;
    const trimmed = allText.trim();
    if (/^page\s+\d+\s+(sur|of|de)\s+\d+$/i.test(trimmed)) return false;
    if (/^solde\s+(initial|final|au|precedent|nouveau|debiteur|crediteur)/i.test(trimmed)) return false;
    if (STATEMENT_CHROME_PATTERNS.some((re) => re.test(allText))) return false;
    return true;
  });
}

// Re-export for convenience
export type { PositionedItem, ReconstructedRow, MappedRow, TableStructure };
