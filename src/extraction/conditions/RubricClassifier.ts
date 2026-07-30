// ============================================================================
// ATLASBANX — Exhaustive rubric classifier
// ============================================================================
// Goal: EVERY extracted label-value pair gets classified into a rubric.
// There is no such thing as an "unattached" (« Non rattachée ») line anymore.
//
//   • If a pair matches a standard registry rubric strongly enough
//     (FIELD_DEFINITIONS) → use that registry key. The typed conditions form
//     is populated via REGISTRY_TO_FORM_PATH.
//   • Otherwise → a CUSTOM rubric is auto-created from the (cleaned) label +
//     the document section it lives under. Custom rubrics are keyed
//     `custom:<category>:<slug>` and DEDUPLICATED by that key, so the same
//     fee appearing twice never produces two rubrics.
//
// Registry precedence uses a deliberately HIGH similarity bar: a wrong
// registry mapping is a data error, whereas a clean custom rubric is always
// safe. When in doubt, we create a custom rubric rather than risk a
// misclassification — this is what drives reliability toward zero-error.
//
// The category is always one of the edit-form tab ids so that auto-created
// custom fees render under the right tab (BankConditionsModal filters
// `customFees` by `category === activeTab`).
// ============================================================================

import { normalizeForMatch } from '../normalize';
import { bestRegistryFieldForPair } from './RubricMatcher';
import type { LabelValuePair } from './types';

/** Form-tab categories — MUST match the tab ids in BankConditionsModal so
 *  that auto-created custom fees appear under the correct tab. */
export type RubricCategory =
  | 'compte'
  | 'guichet'
  | 'cartes'
  | 'virements'
  | 'cheques'
  | 'credits'
  | 'ebanking'
  | 'divers';

export interface ClassifiedRubric {
  key: string;
  label: string;
  category: RubricCategory;
  source: 'registry' | 'custom';
}

export interface PairClassification extends ClassifiedRubric {
  /** Registry similarity that drove the decision (1 for custom rubrics). */
  similarity: number;
}

export interface ClassificationResult {
  /** One classification per input pair, aligned by index. */
  perPair: PairClassification[];
  /** Deduped catalog of the CUSTOM rubrics that were auto-created. Standard
   *  registry rubrics are already listed in the UI from FIELD_DEFINITIONS. */
  catalog: ClassifiedRubric[];
}

/** Similarity a registry candidate must clear to win over auto-creating a
 *  custom rubric. High on purpose — see file header. */
export const REGISTRY_ACCEPT_SIMILARITY = 0.78;

export const CUSTOM_RUBRIC_PREFIX = 'custom:';

export function isCustomRubricKey(key: string | undefined | null): key is string {
  return !!key && key.startsWith(CUSTOM_RUBRIC_PREFIX);
}

export function parseCustomRubricKey(
  key: string,
): { category: RubricCategory; slug: string } | null {
  if (!isCustomRubricKey(key)) return null;
  const rest = key.slice(CUSTOM_RUBRIC_PREFIX.length);
  const idx = rest.indexOf(':');
  if (idx === -1) return null;
  const category = rest.slice(0, idx) as RubricCategory;
  const slug = rest.slice(idx + 1);
  return { category, slug };
}

// ─── Category inference ─────────────────────────────────────────────────────
// Ordered most-specific → least. First group whose pattern hits wins.
const CATEGORY_PATTERNS: Array<{ category: RubricCategory; re: RegExp }> = [
  { category: 'ebanking', re: /\b(banque a distance|e-?banking|internet|en ligne|mobile|sms|token|digital|application|web|online|alerte)\b/ },
  { category: 'cartes',   re: /\b(carte|cartes|dab|gab|monetique|monétique|visa|mastercard|gim|gimac|retrait dab|paiement)\b/ },
  { category: 'cheques',  re: /\b(cheque|cheques|chèque|remise de cheque|impaye|impayé|opposition|certifi|carnet|formule)\b/ },
  { category: 'virements', re: /\b(virement|virements|transfert|swift|western|money ?gram|ria|permanent|prelevement|prélèvement|mise a disposition)\b/ },
  { category: 'credits',  re: /\b(credit|crédit|pret|prêt|agios|agio|interet|intérêt|decouvert|découvert|escompte|caution|aval|engagement|teg|usure|echeance|échéance|prorogation)\b/ },
  { category: 'guichet',  re: /\b(guichet|espece|espèce|especes|espèces|versement|retrait|caisse|change|devise|devises|billetage|encaissement)\b/ },
  { category: 'compte',   re: /\b(compte|tenue|ouverture|clotur|clôtur|releve|relevé|releves|relevés|rib|attestation|abonnement|gestion|epargne|épargne|arrete|arrêté|frais de tenue|domiciliation)\b/ },
];

