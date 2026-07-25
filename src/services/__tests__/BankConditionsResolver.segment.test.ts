// ============================================================================
// Tests — BankConditionsResolver : résolution par SEGMENT (particuliers /
// entreprises) en plus de la banque + période.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { BankConditionsResolver } from '../BankConditionsResolver';
import type { Bank, ConditionGrid, TariffSegment } from '../../types';

function grid(id: string, segment: TariffSegment | undefined, eff: string): ConditionGrid {
  return {
    id,
    bankId: 'b1',
    version: eff.slice(0, 7),
    name: `Grille ${id}`,
    effectiveDate: new Date(eff),
    status: 'active',
    segment,
    // Le resolver ne lit pas le détail des conditions — cast minimal.
    conditions: { id: `c-${id}` } as unknown as ConditionGrid['conditions'],
    createdAt: new Date(eff),
    updatedAt: new Date(eff),
  };
}

function bankWith(grids: ConditionGrid[]): Bank {
  return {
    code: 'NSIA-CI',
    name: 'NSIA Banque CI',
    country: 'CI',
    conditionGrids: grids,
    activeGridId: grids[0]?.id,
  } as unknown as Bank;
}

const PERIOD = { start: new Date('2021-09-01'), end: new Date('2021-09-30') };

describe('BankConditionsResolver — segment gating', () => {
  it('choisit la grille du segment demandé quand elle existe', () => {
    const banks = [bankWith([
      grid('PART', 'particuliers', '2021-07-01'),
      grid('ENT', 'entreprises', '2021-07-01'),
    ])];
    const r = new BankConditionsResolver(banks).resolve({
      bankCode: 'NSIA-CI', ...PERIOD, segment: 'entreprises',
    });
    expect(r.grid?.id).toBe('ENT');
    expect(r.segmentMatch).toBe(true);
  });

  it('retombe sur une grille commune (sans segment) si pas de grille spécifique', () => {
    const banks = [bankWith([grid('COMMON', undefined, '2021-07-01')])];
    const r = new BankConditionsResolver(banks).resolve({
      bankCode: 'NSIA-CI', ...PERIOD, segment: 'particuliers',
    });
    expect(r.grid?.id).toBe('COMMON');
    expect(r.segmentMatch).toBe(true);
  });

  it('signale segmentMatch=false quand seul un autre segment est disponible', () => {
    const banks = [bankWith([grid('ENT', 'entreprises', '2021-07-01')])];
    const r = new BankConditionsResolver(banks).resolve({
      bankCode: 'NSIA-CI', ...PERIOD, segment: 'particuliers',
    });
    expect(r.grid?.id).toBe('ENT'); // dernier recours
    expect(r.segmentMatch).toBe(false);
  });

  it('ne filtre pas quand aucun segment n\'est demandé (rétro-compat)', () => {
    const banks = [bankWith([
      grid('PART', 'particuliers', '2021-07-01'),
      grid('ENT', 'entreprises', '2021-07-01'),
    ])];
    const r = new BankConditionsResolver(banks).resolve({ bankCode: 'NSIA-CI', ...PERIOD });
    expect(r.grid).toBeTruthy();
  });
});
