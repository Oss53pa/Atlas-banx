// ============================================================================
// ATLASBANX — StatementDuplicatesBanner
// ============================================================================
// Signale les relevés bancaires en doublon (même compte + même période) et
// permet de les supprimer un à un. Le relevé le plus récemment importé de
// chaque groupe est mis en avant comme « à conserver ».
// ============================================================================

import { useMemo, useState } from 'react';
import { AlertTriangle, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import type { BankStatement } from '../../../types';
import {
  findDuplicateStatementGroups,
  countRedundantStatements,
} from './statementDuplicates';

interface StatementDuplicatesBannerProps {
  statements: BankStatement[];
  onDeleteStatement: (statement: BankStatement) => void;
}

export function StatementDuplicatesBanner({
  statements,
  onDeleteStatement,
}: StatementDuplicatesBannerProps) {
  const groups = useMemo(
    () => findDuplicateStatementGroups(statements),
    [statements],
  );
  const redundant = useMemo(() => countRedundantStatements(groups), [groups]);
  const [expanded, setExpanded] = useState(true);

  if (groups.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 mb-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-amber-900">
          <AlertTriangle className="w-4 h-4" />
          {redundant} relevé{redundant > 1 ? 's' : ''} en doublon
          <span className="text-[11px] font-normal text-amber-700">
            ({groups.length} période{groups.length > 1 ? 's' : ''} concernée
            {groups.length > 1 ? 's' : ''})
          </span>
        </span>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-amber-700" />
        ) : (
          <ChevronRight className="w-4 h-4 text-amber-700" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-3">
          {groups.map((group) => (
            <div
              key={group.key}
              className="rounded-md border border-amber-200 bg-white/70 p-2"
            >
              <div className="text-[11px] font-medium text-amber-900 mb-1.5">
                {group.periodLabel}
              </div>
              <ul className="space-y-1">
                {group.statements.map((stmt, idx) => {
                  const keep = idx === 0;
                  return (
                    <li
                      key={stmt.id}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-primary-800 truncate">
                          {stmt.fileName || 'Relevé'}
                        </span>
                        <span className="text-primary-400 ml-1.5">
                          {stmt.transactionCount} tx · {stmt.status} · importé le{' '}
                          {new Date(stmt.importedAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      {keep ? (
                        <span className="shrink-0 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                          À conserver
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              confirm(
                                `Supprimer le relevé en doublon « ${stmt.fileName || 'Relevé'} » (${group.periodLabel}) ?`,
                              )
                            ) {
                              onDeleteStatement(stmt);
                            }
                          }}
                          className="shrink-0 inline-flex items-center gap-1 text-[11px] text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded px-1.5 py-0.5"
                          title="Supprimer ce doublon"
                        >
                          <Trash2 className="w-3 h-3" />
                          Supprimer
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <p className="text-[10px] text-amber-700 italic">
            Le relevé « à conserver » est le plus récemment importé. La
            suppression est définitive.
          </p>
        </div>
      )}
    </div>
  );
}
