// ============================================================================
// Tests — segmentDetector (segment clientèle + période d'application)
// ============================================================================

import { describe, it, expect } from 'vitest';
import { detectSegment, detectEffectivePeriod } from '../conditions/segmentDetector';

describe('detectSegment', () => {
  it('détecte « particuliers » depuis le nom de fichier', () => {
    const r = detectSegment('CONDITIONS-APPLICABLES-S2-2021_-PARTICULIERS_NSIA-BANQUE-CI.pdf');
    expect(r.segment).toBe('particuliers');
    expect(r.confidence).toBeGreaterThan(0.9);
  });

  it('détecte « entreprises » depuis l\'en-tête', () => {
    const r = detectSegment(
      'conditions.pdf',
      'Tarifs des produits et services offerts à la clientèle des Entreprises et Professionnels',
    );
    expect(r.segment).toBe('entreprises');
  });

  it('détecte « associations » (ONG)', () => {
    expect(detectSegment('grille_ONG_2024.pdf').segment).toBe('associations');
  });

  it('renvoie null sans indice', () => {
    expect(detectSegment('document.pdf', 'texte neutre sans indice').segment).toBeNull();
  });
});

describe('detectEffectivePeriod', () => {
  it('parse un semestre S2-2021 → 1er juillet 2021 (UTC)', () => {
    const r = detectEffectivePeriod('CONDITIONS-APPLICABLES-S2-2021_-PARTICULIERS.pdf');
    expect(r.effectiveDate?.getUTCFullYear()).toBe(2021);
    expect(r.effectiveDate?.getUTCMonth()).toBe(6); // juillet
    expect(r.effectiveDate?.getUTCDate()).toBe(1);
    expect(r.label).toBe('S2 2021');
  });

  it('parse « à partir de juillet 2021 »', () => {
    const r = detectEffectivePeriod('x.pdf', 'Conditions applicables à partir de juillet 2021');
    expect(r.effectiveDate?.getUTCMonth()).toBe(6);
    expect(r.effectiveDate?.getUTCFullYear()).toBe(2021);
  });

  it('parse une date explicite 01/07/2021', () => {
    const r = detectEffectivePeriod('grille_01/07/2021.pdf');
    expect(r.effectiveDate?.getUTCFullYear()).toBe(2021);
    expect(r.effectiveDate?.getUTCMonth()).toBe(6);
    expect(r.effectiveDate?.getUTCDate()).toBe(1);
  });

  it('repli sur une année seule', () => {
    const r = detectEffectivePeriod('conditions_2023.pdf');
    expect(r.effectiveDate?.getUTCFullYear()).toBe(2023);
    expect(r.effectiveDate?.getUTCMonth()).toBe(0);
  });

  it('renvoie null sans période', () => {
    expect(detectEffectivePeriod('conditions.pdf').effectiveDate).toBeNull();
  });
});
