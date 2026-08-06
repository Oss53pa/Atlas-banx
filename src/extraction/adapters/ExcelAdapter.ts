// ============================================================================
// Excel adapter — extracts text + tables from .xlsx / .xls / .csv
// ============================================================================

import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import type { DocumentAdapter, ExtractionOptions } from '../types';

export class ExcelAdapter implements DocumentAdapter {
  async extract(input: File | Blob | ArrayBuffer, options?: ExtractionOptions) {
    options?.onProgress?.({ stage: 'excel', pct: 0, message: 'Lecture du fichier...' });

    const buffer = await this.toArrayBuffer(input);

    // Un .xlsx/.xlsm est un ZIP → signature « PK\x03\x04 ». Sinon (CSV/TSV,
    // texte brut) on ne passe PAS par ExcelJS (qui échouerait) mais par un
    // parseur CSV. Bug historique : wb.xlsx.load() était appelé même sur du
    // CSV → import CSV totalement cassé.
    const head = new Uint8Array(buffer.slice(0, 2));
    const isZip = head[0] === 0x50 && head[1] === 0x4b; // "PK"
    if (!isZip) {
      return this.extractCsv(buffer, options);
    }

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);

    const tables: string[][][] = [];
    const lines: string[] = [];

    for (const sheet of wb.worksheets) {
      const sheetTable: string[][] = [];
      lines.push(`\n=== ${sheet.name} ===\n`);

      sheet.eachRow({ includeEmpty: false }, (row) => {
        const cells: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          let v: string;
          if (cell.value === null || cell.value === undefined) {
            v = '';
          } else if (typeof cell.value === 'object' && 'text' in (cell.value as object)) {
            v = String((cell.value as { text: string }).text);
          } else if (typeof cell.value === 'object' && 'result' in (cell.value as object)) {
            v = String((cell.value as { result: unknown }).result ?? '');
          } else {
            v = String(cell.value);
          }
          cells.push(v.trim());
        });
        sheetTable.push(cells);
        // Tab-separated for downstream tabular detection
        lines.push(cells.join('\t'));
      });

      tables.push(sheetTable);
    }

    options?.onProgress?.({ stage: 'excel', pct: 1, message: 'Excel lu' });

    return {
      text: lines.join('\n'),
      pages: wb.worksheets.length,
      tables,
    };
  }

  /** Parse un CSV/TSV en tableau, avec auto-détection du séparateur. */
  private extractCsv(buffer: ArrayBuffer, options?: ExtractionOptions) {
    const text = new TextDecoder('utf-8').decode(buffer);
    const parsed = Papa.parse<string[]>(text, {
      skipEmptyLines: true,
      // delimiter vide → papaparse auto-détecte (',', ';', '\t').
    });
    const rows = (parsed.data as unknown as string[][])
      .map((r) => r.map((c) => String(c ?? '').trim()));
    options?.onProgress?.({ stage: 'excel', pct: 1, message: 'CSV lu' });
    return {
      text: rows.map((r) => r.join('\t')).join('\n'),
      pages: 1,
      tables: [rows],
    };
  }

  private async toArrayBuffer(input: File | Blob | ArrayBuffer): Promise<ArrayBuffer> {
    if (input instanceof ArrayBuffer) return input;
    return await (input as Blob).arrayBuffer();
  }
}
