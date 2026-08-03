// ============================================================================
// ATLASBANX — Sanity Check Banner
// ============================================================================
// Sits between the toolbar and the table. Runs domain integrity checks on the
// current edited rows and shows green/amber/red status with a one-line
// explanation. Click to expand the full report.
//
// Statement checks
//   1. Balance reconciliation: solde_initial + Σ(crédits) − Σ(débits) ?= solde_final
//      (uses the first/last row balance fields when present)
//   2. Date monotonicity: dates should be non-decreasing
//   3. Currency consistency: all rows same ISO currency
//
// Conditions checks
//   1. Duplicate rubric mapping (same rubricKey on multiple rows)
//   2. Out-of-range values (% > 100, negative amounts, etc.)
//   3. Zero-value amounts that look suspicious
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Calculator,
  Trash2,
  Pencil,
  Check as CheckIcon,
} from 'lucide-react';
import {
  type ConditionRow,
  type StatementRow,
  type VerificationMode,
  type RowState,
  getEffective,
} from './types';

type AnyRow = StatementRow | ConditionRow;

type Severity = 'ok' | 'warn' | 'error';

/** Un groupe de lignes partageant la même rubrique (doublon à arbitrer). */
interface DuplicateGroup {
  key: string;
  label: string;
  rowIds: string[];
}

interface Check {
  id: string;
  severity: Severity;
  title: string;
  detail?: string;
  /** Présent pour le contrôle « rubriques dupliquées » → résolveur interactif. */
  groups?: DuplicateGroup[];
}

interface Props {
  rows: AnyRow[];
  mode: VerificationMode;
  /** Optional initial / final balance pulled from the document header / footer.
   *  When provided, used for the balance reconciliation check. */
  documentBalance?: { initial?: number; final?: number; currency?: string };
  /** Actions par ligne — quand fournies, le contrôle « doublons » devient
   *  actionnable : conserver / modifier / supprimer chaque ligne. */
  onFocusRow?: (id: string) => void;
  onSetRowState?: (id: string, state: RowState) => void;
  onRemoveRow?: (id: string) => void;
}

const SEVERITY_TONES: Record<Severity, {
  bg: string; border: string; ring: string; text: string; pill: string; Icon: typeof CheckCircle2;
}> = {
  ok: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    ring: 'ring-emerald-200/50',
    text: 'text-emerald-800',
    pill: 'bg-emerald-100 text-emerald-700',
    Icon: CheckCircle2,
  },
  warn: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    ring: 'ring-amber-200/50',
    text: 'text-amber-900',
    pill: 'bg-amber-100 text-amber-800',
    Icon: AlertTriangle,
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    ring: 'ring-red-200/50',
    text: 'text-red-900',
    pill: 'bg-red-100 text-red-800',
    Icon: XCircle,
  },
};

