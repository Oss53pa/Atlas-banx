// ============================================================================
// ATLASBANX — PDF bank statement extractor (generic, position-aware)
// ============================================================================
// Multi-strategy extractor that works on ANY bank format because it doesn't
// assume specific column orders or labels — it discovers the table structure
// from the document itself.
//
// Pipeline:
//   1. Read PDF with pdfjs → items[] with X/Y per page
//   2. Cluster items into rows by similar Y (per page)
//   3. Detect the header row (free text "Débit / Crédit / Solde / Date" etc.)
//   4. Snap each content row to columns using the header's X bounds
//   5. Merge multi-line transactions (rows without a date in date column
//      fold into the previous row)
//   6. Build ExtractedTransaction per row with confidence + warnings
//   7. If header detection fails OR yields 0 transactions, run the legacy
//      free-text strategy as a fallback (handles formats with no clear table)
//   8. If still empty AND PDF is image-based, OCR the pages and retry
// ============================================================================

import { pdfjsLib } from '../../services/pdfjsWorker';
import { OcrService } from '../../services/OcrService';
import { itemsToTransactions, strategyFreeText, finalize } from './itemsToTransactions';
import type {
  ExtractionOptions,
  ExtractionResult,
  PositionedItem,
} from './types';

const DEFAULT_OPTS: Required<Omit<ExtractionOptions, 'onProgress' | 'bankCode'>> = {
  forceOcr: false,
  skipOcr: false,
  defaultCurrency: 'XOF',
  rowYTolerance: 3,
};

/**
 * OCR position-aware : rend chaque page en image ~400 DPI (échelle adaptée à
 * la taille de page, plafonnée pour la mémoire) et récupère les VRAIES bbox
 * par mot. Convertit l'origine Tesseract (haut-gauche) vers l'origine pdfjs
 * (bas-gauche) pour rester cohérent avec le clustering de lignes/colonnes.
 * Renvoie [] si l'OCR ne fournit aucune boîte (repli texte libre géré ailleurs).
 */
async function ocrPositionedItems(
  pdf: Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>,
  warnings: string[],
  onProgress?: ExtractionOptions['onProgress'],
): Promise<PositionedItem[]> {
  const out: PositionedItem[] = [];
  const TARGET_OCR_WIDTH_PX = 3200; // ~400 DPI sur une page A4 (595 pt)
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const baseWidth = page.getViewport({ scale: 1 }).width || 595;
    const ocrScale = Math.min(6, Math.max(3, TARGET_OCR_WIDTH_PX / baseWidth));
    const viewport = page.getViewport({ scale: ocrScale });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));

    let ocr: Awaited<ReturnType<typeof OcrService.recognizeImageWithBboxes>> | null = null;
    try {
      ocr = await OcrService.recognizeImageWithBboxes(blob);
    } catch (err) {
      warnings.push(`OCR page ${p} échoué : ${err instanceof Error ? err.message : 'erreur'}`);
    }
    if (ocr && ocr.words.length > 0) {
      const H = canvas.height;
      for (const w of ocr.words) {
        const text = (w.text ?? '').trim();
        if (!text) continue;
        const { x0, y0, x1, y1 } = w.bbox;
        out.push({ text, page: p, x: x0, y: H - y0, width: Math.max(1, x1 - x0), height: Math.max(1, y1 - y0) });
      }
    }
    onProgress?.({ stage: 'ocr', pct: p / pdf.numPages, message: `OCR page ${p}/${pdf.numPages}` });
  }
  return out;
}

/**
 * Main entry point. Extracts transactions from a bank statement PDF.
 */
export async function extractStatement(
  file: File,
  options: ExtractionOptions = {},
): Promise<ExtractionResult> {
  const start = performance.now();
  const opts = { ...DEFAULT_OPTS, ...options };
  const warnings: string[] = [];

  options.onProgress?.({ stage: 'load', pct: 0, message: 'Lecture du PDF...' });

  // ─── 1. Read PDF with positions ────────────────────────────────────────
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let items: PositionedItem[] = [];
  let totalChars = 0;

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    for (const it of tc.items) {
      if (!('str' in it)) continue;
      const text = (it as { str: string }).str;
      if (!text || !text.trim()) continue;
      const transform = (it as { transform?: number[] }).transform;
      const x = transform?.[4] ?? 0;
      const y = transform?.[5] ?? 0;
      const width = (it as { width?: number }).width ?? text.length * 4;
      const height = (it as { height?: number }).height ?? 8;
      items.push({ text, page: p, x, y, width, height });
      totalChars += text.length;
    }
    options.onProgress?.({
      stage: 'load',
      pct: p / pdf.numPages,
      message: `Lecture page ${p}/${pdf.numPages}`,
    });
  }

  // ─── 1b. Decide if we need OCR ────────────────────────────────────────
  const avgPerPage = totalChars / Math.max(1, pdf.numPages);
  const needsOcr = opts.forceOcr || (!opts.skipOcr && avgPerPage < 50);

  if (needsOcr) {
    warnings.push('PDF scanné détecté — OCR positions réelles (~400 DPI)');
    options.onProgress?.({ stage: 'ocr', pct: 0, message: 'OCR en cours...' });
    // Nouveau : OCR avec bbox par mot à haute résolution → items positionnés,
    // qui repassent par la MÊME détection de tableau (colonnes) que le texte
    // natif. Bien meilleur qu'un OCR texte + stratégie « texte libre » qui perd
    // l'alignement des colonnes.
    const ocrItems = await ocrPositionedItems(pdf, warnings, options.onProgress);
    if (ocrItems.length > 0) {
      items = ocrItems;
    } else {
      // Dernier repli : OCR texte simple (sans positions) → texte libre.
      const ocrResult = await OcrService.recognizePdf(file);
      if (ocrResult.success) {
        const tx = strategyFreeText(
          ocrResult.text.split('\n').map((l) => l.trim()).filter(Boolean),
          opts,
        );
        return finalize(tx, {
          totalPages: pdf.numPages,
          itemCount: items.length,
          rowCount: 0,
          headerDetected: false,
          headerConfidence: 0,
          ocrUsed: true,
          durationMs: Math.round(performance.now() - start),
        }, warnings, opts, !tx.length ? 'Le moteur OCR n\'a pas trouvé de tableau de transactions. Le document est peut-être de mauvaise qualité.' : undefined);
      }
      warnings.push(`Échec OCR: ${ocrResult.error}`);
    }
  }

  // ─── 1c → 4. Cœur PUR partagé : items positionnés → transactions ──────
  // (normalisation pipe-table, détection de tableau, reconstruction de lignes,
  // build + repli texte libre, finalize). Même code côté serveur (express-audit).
  return itemsToTransactions(items, pdf.numPages, opts, warnings, {
    ocrUsed: needsOcr,
    startMs: start,
    onProgress: options.onProgress,
  });
}
