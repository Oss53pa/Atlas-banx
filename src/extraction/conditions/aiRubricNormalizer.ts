// ============================================================================
// ATLASBANX — AI rubric normalizer (hybrid layer over the deterministic pass)
// ============================================================================
// The deterministic classifier already guarantees every line is classified.
// This layer is the OPTIONAL accuracy booster the user opted into: it asks the
// Atlas Studio « Proph3t core » to:
//   • correct OCR noise in the label,
//   • map the line to an existing standard registry rubric when appropriate,
//   • otherwise keep it as a clean custom rubric under the right category.
//
// SENSITIVITY = 'public' → core provider order [ollama, groq, gemini, claude].
// Ollama is not deployed, so Groq becomes the effective provider (per the
// user's request + it is the one actually wired on the core today). This is
// SCOPED to bank *tariff/conditions* documents, which are PUBLIC marketing
// brochures — not client statements. Anything carrying real client data
// (bank statements) MUST stay 'confidential' (→ [ollama, claude] only).
//
// It is graceful: if the core is not configured, offline, or returns garbage,
// it throws / returns an empty result and the caller keeps the deterministic
// classification. No network dependency is introduced into the base flow.
// ============================================================================

import { askProph3t, isAtlasCoreConfigured } from '../../lib/proph3t';
import { FIELD_DEFINITIONS } from '../FieldRegistry';
import type { RubricCategory } from './RubricClassifier';

export interface AiNormalizeItem {
  index: number;
  label: string;
  value: number;
  unit?: string;
  section?: string;
}

export interface AiRubricSuggestion {
  index: number;
  /** Cleaned, human-readable label (OCR noise removed). */
  label?: string;
  /** Registry key when the AI mapped it to a standard rubric, else null. */
  rubricKey?: string | null;
  /** Suggested form category when it's a custom rubric. */
  category?: RubricCategory;
  /** AI confidence 0-1. */
  confidence?: number;
}

export function isAiNormalizationAvailable(): boolean {
  return isAtlasCoreConfigured();
}

const VALID_CATEGORIES: RubricCategory[] = [
  'compte', 'guichet', 'cartes', 'virements', 'cheques', 'credits', 'ebanking', 'divers',
];

/**
 * Ask the Atlas core to normalize + classify a batch of noisy condition lines.
 * Returns one suggestion per input item (best effort — items the model omits
 * simply keep their deterministic classification).
 */
export async function normalizeRubricsWithAI(
  items: AiNormalizeItem[],
): Promise<AiRubricSuggestion[]> {
  if (!isAtlasCoreConfigured()) {
    throw new Error('Atlas core non configuré — passe IA indisponible.');
  }
  if (items.length === 0) return [];

  // Compact registry catalog for the prompt (key + label only).
  const registry = FIELD_DEFINITIONS.map((f) => `${f.key}\t${f.label}`).join('\n');
  const lines = items
    .map((it) => `${it.index}\t${it.label}\t${it.value}${it.unit ? ' ' + it.unit : ''}\t${it.section ?? ''}`)
    .join('\n');

  const message = [
    "Tu es un moteur de classification de conditions tarifaires bancaires (zone CEMAC/UEMOA).",
    "On te donne des lignes extraites par OCR (souvent bruitées) d'une grille tarifaire, et le",
    "catalogue des rubriques STANDARD (clé<TAB>libellé). Pour CHAQUE ligne, tu dois :",
    "  1. corriger le libellé (retirer le bruit OCR, garder le sens) ;",
    "  2. si la ligne correspond clairement à une rubrique standard, donner sa clé exacte ;",
    "     sinon rubricKey=null et propose une categorie parmi : " + VALID_CATEGORIES.join(', ') + " ;",
    "  3. donner une confiance 0..1.",
    "Réponds UNIQUEMENT par un tableau JSON valide, sans texte autour, de la forme :",
    '[{"index":0,"label":"...","rubricKey":"accountFees.tenueCompte.particulier"|null,"category":"compte","confidence":0.9}]',
    "",
    "CATALOGUE RUBRIQUES STANDARD (clé<TAB>libellé) :",
    registry,
    "",
    "LIGNES À CLASSER (index<TAB>libellé<TAB>valeur<TAB>section) :",
    lines,
  ].join('\n');

  // 'public' → core routes to Groq (Ollama down). Scoped to public tariff
  // data only — see file header. NEVER use this for statements.
  const res = await askProph3t({ message, sensitivity: 'public' });
  return parseSuggestions(res.answer);
}

/** Defensively extract a JSON array of suggestions from an LLM answer. */
export function parseSuggestions(answer: string): AiRubricSuggestion[] {
  if (!answer) return [];
  // Grab the first [...] block — models sometimes wrap JSON in prose / fences.
  const start = answer.indexOf('[');
  const end = answer.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(answer.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const registryKeys = new Set(FIELD_DEFINITIONS.map((f) => f.key));
  const out: AiRubricSuggestion[] = [];
  for (const raw of parsed) {
    if (!raw || typeof raw !== 'object') continue;
    const o = raw as Record<string, unknown>;
    const index = typeof o.index === 'number' ? o.index : Number(o.index);
    if (!Number.isFinite(index)) continue;

    // Only accept a rubricKey that actually exists in the registry.
    let rubricKey: string | null | undefined;
    if (typeof o.rubricKey === 'string' && registryKeys.has(o.rubricKey)) {
      rubricKey = o.rubricKey;
    } else if (o.rubricKey === null) {
      rubricKey = null;
    }

    const category = VALID_CATEGORIES.includes(o.category as RubricCategory)
      ? (o.category as RubricCategory)
      : undefined;

    out.push({
      index,
      label: typeof o.label === 'string' && o.label.trim() ? o.label.trim() : undefined,
      rubricKey,
      category,
      confidence: typeof o.confidence === 'number' ? o.confidence : undefined,
    });
  }
  return out;
}
