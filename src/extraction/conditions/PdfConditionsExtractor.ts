// ============================================================================
// ATLASBANX — Generic position-aware Conditions extractor
// ============================================================================
// Pipeline:
//   1. Read PDF with pdfjs → items[] with X/Y per page (OCR fallback for
//      scanned docs)
//   2. Extract label-value pairs row by row using positions
//      (LabelValueExtractor)
//   3. Match each pair to the best-fitting FieldDefinition in the registry
//      (RubricMatcher)
//   4. Return a result with the best match per rubric, all raw pairs
//      (for diagnostic UI), section headers, and stats.
//
// Works on any bank format because:
//   • No hardcoded column positions
//   • No bank-specific patterns required
//   • Generic label-similarity + unit/range sanity checks
//   • Section context disambiguation
// ============================================================================

import { pdfjsLib } from '../../services/pdfjsWorker';
import { OcrService } from '../../services/OcrService';
import type { PositionedItem } from '../bank-statement/types';
import { extractLabelValuePairs } from './LabelValueExtractor';
import { matchRubrics } from './RubricMatcher';
import { detectSegment, detectEffectivePeriod } from './segmentDetector';
import type { ConditionsExtractionResult } from './types';

export interface ConditionsExtractionOptions {
  /** Force OCR even with a text layer */
  forceOcr?: boolean;
  /** Skip OCR entirely (faster but fails on scans) */
  skipOcr?: boolean;
  /** Bank code hint (used by future per-bank templates) */
  bankCode?: string;
  onProgress?: (p: { stage: string; pct: number; message: string }) => void;
}

export async function extractConditions(
  file: File,
  options: ConditionsExtractionOptions = {},
): Promise<ConditionsExtractionResult> {
  // Fichier IMAGE → pipeline OCR position-aware dédié (pas de pdfjs).
  if (isImageFile(file)) {
    return extractConditionsFromImage(file, options);
  }

  const start = performance.now();
  const warnings: string[] = [];

  options.onProgress?.({ stage: 'load', pct: 0, message: 'Lecture du PDF...' });

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const items: PositionedItem[] = [];
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

  // OCR fallback if the PDF has no text layer
  const avgPerPage = totalChars / Math.max(1, pdf.numPages);
  const needsOcr = options.forceOcr || (!options.skipOcr && avgPerPage < 50);

  if (needsOcr) {
    warnings.push('PDF scanné détecté — extraction par OCR (positions limitées)');
    options.onProgress?.({ stage: 'ocr', pct: 0, message: 'OCR en cours...' });

    // For scanned conditions docs we OCR each page and use the REAL word
    // bounding boxes returned by Tesseract → accurate X/Y per word. This lets
    // the column-band segmentation and the "rightmost amount = value" heuristic
    // work on scans exactly like on native-text PDFs. Only if the engine
    // returns no word boxes do we fall back to a crude line-by-index synthesis.
    items.length = 0;
    // Résolution OCR : on VISE ~400 DPI en pixels de sortie (glyphes nets même
    // sur les grilles tarifaires denses / vectorisées — type NSIA). À scale=3
    // (≈216 DPI) l'OCR d'un scan A4 dense était illisible (conf ~34%) ; à
    // ~400 DPI la confiance monte à ~78%. On adapte l'échelle à la taille de
    // page (grande page → échelle moindre) et on plafonne pour la mémoire :
    // un canvas trop grand échoue silencieusement (limites navigateur).
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
        // Tesseract : origine haut-gauche (y croît vers le bas). pdfjs +
        // clusterRowsFromItems : origine bas-gauche (y plus grand = plus haut).
        // On inverse Y avec la hauteur du canvas pour rester cohérent.
        const H = canvas.height;
        for (const w of ocr.words) {
          const text = (w.text ?? '').trim();
          if (!text) continue;
          const { x0, y0, x1, y1 } = w.bbox;
          items.push({
            text,
            page: p,
            x: x0,
            y: H - y0,
            width: Math.max(1, x1 - x0),
            height: Math.max(1, y1 - y0),
          });
        }
      } else if (ocr) {
        // Repli : aucune bbox → synthèse par ligne (positions approximatives).
        const lines = ocr.text.split('\n');
        const lineHeight = 12;
        const charWidth = 5;
        lines.forEach((line, lineIdx) => {
          const y = (lines.length - lineIdx) * lineHeight; // top-to-bottom → big Y first
          let x = 0;
          for (const word of line.split(/\s+/)) {
            if (!word) continue;
            items.push({
              text: word,
              page: p,
              x,
              y,
              width: word.length * charWidth,
              height: lineHeight,
            });
            x += (word.length + 1) * charWidth;
          }
        });
      }

      options.onProgress?.({
        stage: 'ocr',
        pct: p / pdf.numPages,
        message: `OCR page ${p}/${pdf.numPages}`,
      });
    }
  }

  return buildConditionsResult(items, file, warnings, options, pdf.numPages, start);
}

