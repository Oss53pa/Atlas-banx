// ============================================================================
// Tests — Modèle de succession temporelle des conditions
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  closeIntervals,
  findApplicableAt,
  sortChronologically,
  type TemporalRange,
} from '../resolution/temporal';

// Fabrique une condition datée minimale, avec un label pour l'identifier.
interface Cond extends TemporalRange {
  label: string;
}
function cond(label: string, from: string, to: string | null = null): Cond {
  return {
    label,
    effectiveFrom: new Date(from),
    effectiveTo: to ? new Date(to) : null,
  };
}
const at = (d: string) => new Date(d);

describe('sortChronologically', () => {
  it('classe par date de début croissante sans muter l’entrée', () => {
    const input = [cond('B', '2024-07-01'), cond('A', '2024-01-01'), cond('C', '2025-01-01')];
    const sorted = sortChronologically(input);
    expect(sorted.map((c) => c.label)).toEqual(['A', 'B', 'C']);
    // entrée inchangée
    expect(input.map((c) => c.label)).toEqual(['B', 'A', 'C']);
  });

  it('est stable pour des débuts identiques', () => {
    const input = [cond('X', '2024-01-01'), cond('Y', '2024-01-01')];
    expect(sortChronologically(input).map((c) => c.label)).toEqual(['X', 'Y']);
  });
});

describe('closeIntervals — fin implicite = début du suivant', () => {
  it('déduit la fin de chaque condition à partir du début de la suivante', () => {
    // Aucune date de fin saisie : le cas réel décrit par l’utilisateur.
    const grid = closeIntervals([
      cond('T1', '2024-01-01'),
      cond('T2', '2024-07-01'),
      cond('T3', '2025-01-01'),
    ]);

    expect(grid[0].effectiveTo).toEqual(at('2024-07-01')); // T1 finit quand T2 commence
    expect(grid[1].effectiveTo).toEqual(at('2025-01-01')); // T2 finit quand T3 commence
    expect(grid[2].effectiveTo).toBeNull(); // T3 : toujours applicable
    expect(grid.map((g) => g.isOpenEnded)).toEqual([false, false, true]);
  });

  it('une fin explicite plus précoce l’emporte (arrêt ferme → trou)', () => {
    const grid = closeIntervals([
      cond('Standard', '2024-01-01'),
      cond('Promo', '2024-03-01', '2024-03-15'), // promo courte, arrêt ferme
      cond('Nouveau', '2024-09-01'),
    ]);
    // La promo s'arrête au 2024-03-15, bien avant le début de "Nouveau".
    expect(grid[1].effectiveTo).toEqual(at('2024-03-15'));
    expect(grid[1].isOpenEnded).toBe(false);
  });

  it('un seul tarif sans fin est toujours ouvert', () => {
    const grid = closeIntervals([cond('Unique', '2020-01-01')]);
    expect(grid[0].effectiveTo).toBeNull();
    expect(grid[0].isOpenEnded).toBe(true);
  });

  it('renvoie une liste vide pour une entrée vide', () => {
    expect(closeIntervals([])).toEqual([]);
  });
});

describe('findApplicableAt — succession par date de début', () => {
  const timeline = [
    cond('T1', '2024-01-01'),
    cond('T2', '2024-07-01'),
    cond('T3', '2025-01-01'),
  ];

  it('retient le tarif dont le début est le plus récent avant la date', () => {
    expect(findApplicableAt(timeline, at('2024-03-15'))?.label).toBe('T1');
    expect(findApplicableAt(timeline, at('2024-09-01'))?.label).toBe('T2');
    expect(findApplicableAt(timeline, at('2025-06-01'))?.label).toBe('T3');
  });

  it('applique le tarif dès son jour de début (borne de début incluse)', () => {
    expect(findApplicableAt(timeline, at('2024-07-01'))?.label).toBe('T2');
  });

  it('exclut le jour de début du successeur (borne de fin exclue)', () => {
    // Au 2024-06-30, T2 n’a pas encore commencé → T1.
    expect(findApplicableAt(timeline, at('2024-06-30'))?.label).toBe('T1');
  });

  it('renvoie null avant tout début de condition', () => {
    expect(findApplicableAt(timeline, at('2023-12-31'))).toBeNull();
  });

  it('le dernier tarif sans fin reste applicable très loin dans le futur', () => {
    expect(findApplicableAt(timeline, at('2099-01-01'))?.label).toBe('T3');
  });

  it('l’ordre d’entrée n’a pas d’importance', () => {
    const shuffled = [timeline[2], timeline[0], timeline[1]];
    expect(findApplicableAt(shuffled, at('2024-09-01'))?.label).toBe('T2');
  });

  it('respecte un arrêt ferme (fin explicite) comme un trou', () => {
    const withStop = [cond('Actif', '2024-01-01', '2024-06-30')];
    expect(findApplicableAt(withStop, at('2024-05-01'))?.label).toBe('Actif');
    // Après la fin explicite, sans successeur → aucune condition applicable.
    expect(findApplicableAt(withStop, at('2024-08-01'))).toBeNull();
  });

  it('ne régresse pas vers un tarif clôturé quand la version récente est fermée', () => {
    // Reproduit le bug de l’ancien `.limit(1)` : la version la plus récente est
    // clôturée, mais une antérieure encore ouverte doit s’appliquer… ici la
    // récente EST celle qui s’applique, l’antérieure ne doit pas resurgir.
    const versions = [
      cond('V1', '2024-01-01'), // ouverte
      cond('V2', '2024-07-01', '2024-07-31'), // courte, clôturée
    ];
    // Pendant V2 : c’est V2.
    expect(findApplicableAt(versions, at('2024-07-15'))?.label).toBe('V2');
    // Après la clôture de V2, sans successeur → trou (pas de retour à V1).
    expect(findApplicableAt(versions, at('2024-08-15'))).toBeNull();
  });
});