/** Map a document section / label to one of the edit-form tab categories. */
export function sectionToCategory(section?: string, label?: string): RubricCategory {
  const haystack = normalizeForMatch(`${section ?? ''} ${label ?? ''}`);
  for (const { category, re } of CATEGORY_PATTERNS) {
    if (re.test(haystack)) return category;
  }
  return 'divers';
}

/** Best-effort category for a registry key (used only for display grouping). */
function registryCategory(key: string): RubricCategory {
  const k = key.toLowerCase();
  if (k.includes('ebank') || k.includes('distance')) return 'ebanking';
  if (k.includes('card') || k.includes('carte')) return 'cartes';
  if (k.includes('cheque') || k.includes('check')) return 'cheques';
  if (k.includes('transfer') || k.includes('virement')) return 'virements';
  if (k.includes('credit') || k.includes('interest') || k.includes('agios')) return 'credits';
  if (k.includes('guichet') || k.includes('cash') || k.includes('espece') || k.includes('change')) return 'guichet';
  if (k.includes('account') || k.includes('compte') || k.includes('releve') || k.includes('tenue')) return 'compte';
  return 'divers';
}

// ─── Label cleaning ─────────────────────────────────────────────────────────
const SECTION_NUMBER_PREFIX = /^(?:\d+(?:[.-]\d+){0,6})[\s.)-]*/;
const LEADING_CODE = /^\d{3,}\s+/; // stray numeric codes OCR prepends (e.g. "22336 ")
const TRAILING_NOISE = /\b(f\s?cfa|fcfa|xaf|xof|ttc|h\.?t\.?|hors\s?taxe|par\s+(mois|an|ligne|page|operation|opération))\b/gi;

/**
 * Turn a raw (often OCR-noisy) label into a human-readable rubric label.
 * Falls back to the trimmed original if cleaning would empty it — we never
 * drop a line, worst case we keep its raw text.
 */
export function cleanRubricLabel(raw: string): string {
  let s = (raw ?? '').replace(SECTION_NUMBER_PREFIX, '');
  s = s.replace(LEADING_CODE, '');
  s = s.replace(TRAILING_NOISE, ' ');
  s = s.replace(/[\s.·•…]+/g, ' ').trim();
  s = s.replace(/^[\s\-–—:.]+/, '').replace(/[\s\-–—:.]+$/, '').trim();
  if (!s) return (raw ?? '').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Stable, dedup-friendly key for a custom rubric. */
export function customRubricKey(category: RubricCategory, label: string): string {
  const slug =
    normalizeForMatch(label)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'autre';
  return `${CUSTOM_RUBRIC_PREFIX}${category}:${slug}`;
}

export interface ClassifyOptions {
  /** Clés de rubriques déjà VALIDÉES au référentiel (rubriques custom promues
   *  par un admin). Une paire dont la clé auto-créée y figure est traitée comme
   *  une rubrique CONNUE (source 'registry') : plus besoin de la proposer. */
  approvedKeys?: Set<string>;
}

// ─── Main entry ─────────────────────────────────────────────────────────────
export function classifyPairs(
  pairs: LabelValuePair[],
  opts: ClassifyOptions = {},
): ClassificationResult {
  const perPair: PairClassification[] = [];
  const catalog = new Map<string, ClassifiedRubric>();
  const approved = opts.approvedKeys ?? new Set<string>();

  for (const pair of pairs) {
    // 1. Strong registry match wins.
    const reg = bestRegistryFieldForPair(pair);
    if (reg && reg.similarity >= REGISTRY_ACCEPT_SIMILARITY) {
      perPair.push({
        key: reg.field.key,
        label: reg.field.label,
        category: registryCategory(reg.field.key),
        source: 'registry',
        similarity: reg.similarity,
      });
      continue;
    }

    // 2. Otherwise auto-create (or reuse) a custom rubric — never unattached.
    const label = cleanRubricLabel(pair.label);
    const category = sectionToCategory(pair.section, label);
    const key = customRubricKey(category, label);
    // 2bis. Rubrique déjà validée au référentiel → connue (pas une proposition).
    const isKnown = approved.has(key);
    perPair.push({
      key,
      label,
      category,
      source: isKnown ? 'registry' : 'custom',
      similarity: 1,
    });
    if (!isKnown && !catalog.has(key)) {
      catalog.set(key, { key, label, category, source: 'custom' });
    }
  }

  return { perPair, catalog: [...catalog.values()] };
}
