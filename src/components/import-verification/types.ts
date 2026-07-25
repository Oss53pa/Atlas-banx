// ============================================================================
// ATLASBANX — Import Verification — types
// ============================================================================
// Shared types for the post-import review UI. The verification modal
// consumes these and the parent flow (ImportPage / BankConditionsModal)
// produces them from the extractor output.
// ============================================================================

import type { BoundingBox } from '../../extraction/bank-statement/types';
import type { ClassifiedRubric } from '../../extraction/conditions';
import type { TariffSegment, Transaction } from '../../types';

export type VerificationMode = 'statement' | 'conditions';

export type RowState = 'pending' | 'validated' | 'rejected';

/** Auto-validation rule: any row whose confidence ≥ this threshold is
 *  pre-checked. The UI exposes this as a slider. */
export const AUTO_VALIDATE_CONFIDENCE = 0.9;

// ───────────────────────────────────────────────────────────────────────
// STATEMENT MODE — bank statement transactions
// ───────────────────────────────────────────────────────────────────────

export interface StatementRowData {
  date: string;          // ISO yyyy-mm-dd, locked (not editable in mode B)
  valueDate?: string;    // ISO, locked
  description: string;   // editable
  reference?: string;    // editable
  amount: number;        // editable (signed: <0 debit, >0 credit)
  balance?: number;      // editable
  currency?: string;     // locked (from bank)
}

export interface StatementRow {
  id: string;
  state: RowState;
  data: StatementRowData;
  /** Edits made by the user (overlay on the original extraction) */
  edits?: Partial<StatementRowData>;
  confidence: number;
  warnings: string[];
  boundingBox?: BoundingBox;
  /** True if this row was added by the user (not from extraction) */
  manual?: boolean;
}

// ───────────────────────────────────────────────────────────────────────
// CONDITIONS MODE — tariff label-value pairs
// ───────────────────────────────────────────────────────────────────────

export interface ConditionRowData {
  label: string;         // editable
  value: number;         // editable
  unit?: '%' | 'FCFA' | 'XAF' | 'XOF' | 'EUR' | 'USD' | 'days';
  qualitative?: 'gratuit' | 'consulter' | 'neant' | 'franco' | 'souscription' | 'other';
  section?: string;      // locked (detected from PDF headers)
  /** The rubric key this row maps to — a FieldRegistry key OR an
   *  auto-created `custom:<category>:<slug>` key. May be changed by the
   *  user via a combobox. Always set by the exhaustive classifier. */
  rubricKey?: string;
  /** Human-readable rubric label (registry label or cleaned custom label). */
  rubricLabel?: string;
  /** Where the rubric came from — drives the "auto-créée" UI badge. */
  rubricSource?: 'registry' | 'custom';
}

export interface ConditionRow {
  id: string;
  state: RowState;
  data: ConditionRowData;
  edits?: Partial<ConditionRowData>;
  confidence: number;
  warnings: string[];
  boundingBox?: BoundingBox;
  manual?: boolean;
}

// ───────────────────────────────────────────────────────────────────────
// UNIFIED PAYLOAD (what we serialise into import_drafts.payload)
// ───────────────────────────────────────────────────────────────────────

export interface VerificationPayload {
  mode: VerificationMode;
  fileName: string;
  bankCode?: string;
  clientId?: string;
  extractedAt: string; // ISO
  /** Stats from the extractor */
  stats: {
    totalRows: number;
    extracted: number;
    averageConfidence: number;
    pages?: number;
  };
  /** Conditions mode only: deduped catalog of auto-created custom rubrics,
   *  used to populate the rubric combobox and resolve keys at commit. */
  rubricCatalog?: ClassifiedRubric[];
  /** Conditions mode: clientèle segment detected from the source document. */
  detectedSegment?: TariffSegment | null;
  /** Conditions mode: effective date detected (ISO string, JSON-safe). */
  detectedEffectiveDate?: string | null;
  /** Conditions mode: short period label like "S2 2021". */
  detectedPeriodLabel?: string | null;
  rows: Array<StatementRow | ConditionRow>;
}

// ───────────────────────────────────────────────────────────────────────
// HELPERS
// ───────────────────────────────────────────────────────────────────────

/** Get the effective field value (edit takes precedence over original data). */
export function getEffective<T extends Record<string, unknown>>(
  row: { data: T; edits?: Partial<T> },
  key: keyof T,
): T[keyof T] {
  return (row.edits?.[key] as T[keyof T] | undefined) ?? row.data[key];
}

/** Detect if a row has any user edit. */
export function hasEdits<T>(row: { edits?: Partial<T> }): boolean {
  return !!row.edits && Object.keys(row.edits).length > 0;
}

/** Conversion helpers for the final commit phase. */
export interface CommitArgs {
  mode: VerificationMode;
  bankCode?: string;
  clientId?: string;
  rows: Array<StatementRow | ConditionRow>;
  /** Conditions mode: catalog to resolve custom rubric keys → label/category. */
  rubricCatalog?: ClassifiedRubric[];
}

/** A single validated condition, keyed by rubric in CommitResult.conditions.
 *  Custom (auto-created) rubrics carry their label + form category so the
 *  parent can persist them as CustomFee under the right tab. */
export interface CommittedCondition {
  value: number;
  unit?: string;
  qualitative?: string;
  /** True when this is an auto-created custom rubric (not a registry key). */
  custom?: boolean;
  /** Human label — set for custom rubrics. */
  label?: string;
  /** Form-tab category — set for custom rubrics. */
  category?: string;
}

export interface CommitResult {
  /** For statement mode: the validated transactions ready to insert into
   *  atlasbanx.transactions. */
  transactions?: Transaction[];
  /** For conditions mode: the validated condition values keyed by rubric. */
  conditions?: Record<string, CommittedCondition>;
  /** Number of rows that were rejected and skipped */
  rejected: number;
  /** Number of rows that were validated and kept */
  validated: number;
}
