import { describe, it, expect } from 'vitest';
import { runFullAudit } from '../runFullAudit';
import { TransactionType, type Transaction } from '../../../types';

function tx(i: number, amount: number): Transaction {
  const d = new Date('2026-02-10T00:00:00Z');
  return {
    id: `t${i}`, clientId: 'c1', accountNumber: '123', bankCode: 'NSIACICI',
    date: d, valueDate: d, amount, balance: 100000 - i * 1000,
    description: amount < 0 ? 'FRAIS TENUE COMPTE' : 'VIREMENT RECU',
    type: amount < 0 ? TransactionType.DEBIT : TransactionType.CREDIT,
    createdAt: d, updatedAt: d,
  } as Transaction;
}

describe('runFullAudit — sans barème officiel (conditions vides)', () => {
  it("ne lève pas « fees is not iterable » quand aucun barème n'est fourni", async () => {
    // Reproduit l'audit express « sur les seules transactions » : pas de
    // bankConditions → EMPTY_BANK_CONDITIONS (fees/interestRates = []).
    const transactions = [tx(1, -2500), tx(2, 50000), tx(3, -1500)];
    const result = await runFullAudit({ transactions });
    expect(result).toBeTruthy();
    expect(Array.isArray(result.anomalies)).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
