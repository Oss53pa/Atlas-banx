import { describe, it, expect } from 'vitest';
import { formatDateUTC } from '../formatters';

describe('formatDateUTC', () => {
  it('formate selon les composantes UTC (pas de décalage de jour)', () => {
    // Minuit UTC : doit rester le 10, quel que soit le fuseau local du test.
    expect(formatDateUTC(new Date('2026-02-10T00:00:00Z'))).toBe('10/02/2026');
    expect(formatDateUTC('2026-05-08')).toBe('08/05/2026');
  });
  it('gère les dates invalides', () => {
    expect(formatDateUTC(new Date('nope'))).toBe('Date invalide');
  });
});
