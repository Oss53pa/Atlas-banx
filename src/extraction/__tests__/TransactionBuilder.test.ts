// ============================================================================
// Tests — TransactionBuilder (parseDate / buildTransaction)
// ============================================================================
// Convertit une MappedRow (cellules par colonne) en ExtractedTransaction.
// Couvre le parsing de dates (DD/MM/YYYY, sniff MM/DD, années sur 2 chiffres)
// et les 3 layouts de montants : Débit/Crédit séparés (A), montant unique
// signé (B), montant + indicateur de sens (C).
// ============================================================================

import { describe, it, expect } from 'vitest';
import { parseDate, buildTransaction } from '../bank-statement/TransactionBuilder';
import type { MappedRow, TableStructure } from '../bank-statement/types';

function struct(roles: TableStructure['columns'][number]['role'][]): TableStructure {
  return {
    headerY: 500,
    headerPage: 1,
    confidence: 0.9,
    columns: roles.map((role, i) => ({
      role,
      label: role,
      xLeft: i * 100,
      xRight: i * 100 + 99,
      page: 1,
    })),
  };
}

function row(cells: MappedRow['cells']): MappedRow {
  return { page: 1, y: 400, items: [], cells };
}

describe('parseDate', () => {
  it('parse DD/MM/YYYY en UTC', () => {
    const d = parseDate('12/03/2024')!;
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(2); // mars = index 2
    expect(d.getUTCDate()).toBe(12);
  });

  it('parse DD-MM-YY (année 2 chiffres, pivot 50)', () => {
    expect(parseDate('05-01-25')!.getUTCFullYear()).toBe(2025);
    expect(parseDate('05-01-99')!.getUTCFullYear()).toBe(1999);
  });

  it('sniff MM/DD/YYYY quand mm>12 (format US)', () => {
    const d = parseDate('03/15/2024')!; // dd=3 mm=15 → swap → 15/03
    expect(d.getUTCMonth()).toBe(2);
    expect(d.getUTCDate()).toBe(15);
  });

  it('retourne null pour une date invalide', () => {
    expect(parseDate('31/13/2024')).toBeNull();
    expect(parseDate('pas une date')).toBeNull();
    expect(parseDate(undefined)).toBeNull();
  });
});

describe('buildTransaction — layout A (débit/crédit séparés)', () => {
  const S = struct(['date', 'description', 'debit', 'credit', 'balance']);

  it('montant négatif depuis la colonne débit', () => {
    const tx = buildTransaction(row({ date: '12/03/2024', description: 'RETRAIT DAB', debit: '50 000', balance: '200 000' }), S)!;
    expect(tx.amount).toBe(-50000);
    expect(tx.balance).toBe(200000);
    expect(tx.date!.getUTCDate()).toBe(12);
  });

  it('montant positif depuis la colonne crédit', () => {
    const tx = buildTransaction(row({ date: '12/03/2024', description: 'VIREMENT RECU', credit: '250 000' }), S)!;
    expect(tx.amount).toBe(250000);
  });

  it('warning quand ni débit ni crédit lisible mais date présente', () => {
    const tx = buildTransaction(row({ date: '12/03/2024', description: 'LIGNE SANS MONTANT' }), S)!;
    expect(tx.amount).toBe(0);
    expect(tx.warnings.length).toBeGreaterThan(0);
  });
});

describe('buildTransaction — layout B (montant unique signé)', () => {
  const S = struct(['date', 'description', 'amount', 'balance']);

  it('respecte le signe explicite du montant', () => {
    const tx = buildTransaction(row({ date: '01/02/2024', description: 'FRAIS', amount: '-1 500' }), S)!;
    expect(tx.amount).toBe(-1500);
  });
});

describe('buildTransaction — layout C (montant + colonne type/sens)', () => {
  const S = struct(['date', 'description', 'type', 'amount', 'balance']);

  it('applique le sens "D" → débit', () => {
    const tx = buildTransaction(row({ date: '01/02/2024', description: 'OP', type: 'D', amount: '3 000' }), S)!;
    expect(tx.amount).toBe(-3000);
  });

  it('applique le sens "C" → crédit', () => {
    const tx = buildTransaction(row({ date: '01/02/2024', description: 'OP', type: 'C', amount: '3 000' }), S)!;
    expect(tx.amount).toBe(3000);
  });
});

describe('buildTransaction — rejets & confiance', () => {
  const S = struct(['date', 'description', 'debit', 'credit', 'balance']);

  it('retourne null sans date ET sans montant', () => {
    expect(buildTransaction(row({ description: 'NOTE DE BAS DE PAGE' }), S)).toBeNull();
  });

  it('confiance plus haute avec date + description + montant', () => {
    const complet = buildTransaction(row({ date: '12/03/2024', description: 'VIREMENT SALAIRE', credit: '250 000' }), S)!;
    const partiel = buildTransaction(row({ date: '12/03/2024', description: 'AB' }), S)!;
    expect(complet.confidence).toBeGreaterThan(partiel.confidence);
  });
});
