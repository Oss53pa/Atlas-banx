// ============================================================================
// ATLASBANX — Verification payload builders
// ============================================================================
// Bridges the extractor outputs into the VerificationPayload shape the modal
// understands. Statement: ExtractedTransaction[] → StatementRow[].
// Conditions: LabelValuePair[] (+ ExtractionReport) → ConditionRow[].
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import type { ExtractedTransaction } from '../../extraction/bank-statement';
import type { ExtractionReport } from '../../extraction';
import type { LabelValuePair, RubricMatch } from '../../extraction/conditions/types';
import {
  classifyPairs,
  isCustomRubricKey,
  parseCustomRubricKey,
} from '../../extraction/conditions/RubricClassifier';
import {
  AUTO_VALIDATE_CONFIDENCE,
  type CommitResult,
  type CommittedCondition,
  type ConditionRow,
  type StatementRow,
  type VerificationPayload,
} from './types';

interface StatementBuildArgs {
  fileName: string;
  bankCode?: string;
  clientId?: string;
  candidates: ExtractedTransaction[];
  pages?: number;
  defaultCurrency?: string;
}

export function buildStatementPayload(args: StatementBuildArgs): VerificationPayload {
  const rows: StatementRow[] = args.candidates.map((tx) => ({
    id: uuidv4(),
    state: 'pending',
    confidence: tx.confidence,
    warnings: tx.warnings ?? [],
    boundingBox: tx.boundingBox,
    data: {
      date: tx.date instanceof Date ? tx.date.toISOString().slice(0, 10) : '',
      valueDate: tx.valueDate instanceof Date ? tx.valueDate.toISOString().slice(0, 10) : undefined,
      description: tx.description ?? '',
      reference: tx.reference,
      amount: tx.amount,
      balance: tx.balance,
      currency: tx.currency ?? args.defaultCurrency,
    },
  }));

  const total = rows.length;
  const meanConfidence = total === 0 ? 0 : rows.reduce((s, r) => s + r.confidence, 0) / total;

  return {
    mode: 'statement',
    fileName: args.fileName,
    bankCode: args.bankCode,
    clientId: args.clientId,
    extractedAt: new Date().toISOString(),
    stats: {
      totalRows: total,
      extracted: total,
      averageConfidence: meanConfidence,
      pages: args.pages,
    },
    rows,
  };
}

/**
 * Construit un CommitResult SANS écran de vérification : toute ligne dont la
 * confiance ≥ `threshold` est considérée validée (même règle que la
 * pré-validation au montage de la modale). Utilisé par l'import GROUPÉ en mode
 * auto-commit — il produit exactement la même forme que `computeCommitResult`
 * pour que le handler de commit soit partagé entre les deux chemins.
 */
export function buildAutoCommitResult(
  payload: VerificationPayload,
  threshold: number = AUTO_VALIDATE_CONFIDENCE,
): CommitResult {
  const validated = (payload.rows as ConditionRow[]).filter((r) => r.confidence >= threshold);
  const rejected = payload.rows.length - validated.length;

  const catalogByKey = new Map<string, { label: string; category: string }>();
  for (const r of payload.rubricCatalog ?? []) {
    catalogByKey.set(r.key, { label: r.label, category: r.category });
  }

  const conditions: Record<string, CommittedCondition> = {};
  for (const row of validated) {
    const key = row.data.rubricKey;
    if (!key) continue;
    const value = row.data.value ?? 0;
    const unit = row.data.unit;
    const qualitative = row.data.qualitative;
    if (isCustomRubricKey(key)) {
      const meta = catalogByKey.get(key);
      const parsed = parseCustomRubricKey(key);
      conditions[key] = {
        value,
        unit,
        qualitative,
        custom: true,
        label: meta?.label ?? row.data.rubricLabel ?? row.data.label ?? parsed?.slug ?? 'Rubrique',
        category: meta?.category ?? parsed?.category ?? 'divers',
      };
    } else {
      conditions[key] = { value, unit, qualitative };
    }
  }

  return { conditions, validated: validated.length, rejected };
}

interface ConditionsBuildArgs {
  fileName: string;
  bankCode?: string;
  pairs: LabelValuePair[];
  /** Optional: full report — used to seed rubricKey from matched fields. */
  report?: ExtractionReport;
  /** Optional: matches keyed by rubric key — preferred when calling extractConditions
   *  directly (each match knows exactly which pair drove it). */
  matches?: Record<string, RubricMatch>;
  /** Segment/period detected from the source document (file name / header). */
  detectedSegment?: import('../../types').TariffSegment | null;
  detectedEffectiveDate?: Date | null;
  detectedPeriodLabel?: string | null;
  /** Clés de rubriques déjà VALIDÉES au référentiel : une paire retombant sur
   *  l'une d'elles est reconnue automatiquement (plus de proposition à faire). */
  approvedRubricKeys?: Iterable<string>;
}

export function buildConditionsPayload(args: ConditionsBuildArgs): VerificationPayload {
  // Exhaustive classification: EVERY pair is assigned a rubric — a standard
  // registry rubric when it matches strongly, an already-approved custom rubric
  // when its key was validated before, otherwise an auto-created, deduplicated
  // custom rubric. No line is ever left « Non rattachée ».
  const { perPair, catalog } = classifyPairs(args.pairs, {
    approvedKeys: args.approvedRubricKeys ? new Set(args.approvedRubricKeys) : undefined,
  });

  const rows: ConditionRow[] = args.pairs.map((pair, i) => {
    const cls = perPair[i];
    return {
      id: uuidv4(),
      state: 'pending',
      confidence: pair.confidence ?? 0.5,
      warnings: [],
      boundingBox: pair.boundingBox,
      data: {
        label: pair.label,
        value: pair.value,
        unit: pair.unit,
        qualitative: pair.qualitative,
        section: pair.section,
        rubricKey: cls?.key,
        rubricLabel: cls?.label,
        rubricSource: cls?.source,
      },
    };
  });

  const total = rows.length;
  const meanConfidence = total === 0 ? 0 : rows.reduce((s, r) => s + r.confidence, 0) / total;

  return {
    mode: 'conditions',
    fileName: args.fileName,
    bankCode: args.bankCode,
    extractedAt: new Date().toISOString(),
    stats: {
      totalRows: total,
      extracted: total,
      averageConfidence: meanConfidence,
    },
    rubricCatalog: catalog,
    detectedSegment: args.detectedSegment ?? null,
    detectedEffectiveDate: args.detectedEffectiveDate ? args.detectedEffectiveDate.toISOString() : null,
    detectedPeriodLabel: args.detectedPeriodLabel ?? null,
    rows,
  };
}
