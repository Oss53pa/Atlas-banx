// ============================================================================
// ATLASBANX — Cœur PUR d'extraction : items positionnés → transactions
// ============================================================================
// Partie DÉTERMINISTE et SANS dépendance navigateur (ni pdfjs, ni OCR, ni
// canvas) du pipeline d'extraction de relevés : à partir d'items texte
// positionnés (X/Y par page), détecte le tableau, reconstruit les lignes et
// bâtit les transactions. Factorisé pour être partagé entre :
//   - le client (PdfStatementExtractor : pdfjs + OCR → items → CE cœur) ;
//   - le SERVEUR (Edge express-audit : pdfjs texte natif → items → CE cœur),
//     bundlé via expressServerEntry → audit-core.mjs.
// ============================================================================

import { clusterRows, detectTableStructure } from './HeaderDetector';
import { filterNoise, mergeMultilineTransactions, snapRowToColumns } from './RowReconstructor';
import { buildTransaction } from './TransactionBuilder';
import { findAmounts, parseAmount } from './AmountParser';
import { explodePipeDelimitedItems } from './PipeTableNormalizer';
import type {
  ExtractedTransaction,
  ExtractionOptions,
  ExtractionResult,
  PositionedItem,
  TableStructure,
} from './types';
import type { Transaction } from '../../types';
import { TransactionType } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export type ItemsToTxOpts = {
  defaultCurrency: string;
  rowYTolerance: number;
};

/**
 * Transforme des items positionnés en résultat d'extraction (transactions +
 * candidats + stats). `ocrUsed` renseigne seulement les stats (le cœur ne fait
 * pas d'OCR lui-même). `onProgress` est optionnel (no-op côté serveur).
 */
export function itemsToTransactions(
  rawItems: PositionedItem[],
  numPages: number,
  opts: ItemsToTxOpts,
  warnings: string[] = [],
  meta: { ocrUsed?: boolean; startMs?: number; onProgress?: ExtractionOptions['onProgress'] } = {},
): ExtractionResult {
  const start = meta.startMs ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const onProgress = meta.onProgress;

  // ─── Normalize mainframe "pipe-table" formats (« ! » / « | ») ────────────
  const items = explodePipeDelimitedItems(rawItems);

  // ─── Strategy A: position-aware table detection ──────────────────────────
  onProgress?.({ stage: 'detect', pct: 0.5, message: 'Détection du tableau...' });

  let bestStructure: TableStructure | null = null;
  for (let p = 1; p <= numPages; p++) {
    const rowsOnPage = clusterRows(items, p, opts.rowYTolerance);
    const struct = detectTableStructure(rowsOnPage);
    if (struct && (!bestStructure || struct.confidence > bestStructure.confidence)) {
      bestStructure = struct;
    }
    if (bestStructure && bestStructure.confidence > 0.85) break;
  }

  let candidates: ExtractedTransaction[] = [];

  if (bestStructure && bestStructure.confidence >= 0.4) {
    onProgress?.({
      stage: 'extract',
      pct: 0.7,
      message: `Tableau détecté (${Math.round(bestStructure.confidence * 100)}% confiance, ${bestStructure.columns.length} colonnes)`,
    });

    const allRows = [];
    for (let p = 1; p <= numPages; p++) {
      const pageRows = clusterRows(items, p, opts.rowYTolerance);
      allRows.push(...pageRows);
    }

    const mapped = allRows.map((r) => snapRowToColumns(r, bestStructure!));
    const filtered = filterNoise(mapped, bestStructure);
    const merged = mergeMultilineTransactions(filtered);

    for (const row of merged) {
      const tx = buildTransaction(row, bestStructure);
      if (tx) candidates.push(tx);
    }
  }

  // ─── Fallback: free-text strategy ────────────────────────────────────────
  if (candidates.length === 0) {
    warnings.push('Détection de tableau infructueuse, basculement sur extraction texte libre');
    const lineMap = new Map<string, string[]>();
    for (const it of items) {
      const key = `${it.page}|${Math.round(it.y / 5) * 5}`;
      if (!lineMap.has(key)) lineMap.set(key, []);
      lineMap.get(key)!.push(it.text);
    }
    const lines = Array.from(lineMap.entries())
      .sort((a, b) => {
        const [pa, ya] = a[0].split('|').map(Number);
        const [pb, yb] = b[0].split('|').map(Number);
        if (pa !== pb) return pa - pb;
        return yb - ya;
      })
      .map(([, parts]) => parts.join(' ').trim())
      .filter((l) => l.length > 0);

    candidates = strategyFreeText(lines, opts);
  }

  return finalize(
    candidates,
    {
      totalPages: numPages,
      itemCount: items.length,
      rowCount: 0,
      headerDetected: !!bestStructure,
      headerConfidence: bestStructure?.confidence ?? 0,
      ocrUsed: !!meta.ocrUsed,
      durationMs: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start),
    },
    warnings,
    opts,
    candidates.length === 0
      ? 'Aucune transaction détectable. Le format du relevé n\'est peut-être pas un tableau standard.'
      : undefined,
  );
}

