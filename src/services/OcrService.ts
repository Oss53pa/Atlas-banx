import { createWorker, Worker } from 'tesseract.js';
// Side-effect import: configures pdfjs worker once, locally bundled by Vite
import { pdfjsLib } from './pdfjsWorker';

/**
 * Same-origin base URL for the self-hosted tesseract worker + WASM core.
 * The files live in /public/tesseract and are copied verbatim into the
 * build output (never inlined, unlike the rest of the single-file bundle),
 * so they are served as real static assets under script-src/worker-src
 * 'self'. Override via VITE_OCR_BASE if the app is ever mounted on a
 * non-root base path.
 */
const OCR_BASE = (import.meta.env?.VITE_OCR_BASE as string | undefined)?.replace(/\/$/, '') || '/tesseract';

/**
 * Language data (fra/eng .traineddata.gz). Fully self-hosted in
 * /public/tessdata → served same-origin under connect-src 'self', so OCR
 * works with zero external network dependency (critical for field use in
 * low-connectivity CEMAC/UEMOA contexts, and immune to CDN version 404s).
 * Override with VITE_OCR_LANG_PATH only if you deliberately want a remote
 * tessdata host again.
 */
const OCR_LANG_PATH = (import.meta.env?.VITE_OCR_LANG_PATH as string | undefined)?.replace(/\/$/, '')
  || '/tessdata';

export interface OcrResult {
  success: boolean;
  text: string;
  confidence: number;
  error?: string;
}

export interface OcrProgress {
  status: string;
  progress: number;
}

export class OcrService {
  private static worker: Worker | null = null;
  private static isInitializing = false;

