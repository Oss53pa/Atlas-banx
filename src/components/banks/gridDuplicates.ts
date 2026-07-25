// ============================================================================
// ATLASBANX — Détection de grilles tarifaires en doublon
// ============================================================================
// Deux grilles sont considérées comme doublons lorsqu'elles couvrent la MÊME
// période (même date d'effet, au jour près) pour le MÊME segment clientèle.
// C'est le cas typique quand un même PDF de conditions est importé deux fois,
// ou qu'une période est ressaisie par erreur.
// ============================================================================

import type { ConditionGrid, TariffSegment } from '../../types';

export interface DuplicateGroup {
  /** Clé lisible du groupe (période + segment). */
  key: string;
  /** Libellé de la période (date d'effet). */
  periodLabel: string;
  /** Segment concerné (ou 'tous'). */
  segment: TariffSegment | 'all';
  /** Les grilles en doublon, triées : la plus récemment créée en premier
   *  (candidate à conserver). */
  grids: ConditionGrid[];
}

function dayKey(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10);
}

function segmentKey(seg?: TariffSegment): TariffSegment | 'all' {
  return seg ?? 'all';
}

function createdTime(g: ConditionGrid): number {
  return new Date(g.createdAt ?? g.effectiveDate ?? 0).getTime();
}

/**
 * Regroupe les grilles par (date d'effet au jour + segment) et ne retourne
 * que les groupes contenant au moins deux grilles (les doublons).
 * Les brouillons (draft) sont ignorés. À l'intérieur d'un groupe, les grilles
 * sont triées de la plus récente à la plus ancienne (createdAt).
 */
export function findDuplicateGridGroups(grids: ConditionGrid[]): DuplicateGroup[] {
  const buckets = new Map<string, ConditionGrid[]>();

  for (const grid of grids) {
    if (grid.status === 'draft') continue;
    const seg = segmentKey(grid.segment);
    const key = `${dayKey(grid.effectiveDate)}|${seg}`;
    const list = buckets.get(key) ?? [];
    list.push(grid);
    buckets.set(key, list);
  }

  const groups: DuplicateGroup[] = [];
  for (const [key, list] of buckets) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => createdTime(b) - createdTime(a));
    const first = sorted[0];
    groups.push({
      key,
      periodLabel: new Date(first.effectiveDate).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      segment: segmentKey(first.segment),
      grids: sorted,
    });
  }

  // Groupes triés par période décroissante (plus récente en haut).
  return groups.sort(
    (a, b) =>
      new Date(b.grids[0].effectiveDate).getTime() -
      new Date(a.grids[0].effectiveDate).getTime(),
  );
}

/** Nombre total de grilles en doublon (au-delà du 1er exemplaire de chaque groupe). */
export function countRedundantGrids(groups: DuplicateGroup[]): number {
  return groups.reduce((sum, g) => sum + (g.grids.length - 1), 0);
}