// ============================================================================
// Strategy: free-text fallback (no positions)
// ============================================================================

const DATE_LINE = /^\s*(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})\b/;

export function strategyFreeText(
  lines: string[],
  opts: { defaultCurrency: string },
): ExtractedTransaction[] {
  const transactions: ExtractedTransaction[] = [];

  const grouped: string[] = [];
  for (const line of lines) {
    if (DATE_LINE.test(line) || grouped.length === 0) {
      grouped.push(line);
    } else {
      grouped[grouped.length - 1] += ' ' + line;
    }
  }

  for (const line of grouped) {
    const dateMatch = line.match(DATE_LINE);
    if (!dateMatch) continue;

    const rest = line.replace(/^\s*(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}(?:\s+\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})?)\s*/, '');

    const amounts = findAmounts(rest);
    if (amounts.length === 0) continue;

    const lastAmounts = amounts.slice(-3);
    const firstFeeAmt = lastAmounts[0];
    const description = rest.slice(0, firstFeeAmt.start).trim();

    let txAmount = 0;
    let balance: number | undefined;
    if (lastAmounts.length >= 2) {
      const txParsed = parseAmount(lastAmounts[lastAmounts.length - 2].raw);
      const balParsed = parseAmount(lastAmounts[lastAmounts.length - 1].raw);
      if (txParsed) txAmount = txParsed.value;
      if (balParsed) balance = balParsed.value;
    } else {
      const onlyParsed = parseAmount(lastAmounts[0].raw);
      if (onlyParsed) txAmount = onlyParsed.value;
    }

    const lower = description.toLowerCase();
    if (txAmount > 0 && /retrait|prelev|cheque|frais|commission|virement\s*emis|debit|virt\s+w/i.test(lower)) {
      txAmount = -Math.abs(txAmount);
    } else if (txAmount > 0 && /versement|depot|virement\s*recu|credit|interets\s*credit/i.test(lower)) {
      txAmount = Math.abs(txAmount);
    }

    transactions.push({
      date: parseDateLoose(dateMatch[1]) ?? undefined,
      description,
      amount: txAmount,
      balance,
      currency: opts.defaultCurrency,
      multiline: false,
      confidence: 0.55,
      warnings: ['Extraction sans positions — confiance réduite'],
    });
  }

  return transactions;
}

export function parseDateLoose(s: string): Date | null {
  const m = s.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (!m) return null;
  let dd = parseInt(m[1], 10);
  let mm = parseInt(m[2], 10);
  let yy = parseInt(m[3], 10);
  if (yy < 100) yy = yy >= 50 ? 1900 + yy : 2000 + yy;
  if (mm > 12 && dd <= 12) [dd, mm] = [mm, dd];
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const d = new Date(Date.UTC(yy, mm - 1, dd));
  if (isNaN(d.getTime())) return null;
  if (d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== dd) return null;
  return d;
}

// ============================================================================
// Finalization — convert ExtractedTransaction[] into domain Transaction[]
// ============================================================================

export function finalize(
  candidates: ExtractedTransaction[],
  stats: {
    totalPages: number;
    itemCount: number;
    rowCount: number;
    headerDetected: boolean;
    headerConfidence: number;
    ocrUsed: boolean;
    durationMs: number;
  },
  warnings: string[],
  opts: { defaultCurrency: string },
  diagnostic?: string,
): ExtractionResult {
  const transactions: Transaction[] = candidates
    .filter((c) => c.date && c.amount !== 0)
    .map((c) => ({
      id: uuidv4(),
      date: c.date!,
      valueDate: c.valueDate ?? c.date!,
      amount: c.amount,
      description: c.description || 'Transaction',
      reference: c.reference ?? '',
      type: c.amount < 0 ? TransactionType.DEBIT : TransactionType.CREDIT,
      bankCode: '',
      accountId: '',
      clientId: '',
      balance: c.balance,
      currency: c.currency || opts.defaultCurrency,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as unknown as Transaction[];

  const avgConf =
    candidates.length === 0
      ? 0
      : candidates.reduce((s, c) => s + c.confidence, 0) / candidates.length;

  return {
    success: transactions.length > 0,
    transactions,
    candidates,
    stats: {
      ...stats,
      rowCount: candidates.length,
      transactionCount: transactions.length,
      averageConfidence: avgConf,
    },
    warnings,
    diagnostic,
  };
}
