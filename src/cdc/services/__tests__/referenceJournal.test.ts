import { describe, it, expect } from 'vitest';
import {
  coverageForSegment, hasOpenGapToday,
  rubricLabel, isRateRubric, formatConditionValue, bankSegmentCounts,
  type ReferenceJournalRow,
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

describe('détail des conditions — libellés & formatage', () => {
  it('rubricLabel : libellé de la taxonomie pour les codes connus, prettifie les autres', () => {
    // Source de vérité = taxonomie (displayLabelFr).
    expect(rubricLabel('compte.tenue_mensuelle')).toBe('Tenue de compte mensuelle');
    expect(rubricLabel('divers.frais_speciaux')).toBe('Frais speciaux');
  });

  it('isRateRubric : unité de la taxonomie (percent) et pas une regex', () => {
    expect(isRateRubric('decouverts.taux_autorise')).toBe(true);
    expect(isRateRubric('compte.tenue_mensuelle')).toBe(false);
    // Piège classique : une commission FIXE en FCFA ne doit PAS être un taux.
    expect(isRateRubric('decouverts.commission_intervention')).toBe(false);
  });

  it('formatConditionValue : % pour les taux, FCFA pour les montants', () => {
    const norm = (s: string) => s.replace(/[  ]/g, ' ');
    expect(formatConditionValue('decouverts.taux_autorise', 14)).toBe('14 %');
    expect(norm(formatConditionValue('compte.tenue_mensuelle', 1500))).toBe('1 500 FCFA');
    expect(formatConditionValue('compte.tenue_mensuelle', null)).toBe('—');
  });
});

describe('bankSegmentCounts — pastille par banque', () => {
  it('compte les barèmes par type (tous = particulier + entreprise), ignore rejeté', () => {
    const rows = [
      row({ bankCode: 'NSIA', segments: ['particulier'] }),
      row({ bankCode: 'NSIA', segments: ['corporate'] }),
      row({ bankCode: 'NSIA', segments: ['tous'] }),
      row({ bankCode: 'NSIA', segments: ['particulier'], validationStatus: 'rejected' }),
      row({ bankCode: 'BOA', segments: ['pme'] }),
    ];
    const m = bankSegmentCounts(rows);
    // NSIA : particulier (1) + tous (1) = 2 ; corporate (1) + tous (1) = 2 ; rejeté ignoré.
    expect(m.get('NSIA')).toEqual({ particulier: 2, entreprise: 2 });
    // BOA : pme compte comme entreprise.
    expect(m.get('BOA')).toEqual({ particulier: 0, entreprise: 1 });
  });
});
