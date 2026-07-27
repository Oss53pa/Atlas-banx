// ============================================================================
// CDC — Modèle de succession temporelle des conditions
// ============================================================================
// En pratique, les conditions bancaires sont saisies avec UNIQUEMENT une date
// de début d'application. La date de fin est presque toujours implicite :
//
//   « Le début d'une condition est la fin de la précédente ; une condition
//     sans date de fin reste applicable indéfiniment. »
//
// Ce module classe une liste de conditions par date de début et déduit, à la
// lecture, l'intervalle réellement couvert par chacune, sans jamais avoir
// besoin de stocker la date de fin.
//
// Convention d'intervalle : demi-ouvert [effectiveFrom, effectiveTo) —
// la borne de fin est EXCLUE (elle appartient déjà à la condition suivante).
// Cohérent avec la vue matérialisée resolved_conditions (`effective_to > date`).
// Comparaisons à la granularité du JOUR (les colonnes SQL sont de type DATE).
//
// `effectiveTo` explicite = arrêt ferme (le tarif cesse, sans reprise
// automatique du précédent). Il crée un « trou » s'il n'existe pas de
// successeur pour couvrir la période suivante.
// ============================================================================

/** Toute entité datée résolvable par succession (versions L2, conventions…). */
export interface TemporalRange {
  effectiveFrom: Date;
  /** Fin explicite (arrêt ferme). `null` dans le cas normal (fin implicite). */
  effectiveTo: Date | null;
}

/** Une condition avec son intervalle de validité *déduit* par succession. */
export interface ClosedInterval<T extends TemporalRange> {
  item: T;
  effectiveFrom: Date;
  /**
   * Fin réelle (EXCLUE) après application du modèle de succession :
   * min(fin explicite, début du successeur). `null` = toujours applicable.
   */
  effectiveTo: Date | null;
  /** true si aucune fin (dernier tarif de la timeline, encore en vigueur). */
  isOpenEnded: boolean;
}

// ----------------------------------------------------------------------------
// Comparaisons à granularité JOUR (évite les pièges de fuseau/heure)
// ----------------------------------------------------------------------------

/** Clé de jour ISO `YYYY-MM-DD` (comparable lexicographiquement pour des dates). */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** true si `a` est un jour antérieur ou égal à `b`. */
function dayLte(a: Date, b: Date): boolean {
  return dayKey(a) <= dayKey(b);
}

/** true si `a` est un jour strictement antérieur à `b`. */
function dayLt(a: Date, b: Date): boolean {
  return dayKey(a) < dayKey(b);
}

// ----------------------------------------------------------------------------
// Classement chronologique
// ----------------------------------------------------------------------------

/**
 * Trie une liste par date de début croissante (le plus ancien d'abord).
 * Tri stable : en cas d'égalité de `effectiveFrom`, l'ordre d'origine est
 * préservé (les débuts identiques sont un problème de qualité de données).
 * Ne mute pas l'entrée.
 */
export function sortChronologically<T extends TemporalRange>(items: readonly T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const fa = dayKey(a.item.effectiveFrom);
      const fb = dayKey(b.item.effectiveFrom);
      if (fa < fb) return -1;
      if (fa > fb) return 1;
      return a.index - b.index; // stable
    })
    .map((x) => x.item);
}

// ----------------------------------------------------------------------------
// Fermeture des intervalles (pour affichage / classement)
// ----------------------------------------------------------------------------

/**
 * Classe les conditions et déduit l'intervalle réel de chacune selon le
 * modèle de succession : la fin d'une condition = le début de la suivante.
 * Une fin explicite (`effectiveTo`) plus précoce prime (arrêt ferme).
 *
 * Le résultat est ordonné chronologiquement et prêt pour une timeline UI.
 */
export function closeIntervals<T extends TemporalRange>(
  items: readonly T[],
): ClosedInterval<T>[] {
  const sorted = sortChronologically(items);

  return sorted.map((item, i) => {
    const successor = sorted[i + 1];
    const naturalEnd = successor ? successor.effectiveFrom : null; // fin implicite
    const explicitEnd = item.effectiveTo; // arrêt ferme éventuel

    let effectiveTo: Date | null;
    if (explicitEnd && naturalEnd) {
      // La borne la plus précoce l'emporte (arrêt ferme avant le successeur,
      // ou successeur qui démarre avant une fin explicite erronée).
      effectiveTo = dayLt(explicitEnd, naturalEnd) ? explicitEnd : naturalEnd;
    } else {
      effectiveTo = explicitEnd ?? naturalEnd;
    }

    return {
      item,
      effectiveFrom: item.effectiveFrom,
      effectiveTo,
      isOpenEnded: effectiveTo === null,
    };
  });
}

// ----------------------------------------------------------------------------
// Résolution : quelle condition s'applique à une date donnée ?
// ----------------------------------------------------------------------------

/**
 * Renvoie la condition en vigueur à `at` selon le modèle de succession :
 *   - la condition retenue est celle dont la date de début est la plus récente
 *     parmi celles antérieures ou égales à `at` ;
 *   - un successeur (début > `at`) n'entre jamais en compte ;
 *   - une condition sans date de fin reste applicable indéfiniment ;
 *   - une fin explicite antérieure à `at` = arrêt ferme → aucune condition
 *     applicable (trou), sans reprise automatique de la précédente.
 *
 * Renvoie `null` si aucune condition n'a démarré à `at`, ou en cas de trou.
 */
export function findApplicableAt<T extends TemporalRange>(
  items: readonly T[],
  at: Date,
): T | null {
  // Candidats : ceux qui ont déjà commencé à la date de référence.
  const started = items.filter((i) => dayLte(i.effectiveFrom, at));
  if (started.length === 0) return null;

  // Le plus récent début l'emporte (le dernier de la timeline avant `at`).
  const chrono = sortChronologically(started);
  const candidate = chrono[chrono.length - 1];

  // Arrêt ferme : la condition retenue a une fin explicite déjà dépassée.
  // Aucun successeur ne couvre `at` (sinon il aurait un début <= `at` plus
  // récent et serait lui-même candidat), donc c'est un trou.
  if (candidate.effectiveTo !== null && !dayLt(at, candidate.effectiveTo)) {
    return null;
  }

  return candidate;
}
