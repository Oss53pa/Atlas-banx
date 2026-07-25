// ============================================================================
// ATLASBANX — Détection de relevés bancaires en doublon
// ============================================================================
// Deux relevés sont considérés comme doublons lorsqu'ils portent sur le MÊME
// compte et couvrent EXACTEMENT la même période (dates de début et de fin, au
// jour près). C'est le cas typique d'un même relevé ré-importé.
// ============================================================================

import type { BankStatement } from '../../../types';

export interface DuplicateStatementGroup {
  key: string;
  /** Libellé de la période (début → fin). */
  periodLabel: string;
  /** Identifiant de compte du groupe (accountId, ou repli bankCode). */
  accountKey: string;
  /** Les relevés en doublon, du plus récemment importé au plus ancien. */
  statements: BankStatement[];
}

function dayKey(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10);
}

function accountKeyOf(s: BankStatement): string {
  return s.accountId || s.bankCode || 'compte';
}

function importedTime(s: BankStatement): number {
  return new Date(s.importedAt ?? s.periodStart ?? 0).getTime();
}

/**
 * Regroupe les relevés par (compte + période début + période fin) et ne
 * retourne que les groupes d'au moins deux relevés (les doublons). À
 * l'intérieur d'un groupe, le relevé importé le plus récemment est en tête
 * (candidat à conserver).
 */
export function findDuplicateStatementGroups(
  statements: BankStatement[],
): DuplicateStatementGroup[] {
  const buckets = new Map<string, BankStatement[]>();

  for (const stmt of statements) {
    const key = `${accountKeyOf(stmt)}|${dayKey(stmt.periodStart)}|${dayKey(stmt.periodEnd)}`;
    const list = buckets.get(key) ?? [];
    list.push(stmt);
    buckets.set(key, list);
  }

  const groups: DuplicateStatementGroup[] = [];
  for (const [key, list] of buckets) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => importedTime(b) - importedTime(a));
    const first = sorted[0];
    const fmt = (d: Date | string) =>
      new Date(d).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    groups.push({
      key,
      periodLabel: `${fmt(first.periodStart)} → ${fmt(first.periodEnd)}`,
      accountKey: accountKeyOf(first),
      statements: sorted,
    });
  }

  return groups.sort(
    (a, b) =>
      new Date(b.statements[0].periodStart).getTime() -
      new Date(a.statements[0].periodStart).getTime(),
  );
}

/** Nombre de relevés redondants (au-delà du 1er exemplaire de chaque groupe). */
export function countRedundantStatements(groups: DuplicateStatementGroup[]): number {
  return groups.reduce((sum, g) => sum + (g.statements.length - 1), 0);
}
