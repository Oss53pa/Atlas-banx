import { describe, it, expect } from 'vitest';
import { buildConditionsPayload, buildAutoCommitResult } from '../payloadBuilders';
import type { LabelValuePair } from '../../../extraction/conditions/types';

function pair(label: string, value: number, confidence = 0.95): LabelValuePair {
  return { label, rawValue: `${value}`, value, unit: 'FCFA', confidence, page: 1, y: 100 };
}

describe('buildAutoCommitResult', () => {
  it('valide les lignes ≥ seuil et mappe les clés registre', () => {
    const payload = buildConditionsPayload({
      fileName: 'uba.pdf',
      bankCode: 'UBACICIX',
      pairs: [
        pair('Frais de tenue de compte particulier', 5000),
        pair('Tenue de compte entreprise', 25000),
      ],
    });
    const commit = buildAutoCommitResult(payload);

    expect(commit.validated).toBeGreaterThan(0);
    const keys = Object.keys(commit.conditions ?? {});
    expect(keys).toContain('accountFees.tenueCompte.particulier');
    expect(commit.conditions!['accountFees.tenueCompte.particulier'].value).toBe(5000);
  });

  it('exclut les lignes sous le seuil de confiance', () => {
    const payload = buildConditionsPayload({
      fileName: 'x.pdf',
      pairs: [pair('Rubrique douteuse', 1000, 0.4)], // < 0.9
    });
    const commit = buildAutoCommitResult(payload);
    expect(commit.validated).toBe(0);
    expect(Object.keys(commit.conditions ?? {})).toHaveLength(0);
  });
});
