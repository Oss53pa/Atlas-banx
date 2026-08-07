// ============================================================================
// extractionToFields — mappe le résultat de `extractConditions` vers les
// `ExtractedField[]` attendus par le SplitScreenValidator.
// ============================================================================
// Le vrai extracteur (src/extraction/conditions) renvoie un `matches` par
// rubrique (RubricMatch) avec un FieldDefinition, la paire label/valeur
// source, sa bounding box PDF et une confiance 0-1. On convertit ça vers le
// type UI ExtractedField { id, rubricCode, label, value, unit, bbox, confidence }.
// ============================================================================

import type { ConditionsExtractionResult } from '../../extraction/conditions';
import { toTaxonomyCode } from '../../extraction/conditions/registryToTaxonomy';
import type { ExtractedField } from '../../cdc/components/SplitScreenValidator';
import type { ValidatedConditionLine } from '../../types';

/** Mappe la confiance numérique (0-1) de l'extracteur en catégorie UI. */
function toConfidenceCategory(score: number): ExtractedField['confidence'] {
  if (score >= 0.7) return 'high';
  if (score >= 0.45) return 'medium';
  return 'low';
}

/**
 * Convertit un résultat d'extraction en champs éditables pour le validateur.
 * Un champ par rubrique matchée. Les paires non rattachées ne sont pas
 * incluses (l'utilisateur peut toujours ajouter des champs manuellement).
 */
export function extractionResultToFields(
  result: ConditionsExtractionResult,
): ExtractedField[] {
  return Object.entries(result.matches).map(([key, match]) => {
    const { field, pair } = match;

    // BoundingBox PDF (origine bottom-left) → { page, x, y, w, h }.
    const bb = pair.boundingBox;
    const bbox = bb
      ? {
          page: bb.page,
          x: bb.xLeft,
          y: bb.yBottom,
          w: bb.xRight - bb.xLeft,
          h: bb.yTop - bb.yBottom,
        }
      : null;

    // Valeur affichée : la chaîne brute vue dans le document est la plus
    // fidèle ; à défaut la valeur numérique parsée.
    const value: string | number | null =
      pair.rawValue?.trim() ? pair.rawValue.trim() : pair.value;

    return {
      id: `fld-${key}`,
      rubricCode: field.key,
      label: field.label,
      value,
      unit: pair.unit ?? field.unitHint,
      bbox,
      confidence: toConfidenceCategory(match.confidence),
    };
  });
}

// Valeurs qualitatives signifiant « 0 » (tarif gratuit). Elles doivent se
// publier comme 0 FCFA — sinon la valeur numérique est nulle et l'audit ignore
// la ligne, alors qu'un tarif gratuit est une donnée réelle (= 0).
const FREE_QUALITATIVES = new Set(['gratuit', 'neant', 'franco']);
const QUALITATIVE_TEXT: Record<string, string> = {
  gratuit: 'Gratuit', neant: 'Néant', franco: 'Franco',
  consulter: 'Nous consulter', souscription: 'À la souscription', other: 'Variable',
};

/**
 * Convertit les lignes VALIDÉES par l'utilisateur (à l'import) en champs du
 * validateur. Les codes de rubrique sont traduits en taxonomie CDC (que l'audit
 * sait lire). Priorité sur la ré-extraction : on publie exactement ce que
 * l'utilisateur a validé / corrigé.
 */
export function validatedConditionsToFields(
  lines: ValidatedConditionLine[],
): ExtractedField[] {
  return lines.map((l, i) => {
    // Tarif gratuit (gratuit/néant/franco) → valeur 0 (donnée réelle), et on
    // précise la mention dans le libellé. Autres qualitatifs (« nous
    // consulter »…) : valeur inconnue → on garde la phrase.
    let value: string | number;
    if (l.qualitative && FREE_QUALITATIVES.has(l.qualitative)) value = 0;
    else if (l.qualitative) value = QUALITATIVE_TEXT[l.qualitative] ?? l.qualitative;
    else value = l.value;

    const label = l.qualitative && FREE_QUALITATIVES.has(l.qualitative)
      ? `${l.label} (${QUALITATIVE_TEXT[l.qualitative] ?? l.qualitative})`
      : l.label;

    return {
      id: `fld-val-${i}`,
      rubricCode: toTaxonomyCode(l.rubricKey),
      label,
      value,
      unit: (l.unit as ExtractedField['unit']) ?? undefined,
      bbox: null,
      confidence: 'high',
    };
  });
}