/** Post-traitement commun (PDF & image) : items positionnés → paires →
 *  rubriques → segment/période → stats. */
function buildConditionsResult(
  items: PositionedItem[],
  file: File,
  warnings: string[],
  options: ConditionsExtractionOptions,
  numPages: number,
  start: number,
): ConditionsExtractionResult {
  options.onProgress?.({ stage: 'pairs', pct: 0.6, message: 'Extraction des paires label/valeur...' });

  const { pairs, sections } = extractLabelValuePairs(items, numPages);

  options.onProgress?.({
    stage: 'match',
    pct: 0.85,
    message: `${pairs.length} paires détectées, mise en correspondance...`,
  });

  const { matches } = matchRubrics(pairs);
  const matchedFields = Object.keys(matches);
  const avgConf =
    matchedFields.length === 0
      ? 0
      : matchedFields.reduce((s, k) => s + matches[k].confidence, 0) / matchedFields.length;

  const matchedPairKeys = new Set<string>();
  for (const m of Object.values(matches)) {
    matchedPairKeys.add(`${m.pair.page}-${Math.round(m.pair.y)}-${m.pair.label}`);
  }
  const unmatchedPairs = pairs.filter(
    (p) => !matchedPairKeys.has(`${p.page}-${Math.round(p.y)}-${p.label}`),
  );

  const headerText = items
    .filter((it) => it.page === 1)
    .map((it) => it.text)
    .join(' ')
    .slice(0, 3000);
  const seg = detectSegment(file.name, headerText);
  const period = detectEffectivePeriod(file.name, headerText);
  if (seg.segment) warnings.push(`Segment détecté : ${seg.segment} (${seg.evidence})`);
  if (period.effectiveDate) warnings.push(`Période détectée : ${period.label} (${period.evidence})`);

  options.onProgress?.({
    stage: 'done',
    pct: 1,
    message: `${matchedFields.length} rubriques identifiées sur ${pairs.length} paires (${unmatchedPairs.length} non rattachées)`,
  });

  return {
    matches,
    rawPairs: pairs,
    unmatchedPairs,
    sections,
    detectedSegment: seg.segment,
    detectedEffectiveDate: period.effectiveDate,
    detectionEvidence: { segment: seg.evidence, period: period.evidence, periodLabel: period.label },
    stats: {
      totalPages: numPages,
      pairsFound: pairs.length,
      rubricsMatched: matchedFields.length,
      pairsUnmatched: unmatchedPairs.length,
      averageConfidence: avgConf,
      durationMs: Math.round(performance.now() - start),
    },
    warnings,
  };
}

/** Fichier image (png/jpg/tiff/…) — reconnu par type MIME ou extension. */
function isImageFile(file: File): boolean {
  return (file.type?.startsWith('image/') ?? false) || /\.(png|jpe?g|tiff?|bmp|webp|gif)$/i.test(file.name);
}

/**
 * Extraction de conditions depuis une IMAGE (png/jpg/scan photographié) via le
 * MÊME pipeline position-aware que les PDF scannés : OCR avec bbox par mot →
 * items positionnés → détection de colonnes + paires + rubriques. Aligne enfin
 * les imports image sur la qualité des PDF scannés (au lieu du legacy texte).
 */
async function extractConditionsFromImage(
  file: File,
  options: ConditionsExtractionOptions,
): Promise<ConditionsExtractionResult> {
  const start = performance.now();
  const warnings: string[] = ['Image importée — extraction OCR (positions réelles).'];
  options.onProgress?.({ stage: 'ocr', pct: 0, message: 'OCR de l’image...' });

  const items: PositionedItem[] = [];
  try {
    const ocr = await OcrService.recognizeImageWithBboxes(file);
    // Hauteur image = max des y1 → inversion d'axe (Tesseract haut-gauche →
    // pdfjs/clustering bas-gauche), cohérent avec le reste du pipeline.
    let H = 0;
    for (const w of ocr.words) H = Math.max(H, w.bbox?.y1 ?? 0);
    for (const w of ocr.words) {
      const text = (w.text ?? '').trim();
      if (!text) continue;
      const { x0, y0, x1, y1 } = w.bbox;
      items.push({ text, page: 1, x: x0, y: H - y0, width: Math.max(1, x1 - x0), height: Math.max(1, y1 - y0) });
    }
  } catch (err) {
    warnings.push(`OCR image échoué : ${err instanceof Error ? err.message : 'erreur'}`);
  }
  if (items.length === 0) warnings.push('Aucun texte détecté dans l’image.');

  return buildConditionsResult(items, file, warnings, options, 1, start);
}
