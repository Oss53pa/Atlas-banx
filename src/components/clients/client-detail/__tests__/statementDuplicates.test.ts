import { describe, it, expect } from 'vitest';
import {
  findDuplicateStatementGroups,
  countRedundantStatements,
} from '../statementDuplicates';
import type { BankStatement } from '../../../../types';

function stmt(partial: Partial<BankStatement>): BankStatement {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2),
    clientId: 'client-1',
    accountId: partial.accountId ?? 'acc-1',
    bankCode: partial.bankCode ?? 'SGCI',
    bankName: 'Bank',
    fileName: partial.fileName ?? 'releve.pdf',
    fileType: 'pdf',
    periodStart: partial.periodStart ?? new Date('2024-01-01'),
    periodEnd: partial.periodEnd ?? new Date('2024-01-31'),
    transactionCount: partial.transactionCount ?? 10,
    importedAt: partial.importedAt ?? new Date('2024-02-01'),
    status: partial.status ?? 'imported',
    ...partial,
  };
}

describe('findDuplicateStatementGroups', () => {
  it('aucun doublon quand les périodes diffèrent', () => {
    const list = [
      stmt({ periodStart: new Date('2024-01-01'), periodEnd: new Date('2024-01-31') }),
      stmt({ periodStart: new Date('2024-02-01'), periodEnd: new Date('2024-02-29') }),
    ];
    expect(findDuplicateStatementGroups(list)).toHaveLength(0);
  });

  it('détecte deux relevés même compte + même période', () => {
    const list = [
      stmt({ id: 'a', importedAt: new Date('2024-02-01') }),
      stmt({ id: 'b', importedAt: new Date('2024-03-01') }),
    ];
    const groups = findDuplicateStatementGroups(list);
    expect(groups).toHaveLength(1);
    // Le plus récemment importé est en tête (à conserver).
    expect(groups[0].statements[0].id).toBe('b');
    expect(countRedundantStatements(groups)).toBe(1);
  });

  it('ne confond pas deux comptes différents sur la même période', () => {
    const list = [
      stmt({ accountId: 'acc-1' }),
      stmt({ accountId: 'acc-2' }),
    ];
    expect(findDuplicateStatementGroups(list)).toHaveLength(0);
  });

  it('compte les redondances sur un groupe de trois', () => {
    const list = [stmt({}), stmt({}), stmt({})];
    const groups = findDuplicateStatementGroups(list);
    expect(groups).toHaveLength(1);
    expect(countRedundantStatements(groups)).toBe(2);
  });
});
