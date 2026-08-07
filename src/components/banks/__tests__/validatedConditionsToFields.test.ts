import { describe, it, expect } from 'vitest';
import { validatedConditionsToFields } from '../extractionToFields';
import type { ValidatedConditionLine } from '../../../types';

function line(p: Partial<ValidatedConditionLine> & { rubricKey: string; label: string }): ValidatedConditionLine {
  return { value: 0, ...p };
}

describe('validatedConditionsToFields', () => {
  it('traduit la clé de rubrique en code taxonomie CDC', () => {
    const [f] = validatedConditionsToFields([
      line({ rubricKey: 'accountFees.tenueCompte.particulier', label: 'Tenue de compte', value: 2000 }),
    ]);
    expect(f.rubricCode).toBe('compte.tenue_mensuelle');
    expect(f.value).toBe(2000);
    expect(f.confidence).toBe('high');
  });

  it('publie un tarif GRATUIT comme 0 (et le signale dans le libellé)', () => {
    const [f] = validatedConditionsToFields([
      line({ rubricKey: 'custom:compte:carte-x', label: 'Carte X', value: 0, qualitative: 'gratuit' }),
    ]);
    expect(f.value).toBe(0);
    expect(f.label).toContain('Gratuit');
  });

  it('néant/franco → 0 également', () => {
    const fields = validatedConditionsToFields([
      line({ rubricKey: 'custom:compte:a', label: 'A', qualitative: 'neant' }),
      line({ rubricKey: 'custom:compte:b', label: 'B', qualitative: 'franco' }),
    ]);
    expect(fields.map((f) => f.value)).toEqual([0, 0]);
  });

  it('garde la phrase pour un qualitatif NON gratuit (« nous consulter »)', () => {
    const [f] = validatedConditionsToFields([
      line({ rubricKey: 'custom:credits:taux', label: 'Taux', qualitative: 'consulter' }),
    ]);
    expect(f.value).toBe('Nous consulter');
  });

  it('conserve la valeur numérique corrigée pour une ligne normale', () => {
    const [f] = validatedConditionsToFields([
      line({ rubricKey: 'creditFees.tauxDecouvertAutorise', label: 'Découvert', value: 14.5, unit: '%' }),
    ]);
    expect(f.rubricCode).toBe('decouverts.taux_autorise');
    expect(f.value).toBe(14.5);
    expect(f.unit).toBe('%');
  });
});
