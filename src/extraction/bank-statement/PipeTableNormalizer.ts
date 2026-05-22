// ============================================================================
// ATLASBANX — Pipe-table normalizer
// ============================================================================
// Certaines banques (NSIA Banque CI, et autres relevés issus de mainframes /
// AS400) impriment leurs tableaux en "ASCII-art" : les colonnes sont
// délimitées par un caractère bordure (« ! » ou « | ») EMBARQUÉ à l'intérieur
// d'un même item texte. Exemple d'un item unique extrait par pdfjs :
//
//     "!02/01/2025 !31/12/2024 !SCPM"   (x=133, width=147)
//
// Le détecteur de structure raisonne sur les positions X de chaque item ; il
// ne voit ici qu'UN bloc → aucune colonne date/montant n'est reconnue, et
// l'extraction échoue (0 transaction).
//
// Ce module détecte ce format et "explose" chaque item bordé en sous-items
// individuellement positionnés, en estimant le X de chaque segment d'après
// son offset de caractère dans l'item d'origine. Après normalisation, le
// pipeline générique (HeaderDetector → snap → buildTransaction) fonctionne
// normalement.
//
// SÛRETÉ : transparent pour les relevés classiques. Si le document n'utilise
// pas de bordure ASCII (< MIN_BORDER_ITEMS items concernés), les items sont
// renvoyés inchangés — aucun risque de régression sur les formats tabulaires
// standards.
// ============================================================================

import type { PositionedItem } from './types';

/** Caractères bordure ASCII reconnus, par ordre de priorité de détection. */
const BORDER_CHARS = ['!', '|'] as const;

/** Nombre minimal d'items contenant la bordure pour activer la normalisation.
 *  Empêche un déclenchement accidentel sur un libellé contenant un « ! ». */
const MIN_BORDER_ITEMS = 8;

/**
 * Détecte le caractère bordure dominant (« ! » ou « | ») s'il structure le
 * document, sinon renvoie null.
 */
function detectBorderChar(items: PositionedItem[]): string | null {
  let bestChar: string | null = null;
  let bestCount = 0;
  for (const ch of BORDER_CHARS) {
    const count = items.reduce((n, it) => (it.text.includes(ch) ? n + 1 : n), 0);
    if (count > bestCount) {
      bestCount = count;
      bestChar = ch;
    }
  }
  return bestCount >= MIN_BORDER_ITEMS ? bestChar : null;
}

/**
 * Explose les items délimités par un caractère bordure en sous-items
 * positionnés. No-op (renvoie le tableau d'origine) si le document n'est pas
 * un tableau bordé ASCII.
 */
export function explodePipeDelimitedItems(items: PositionedItem[]): PositionedItem[] {
  const border = detectBorderChar(items);
  if (!border) return items;

  const out: PositionedItem[] = [];
  for (const it of items) {
    if (!it.text.includes(border)) {
      out.push(it);
      continue;
    }
    const fullWidth = it.width && it.width > 0 ? it.width : it.text.length * 4;
    const len = Math.max(1, it.text.length);
    let charIdx = 0;
    for (const segment of it.text.split(border)) {
      const startIdx = charIdx;
      charIdx += segment.length + 1; // +1 pour la bordure consommée
      const trimmed = segment.trim();
      if (!trimmed) continue;
      // Estime le X du segment d'après son offset de caractère (les numéros
      // sont rarement parfaitement alignés mais l'approximation suffit au
      // snapping par colonne, qui retombe sur la colonne la plus proche).
      out.push({
        text: trimmed,
        page: it.page,
        x: it.x + (startIdx / len) * fullWidth,
        y: it.y,
        width: (segment.length / len) * fullWidth,
        height: it.height,
      });
    }
  }
  return out;
}

/** Exposé pour les tests / le diagnostic : le format est-il un tableau bordé ? */
export function isPipeDelimited(items: PositionedItem[]): boolean {
  return detectBorderChar(items) !== null;
}