  /**
   * Initialize Tesseract worker (lazy loading)
   */
  private static async getWorker(): Promise<Worker> {
    if (this.worker) {
      return this.worker;
    }

    if (this.isInitializing) {
      // Wait for initialization to complete
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.worker!;
    }

    this.isInitializing = true;

    try {
      // ⚠ CSP-safe / offline-capable asset loading.
      // ─────────────────────────────────────────────
      // By default tesseract.js fetches its worker + WASM core from a CDN
      // (jsdelivr) and the language data from tessdata.projectnaptha.com.
      // The production CSP (vercel.json) only allows 'self', so those CDN
      // fetches were silently blocked → OCR returned nothing → the whole
      // conditions/import extraction failed with "Aucune condition extraite".
      //
      // We now self-host the worker + core (copied into /public/tesseract by
      // the build, served same-origin → covered by script-src/worker-src
      // 'self' + wasm-unsafe-eval). Only the traineddata language files are
      // still fetched from the official tessdata host, which is explicitly
      // whitelisted in connect-src. These paths are absolute ('/tesseract…')
      // so they resolve identically in dev and in the single-file prod build.
      this.worker = await createWorker('fra+eng', 1, {
        workerPath: `${OCR_BASE}/worker.min.js`,
        corePath: OCR_BASE,
        langPath: OCR_LANG_PATH,
        gzip: true,
        // Load the worker directly from its same-origin URL instead of
        // wrapping it in a blob: URL — keeps it under worker-src 'self'.
        workerBlobURL: false,
        logger: (m) => {
          console.log('[OCR]', m.status, Math.round((m.progress || 0) * 100) + '%');
        },
        errorHandler: (e: unknown) => {
          console.error('[OCR] worker error:', e);
        },
      });

      return this.worker;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Perform OCR on an image file
   */
  static async recognizeImage(
    imageSource: File | Blob | string,
    onProgress?: (progress: OcrProgress) => void
  ): Promise<OcrResult> {
    try {
      const worker = await this.getWorker();

      // Convert File to data URL if needed
      let source: string | Blob = imageSource;
      if (imageSource instanceof File) {
        source = await this.fileToDataUrl(imageSource);
      }

      onProgress?.({ status: 'Reconnaissance OCR en cours...', progress: 0 });

      const result = await worker.recognize(source);

      onProgress?.({ status: 'Terminé', progress: 100 });

      return {
        success: true,
        text: result.data.text,
        confidence: result.data.confidence,
      };
    } catch (error) {
      return {
        success: false,
        text: '',
        confidence: 0,
        error: error instanceof Error ? error.message : 'Erreur OCR inconnue',
      };
    }
  }

  /**
   * Perform OCR with word-level bounding boxes for pre-analysis layer
   */
  static async recognizeImageWithBboxes(
    imageSource: File | Blob | string
  ): Promise<{
    text: string;
    confidence: number;
    words: Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number }; confidence: number }>;
  }> {
    const worker = await this.getWorker();

    let source: string | Blob = imageSource;
    if (imageSource instanceof File) {
      source = await this.fileToDataUrl(imageSource);
    }

    // tesseract.js v6+ : il n'y a plus de `data.words` à plat. Les mots (et
    // leurs bbox) vivent sous data.blocks[].paragraphs[].lines[].words[], et
    // ne sont peuplés QUE si l'on demande explicitement la sortie `blocks`.
    // Sans ce 3e argument, `data.blocks` est null → 0 mot → l'extraction
    // position-aware des scans échouait silencieusement.
    const result = await worker.recognize(source, {}, { blocks: true });
    const data = result.data as unknown as {
      text: string;
      confidence: number;
      blocks?: Array<{
        paragraphs?: Array<{
          lines?: Array<{
            words?: Array<{
              text: string;
              bbox: { x0: number; y0: number; x1: number; y1: number };
              confidence: number;
            }>;
          }>;
        }>;
      }> | null;
    };

    const words: Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number }; confidence: number }> = [];
    for (const block of data.blocks ?? []) {
      for (const para of block.paragraphs ?? []) {
        for (const line of para.lines ?? []) {
          for (const w of line.words ?? []) {
            words.push({ text: w.text, bbox: w.bbox, confidence: w.confidence });
          }
        }
      }
    }

    return {
      text: data.text,
      confidence: data.confidence,
      words,
    };
  }

  /**
   * Perform OCR on a PDF file (converts each page to image first)
   */
  static async recognizePdf(
    file: File,
    onProgress?: (progress: OcrProgress) => void
  ): Promise<OcrResult> {
    try {
      onProgress?.({ status: 'Chargement du PDF...', progress: 0 });

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      const allText: string[] = [];
      let totalConfidence = 0;

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        onProgress?.({
          status: `Traitement page ${pageNum}/${pdf.numPages}...`,
          progress: ((pageNum - 1) / pdf.numPages) * 100,
        });

        const page = await pdf.getPage(pageNum);

        // Render page to canvas
        const scale = 2; // Higher scale = better OCR quality
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // pdfjs-dist v5 requires `canvas` (was `canvasContext` in v4).
        // Both kept here for forward-compat; v5 reads `canvas` first.
        await page.render({
          canvas,
          canvasContext: context,
          viewport,
        }).promise;

        // Convert canvas to blob
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/png');
        });

        // Perform OCR on this page
        const result = await this.recognizeImage(blob);

        if (result.success) {
          allText.push(result.text);
          totalConfidence += result.confidence;
        }
      }

      onProgress?.({ status: 'Terminé', progress: 100 });

      return {
        success: true,
        text: allText.join('\n\n--- Page suivante ---\n\n'),
        confidence: totalConfidence / pdf.numPages,
      };
    } catch (error) {
      return {
        success: false,
        text: '',
        confidence: 0,
        error: error instanceof Error ? error.message : 'Erreur OCR PDF inconnue',
      };
    }
  }

  /**
   * Check if a PDF contains extractable text or is image-based
   */
  static async isPdfImageBased(file: File): Promise<boolean> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      // Check first page for text content
      const page = await pdf.getPage(1);
      const textContent = await page.getTextContent();

      // If very little text found, likely image-based
      const textLength = textContent.items
        .filter((item) => 'str' in item)
        .reduce((acc, item) => acc + (item as { str: string }).str.length, 0);

      // Less than 50 characters on first page suggests scanned PDF
      return textLength < 50;
    } catch {
      return true; // Assume image-based if we can't determine
    }
  }

  /**
   * Convert File to data URL
   */
  private static fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Terminate the OCR worker (call when done with OCR operations)
   */
  static async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}
