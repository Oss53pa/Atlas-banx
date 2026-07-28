import { describe, it, expect } from 'vitest';
import {
  coverageForSegment, hasOpenGapToday, type ReferenceJournalRow,
} from '../referenceJournal';

function row(p: Partial<ReferenceJournalRow>): ReferenceJournalRow {
  return {
    bankCode: 'B', bankName: 'Bank', zone: 'UEMOA', countryIso: 'CI',
    versionId: Math.random().toString(36).slice(2),
    versionLabel: 'v', validationStatus: 'published',
    effectiveFrom: '2025-01-01', effectiveTo: null, publishedAt: null,
    segments: ['particulier'], conditionsCount: 1,
    ...p,
  };
}

describe('coverageForSegment', () => {
  it('une version ouverte → un span couvert, sans trou', () => {
    const spans = coverageForSegment([row({ effectiveFrom: '2026-01-01', effectiveTo: null })], 'particulier');
    expect(spans).toEqual([{ from: '2026-01-01', to: null, covered: true }]);
  });

  it('détecte un trou entre deux versions', () => {
    const spans = coverageForSegment([
      row({ effectiveFrom: '2023-01-01', effectiveTo: '2023-12-31' }),
      row({ effectiveFrom: '2025-01-01', effectiveTo: null }),
    ], 'particulier');
    expect(spans.map((s) => s.covered)).toEqual([true, false, true]);
    expect(spans[1]).toEqual({ from: '2023-12-31', to: '2025-01-01', covered: false });
  });

  it("un barème 'tous' couvre un segment concret", () => {
    const spans = coverageForSegment([row({ segments: ['tous'], effectiveFrom: '2026-01-01' })], 'corporate');
    expect(spans).toHaveLength(1);
    expect(spans[0].covered).toBe(true);
  });

  it('ignore les versions non publiées', () => {
    const spans = coverageForSegment([row({ validationStatus: 'draft' })], 'particulier');
    expect(spans).toHaveLength(0);
  });

  it('aucune couverture pour un segment absent', () => {
    const spans = coverageForSegment([row({ segments: ['particulier'] })], 'pme');
    expect(spans).toHaveLength(0);
  });
});

describe('hasOpenGapToday', () => {
  it('vrai quand la dernière couverture est fermée dans le passé', () => {
    const spans = coverageForSegment([row({ effectiveFrom: '2023-01-01', effectiveTo: '2023-12-31' })], 'particulier');
    expect(hasOpenGapToday(spans, '2026-07-28')).toBe(true);
  });
  it('faux quand la couverture est ouverte (∞)', () => {
    const spans = coverageForSegment([row({ effectiveFrom: '2026-01-01', effectiveTo: null })], 'particulier');
    expect(hasOpenGapToday(spans, '2026-07-28')).toBe(false);
  });
});
