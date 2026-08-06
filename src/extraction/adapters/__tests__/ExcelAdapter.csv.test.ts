// Régression : l'import CSV passait par wb.xlsx.load() (ExcelJS) → cassé.
// Désormais, détection ZIP (magic "PK") → sinon parse CSV (papaparse) avec
// auto-détection du séparateur (',' ';' '\t').
import { describe, it, expect } from 'vitest';
import { ExcelAdapter } from '../ExcelAdapter';

// jsdom n'implémente pas Blob.arrayBuffer() ; on fournit un Blob-like minimal
// (en navigateur, File/Blob.arrayBuffer() existe → le code prod est correct).
function buf(s: string): Blob {
  const u = new TextEncoder().encode(s);
  return { arrayBuffer: async () => u.buffer } as unknown as Blob;
}

describe('ExcelAdapter — CSV', () => {
  it('parse un CSV point-virgule (séparateur auto)', async () => {
    const res = await new ExcelAdapter().extract(
      buf('Rubrique;Montant\nTenue de compte;5000\nVirement externe;2500'),
    );
    expect(res.tables?.[0]).toEqual([
      ['Rubrique', 'Montant'],
      ['Tenue de compte', '5000'],
      ['Virement externe', '2500'],
    ]);
  });

  it('parse un CSV virgule', async () => {
    const res = await new ExcelAdapter().extract(buf('a,b,c\n1,2,3'));
    expect(res.tables?.[0]).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
    expect(res.text).toContain('1\t2\t3'); // TSV interne
  });
});