export function SanityCheckBanner({
  rows,
  mode,
  documentBalance,
  onFocusRow,
  onSetRowState,
  onRemoveRow,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const interactive = Boolean(onFocusRow || onSetRowState || onRemoveRow);

  const checks = useMemo<Check[]>(() => {
    if (mode === 'statement') return runStatementChecks(rows as StatementRow[], documentBalance);
    return runConditionChecks(rows as ConditionRow[]);
  }, [rows, mode, documentBalance]);

  // Aggregate severity = worst child severity
  const aggregate: Severity = useMemo(() => {
    if (checks.some((c) => c.severity === 'error')) return 'error';
    if (checks.some((c) => c.severity === 'warn')) return 'warn';
    return 'ok';
  }, [checks]);

  const tone = SEVERITY_TONES[aggregate];
  const errorCount = checks.filter((c) => c.severity === 'error').length;
  const warnCount = checks.filter((c) => c.severity === 'warn').length;

  // Déplie une fois si des doublons actionnables sont présents, pour exposer
  // le résolveur d'emblée (sans lutter contre une fermeture manuelle ensuite).
  const hasActionableGroups = interactive && checks.some((c) => c.groups && c.groups.length > 0);
  const didAutoExpand = useRef(false);
  useEffect(() => {
    if (hasActionableGroups && !didAutoExpand.current) {
      setExpanded(true);
      didAutoExpand.current = true;
    }
  }, [hasActionableGroups]);

  const summary =
    aggregate === 'ok'
      ? mode === 'statement'
        ? 'Cohérence du relevé vérifiée — aucun écart détecté.'
        : 'Cohérence des conditions vérifiée — aucun écart détecté.'
      : aggregate === 'error'
        ? `${errorCount} erreur${errorCount > 1 ? 's' : ''} de cohérence détectée${errorCount > 1 ? 's' : ''}.`
        : `${warnCount} avertissement${warnCount > 1 ? 's' : ''} de cohérence.`;

  return (
    <div
      className={`mx-3 my-2 rounded-card border ${tone.border} ${tone.bg} ring-1 ${tone.ring} shadow-sm`}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
        aria-expanded={expanded}
      >
        <tone.Icon className={`w-5 h-5 ${tone.text} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${tone.text} truncate`}>{summary}</p>
          <p className="text-xs text-ink-500 mt-0.5">
            {checks.length} contrôle{checks.length > 1 ? 's' : ''} exécuté{checks.length > 1 ? 's' : ''}
            {errorCount + warnCount > 0 && (
              <>
                {' · '}
                {errorCount > 0 && (
                  <span className={SEVERITY_TONES.error.pill + ' px-1.5 py-0.5 rounded text-[10px] font-medium'}>
                    {errorCount} erreur{errorCount > 1 ? 's' : ''}
                  </span>
                )}
                {errorCount > 0 && warnCount > 0 && ' '}
                {warnCount > 0 && (
                  <span className={SEVERITY_TONES.warn.pill + ' px-1.5 py-0.5 rounded text-[10px] font-medium ml-1'}>
                    {warnCount} avertissement{warnCount > 1 ? 's' : ''}
                  </span>
                )}
              </>
            )}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-ink-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-ink-500 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className={`border-t ${tone.border} px-4 py-3 space-y-3`}>
          {checks.map((c) => {
            const t = SEVERITY_TONES[c.severity];
            return (
              <div key={c.id} className="space-y-2">
                <div className="flex items-start gap-2.5">
                  <t.Icon className={`w-4 h-4 ${t.text} flex-shrink-0 mt-0.5`} />
                  <div className="min-w-0">
                    <p className={`text-xs font-medium ${t.text}`}>{c.title}</p>
                    {c.detail && (
                      <p className="text-xs text-ink-600 mt-0.5 leading-relaxed">{c.detail}</p>
                    )}
                  </div>
                </div>
                {/* Résolveur interactif des doublons — une décision par ligne. */}
                {c.groups && interactive && (
                  <div className="pl-6 space-y-2">
                    {c.groups.map((g) => (
                      <DuplicateGroupCard
                        key={g.key}
                        group={g}
                        rows={rows as ConditionRow[]}
                        onFocusRow={onFocusRow}
                        onSetRowState={onSetRowState}
                        onRemoveRow={onRemoveRow}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// DUPLICATE RESOLVER — une décision par ligne dupliquée
// ───────────────────────────────────────────────────────────────────────────

function eff<T = unknown>(r: ConditionRow, field: string): T {
  return getEffective<Record<string, unknown>>(r as never, field) as T;
}

function fmtValue(value: number, unit?: string): string {
  if (!Number.isFinite(value)) return '—';
  const v = value.toLocaleString('fr-FR');
  return unit ? `${v} ${unit}` : v;
}

const STATE_LABEL: Record<RowState, { text: string; cls: string }> = {
  validated: { text: 'Validée', cls: 'text-emerald-700' },
  rejected: { text: 'Rejetée', cls: 'text-red-600' },
  pending: { text: 'En attente', cls: 'text-ink-400' },
};

function DuplicateGroupCard({
  group,
  rows,
  onFocusRow,
  onSetRowState,
  onRemoveRow,
}: {
  group: DuplicateGroup;
  rows: ConditionRow[];
  onFocusRow?: (id: string) => void;
  onSetRowState?: (id: string, state: RowState) => void;
  onRemoveRow?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const members = group.rowIds
    .map((id) => byId.get(id))
    .filter((r): r is ConditionRow => Boolean(r) && r!.state !== 'rejected');

  // Groupe résolu (plus qu'une ligne active) → on ne l'affiche plus.
  if (members.length <= 1) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-white/70 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-amber-50/60"
      >
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        )}
        <span className="text-[11px] font-medium text-ink-800 truncate flex-1" title={group.label}>
          {group.label}
        </span>
        <span className="text-[10px] font-medium text-amber-800 bg-amber-100 rounded px-1.5 py-0.5 shrink-0">
          {members.length} lignes
        </span>
      </button>

      {open && (
        <div className="border-t border-amber-100 divide-y divide-primary-50">
          {members.map((r) => {
            const label = eff<string>(r, 'label');
            const value = eff<number>(r, 'value');
            const unit = eff<string | undefined>(r, 'unit');
            const st = STATE_LABEL[r.state];
            const siblings = members.filter((m) => m.id !== r.id);
            return (
              <div key={r.id} className="flex items-center gap-2 px-2.5 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-ink-800 truncate" title={label}>
                    {label || '(sans libellé)'}
                  </p>
                  <p className="text-[10px] text-ink-500">
                    {fmtValue(value, unit)} · <span className={st.cls}>{st.text}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Conserver celle-ci = garder cette ligne et retirer les autres du groupe. */}
                  <button
                    onClick={() => {
                      onSetRowState?.(r.id, 'validated');
                      siblings.forEach((s) => onRemoveRow?.(s.id));
                    }}
                    className="p-1 rounded text-emerald-600 hover:bg-emerald-50"
                    title="Ne garder que celle-ci (supprime les autres du groupe)"
                  >
                    <CheckIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onFocusRow?.(r.id)}
                    className="p-1 rounded text-ink-500 hover:bg-primary-50"
                    title="Modifier — éditer la rubrique / la valeur dans le tableau"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onRemoveRow?.(r.id)}
                    className="p-1 rounded text-red-500 hover:bg-red-50"
                    title="Supprimer cette ligne"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// STATEMENT CHECKS
// ───────────────────────────────────────────────────────────────────────────

function runStatementChecks(
  rows: StatementRow[],
  documentBalance?: { initial?: number; final?: number; currency?: string },
): Check[] {
  const checks: Check[] = [];
  const active = rows.filter((r) => r.state !== 'rejected');

  if (active.length === 0) {
    checks.push({
      id: 'no-rows',
      severity: 'warn',
      title: 'Aucune transaction active',
      detail: 'Toutes les lignes sont rejetées ou aucune n’a été extraite.',
    });
    return checks;
  }

  // ─── 1. Balance reconciliation ──────────────────────────────────────────
  const sumDebits = active.reduce((sum, r) => {
    const amt = getEffective<Record<string, unknown>>(r as never, 'amount') as number;
    return amt < 0 ? sum + Math.abs(amt) : sum;
  }, 0);
  const sumCredits = active.reduce((sum, r) => {
    const amt = getEffective<Record<string, unknown>>(r as never, 'amount') as number;
    return amt > 0 ? sum + amt : sum;
  }, 0);
  const net = sumCredits - sumDebits;

  // Try to derive initial / final balance from rows when documentBalance unavailable
  const firstWithBalance = active.find((r) => {
    const b = getEffective<Record<string, unknown>>(r as never, 'balance') as number | undefined;
    return typeof b === 'number';
  });
  const lastWithBalance = [...active].reverse().find((r) => {
    const b = getEffective<Record<string, unknown>>(r as never, 'balance') as number | undefined;
    return typeof b === 'number';
  });

  // Initial = balance before the first transaction = lastBalance - sum(everything from first to last)
  let initial = documentBalance?.initial;
  let final = documentBalance?.final;

  if (initial === undefined && firstWithBalance) {
    const firstAmt = getEffective<Record<string, unknown>>(firstWithBalance as never, 'amount') as number;
    const firstBal = getEffective<Record<string, unknown>>(firstWithBalance as never, 'balance') as number;
    initial = firstBal - firstAmt;
  }
  if (final === undefined && lastWithBalance) {
    final = getEffective<Record<string, unknown>>(lastWithBalance as never, 'balance') as number;
  }

  if (typeof initial === 'number' && typeof final === 'number') {
    const expected = initial + net;
    const diff = Math.abs(expected - final);
    if (diff < 0.01) {
      checks.push({
        id: 'balance-reconciliation',
        severity: 'ok',
        title: 'Solde réconcilié au centime',
        detail: `${formatNum(initial)} + ${formatNum(net)} = ${formatNum(final)}`,
      });
    } else {
      checks.push({
        id: 'balance-reconciliation',
        severity: diff > 1 ? 'error' : 'warn',
        title: `Écart de solde : ${formatNum(diff)}`,
        detail: `Attendu : ${formatNum(initial)} + ${formatNum(net)} = ${formatNum(expected)}. Réel : ${formatNum(final)}.`,
      });
    }
  } else {
    checks.push({
      id: 'balance-reconciliation',
      severity: 'warn',
      title: 'Solde non vérifiable',
      detail: 'Solde initial ou final manquant — impossible de réconcilier les flux.',
    });
  }

  // ─── 2. Date monotonicity ───────────────────────────────────────────────
  let outOfOrder = 0;
  for (let i = 1; i < active.length; i++) {
    const prev = getEffective<Record<string, unknown>>(active[i - 1] as never, 'date') as string;
    const curr = getEffective<Record<string, unknown>>(active[i] as never, 'date') as string;
    if (prev && curr && curr < prev) outOfOrder++;
  }
  if (outOfOrder === 0) {
    checks.push({
      id: 'date-order',
      severity: 'ok',
      title: 'Chronologie respectée',
    });
  } else {
    checks.push({
      id: 'date-order',
      severity: 'warn',
      title: `${outOfOrder} ligne${outOfOrder > 1 ? 's' : ''} hors séquence`,
      detail: 'Certaines dates sont antérieures à la précédente — vérifier l’ordre des écritures.',
    });
  }

  // ─── 3. Currency consistency ───────────────────────────────────────────
  const currencies = new Set<string>();
  for (const r of active) {
    const c = getEffective<Record<string, unknown>>(r as never, 'currency') as string | undefined;
    if (c) currencies.add(c);
  }
  if (currencies.size <= 1) {
    checks.push({
      id: 'currency',
      severity: 'ok',
      title: currencies.size === 1
        ? `Devise homogène : ${[...currencies][0]}`
        : 'Devise non détectée',
    });
  } else {
    checks.push({
      id: 'currency',
      severity: 'error',
      title: `Devises mixtes : ${[...currencies].join(', ')}`,
      detail: 'Un relevé doit être mono-devise — vérifier les lignes hétérogènes.',
    });
  }

  // ─── 4. Zero-amount lines ───────────────────────────────────────────────
  const zeros = active.filter((r) => {
    const a = getEffective<Record<string, unknown>>(r as never, 'amount') as number;
    return a === 0;
  }).length;
  if (zeros > 0) {
    checks.push({
      id: 'zero-amount',
      severity: 'warn',
      title: `${zeros} ligne${zeros > 1 ? 's' : ''} à montant nul`,
      detail: 'Vérifier l’extraction — un montant à zéro est rare en pratique.',
    });
  }

  return checks;
}

// ───────────────────────────────────────────────────────────────────────────
// CONDITIONS CHECKS
// ───────────────────────────────────────────────────────────────────────────

function runConditionChecks(rows: ConditionRow[]): Check[] {
  const checks: Check[] = [];
  const active = rows.filter((r) => r.state !== 'rejected');

  if (active.length === 0) {
    checks.push({
      id: 'no-rows',
      severity: 'warn',
      title: 'Aucune condition active',
      detail: 'Toutes les lignes sont rejetées ou aucune n’a été extraite.',
    });
    return checks;
  }

  // ─── 1. Duplicate rubric mapping ────────────────────────────────────────
  const byKey = new Map<string, ConditionRow[]>();
  for (const r of active) {
    const key = getEffective<Record<string, unknown>>(r as never, 'rubricKey') as string | undefined;
    if (!key) continue;
    const arr = byKey.get(key) ?? [];
    arr.push(r);
    byKey.set(key, arr);
  }
  const dupes = [...byKey.entries()].filter(([, rs]) => rs.length > 1);
  if (dupes.length === 0) {
    checks.push({
      id: 'rubric-unique',
      severity: 'ok',
      title: 'Rubriques uniques',
      detail: `${byKey.size} rubrique${byKey.size > 1 ? 's' : ''} mappée${byKey.size > 1 ? 's' : ''}.`,
    });
  } else {
    const dupeLines = dupes.reduce((n, [, rs]) => n + rs.length, 0);
    checks.push({
      id: 'rubric-unique',
      severity: 'error',
      title: `${dupes.length} rubrique${dupes.length > 1 ? 's' : ''} dupliquée${dupes.length > 1 ? 's' : ''}`,
      detail: `${dupeLines} lignes concernées — arbitrez chaque groupe ci-dessous (conserver / modifier / supprimer).`,
      groups: dupes.map(([key, rs]) => ({
        key,
        label:
          (getEffective<Record<string, unknown>>(rs[0] as never, 'rubricLabel') as string | undefined) ??
          key,
        rowIds: rs.map((r) => r.id),
      })),
    });
  }

  // ─── 2. Percentages out of range ────────────────────────────────────────
  const badPct = active.filter((r) => {
    const unit = getEffective<Record<string, unknown>>(r as never, 'unit') as string | undefined;
    const value = getEffective<Record<string, unknown>>(r as never, 'value') as number;
    return unit === '%' && (value < 0 || value > 100);
  }).length;
  if (badPct === 0) {
    checks.push({
      id: 'pct-range',
      severity: 'ok',
      title: 'Taux dans les bornes [0–100 %]',
    });
  } else {
    checks.push({
      id: 'pct-range',
      severity: 'warn',
      title: `${badPct} taux hors plage [0–100 %]`,
      detail: 'Vérifier — un taux > 100 % est suspect (peut-être en points de base).',
    });
  }

  // ─── 3. Negative amounts ────────────────────────────────────────────────
  const neg = active.filter((r) => {
    const value = getEffective<Record<string, unknown>>(r as never, 'value') as number;
    return value < 0;
  }).length;
  if (neg > 0) {
    checks.push({
      id: 'negative',
      severity: 'warn',
      title: `${neg} valeur${neg > 1 ? 's' : ''} négative${neg > 1 ? 's' : ''}`,
      detail: 'Une condition tarifaire négative est inhabituelle — vérifier le signe.',
    });
  }

  // ─── 4. Unmapped rubrics ────────────────────────────────────────────────
  const unmapped = active.filter((r) => {
    const key = getEffective<Record<string, unknown>>(r as never, 'rubricKey') as string | undefined;
    return !key;
  }).length;
  if (unmapped > 0) {
    checks.push({
      id: 'unmapped',
      severity: 'warn',
      title: `${unmapped} ligne${unmapped > 1 ? 's' : ''} non mappée${unmapped > 1 ? 's' : ''}`,
      detail: 'Sélectionner une rubrique dans la combobox ou rejeter la ligne.',
    });
  } else {
    checks.push({
      id: 'mapped',
      severity: 'ok',
      title: 'Toutes les lignes sont mappées',
    });
  }

  return checks;
}

// ───────────────────────────────────────────────────────────────────────────
// FORMATTERS
// ───────────────────────────────────────────────────────────────────────────

function formatNum(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export { Calculator };
