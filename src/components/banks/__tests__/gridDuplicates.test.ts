import { describe, it, expect } from 'vitest';
import { findDuplicateGridGroups, countRedundantGrids } from '../gridDuplicates';
import type { ConditionGrid } from '../../../types';

function grid(partial: Partial<ConditionGrid>): ConditionGrid {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2),
    bankId: 'bank-1',
    version: partial.version ?? '2024-01',
    name: partial.name ?? 'Grille',
    effectiveDate: partial.effectiveDate ?? new Date('2024-01-01'),
    status: partial.status ?? 'active',
    conditions: {} as ConditionGrid['conditions'],
    createdAt: partial.createdAt ?? new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date(),
    ...partial,
  };
}

describe('findDuplicateGridGroups', () => {
  it('retourne aucun groupe quand toutes les périodes sont distinctes', () => {
    const grids = [
      grid({ effectiveDate: new Date('2022-01-01') }),
      grid({ effectiveDate: new Date('2023-01-01') }),
      grid({ effectiveDate: new Date('2024-01-01') }),
    ];
    expect(findDuplicateGridGroups(grids)).toHaveLength(0);
  });

  it('détecte deux grilles de même période + même segment comme doublon', () => {
    const grids = [
      grid({ id: 'a', effectiveDate: new Date('2024-01-01'), createdAt: new Date('2024-01-01') }),
      grid({ id: 'b', effectiveDate: new Date('2024-01-01'), createdAt: new Date('2024-02-01') }),
    ];
    const groups = findDuplicateGridGroups(grids);
    expect(groups).toHaveLength(1);
    expect(groups[0].grids).toHaveLength(2);
    // La plus récemment créée est en tête (à conserver).
    expect(groups[0].grids[0].id).toBe('b');
    expect(countRedundantGrids(groups)).toBe(1);
  });

  it('ne confond pas des segments différents à la même période', () => {
    const grids = [
      grid({ effectiveDate: new Date('2024-01-01'), segment: 'particuliers' }),
      grid({ effectiveDate: new Date('2024-01-01'), segment: 'entreprises' }),
    ];
    expect(findDuplicateGridGroups(grids)).toHaveLength(0);
  });

  it('ignore les brouillons (draft)', () => {
    const grids = [
      grid({ effectiveDate: new Date('2024-01-01'), status: 'active' }),
      grid({ effectiveDate: new Date('2024-01-01'), status: 'draft' }),
    ];
    expect(findDuplicateGridGroups(grids)).toHaveLength(0);
  });

  it('compte correctement les grilles redondantes sur un groupe de 3', () => {
    const grids = [
      grid({ effectiveDate: new Date('2024-01-01') }),
      grid({ effectiveDate: new Date('2024-01-01') }),
      grid({ effectiveDate: new Date('2024-01-01') }),
    ];
    const groups = findDuplicateGridGroups(grids);
    expect(groups).toHaveLength(1);
    expect(countRedundantGrids(groups)).toBe(2);
  });
});
