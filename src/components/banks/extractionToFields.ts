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
import type { ExtractedField } from '../../cdc/components/SplitScreenValidator';

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
