// ============================================================================
// ATLASBANX — Association fichier → banque pour l'import GROUPÉ
// ============================================================================
// Devine la banque d'un fichier à partir de son nom (ex. « UBA_CI_2024.pdf »
// → « UBA Côte d'Ivoire »). Purement heuristique : la suggestion est toujours
// corrigeable par l'utilisateur dans l'écran d'assignation.
// ============================================================================

import type { Bank } from '../../types';

// Mots trop génériques pour discriminer une banque (présents dans presque tous
// les noms) ou parties de pays/mentions tarifaires → ignorés au scoring.
const STOP = new Set([
  'banque', 'bank', 'de', 'du', 'des', 'la', 'le', 'les', 'et', 'pour', 'sa',
  'groupe', 'group', 'international', 'the', 'cote', 'divoire', 'ivoire',
  'conditions', 'tarifaires', 'tarifaire', 'tarif', 'tarifs', 'grille',
  'standard', 'chartered', 'generale', 'societe',
  'pdf', 'xlsx', 'xls', 'csv', 'scan', 'scanne', 'copie', 'final', 'v1', 'v2',
]);

function norm(s: string): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les accents
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokenize(s: string): string[] {
  return norm(s).split(/\s+/).filter(Boolean);
}

export interface BankFileMatch {
  /** Banque suggérée (null si aucune assez plausible). */
  bankId: string | null;
  /** Score de la meilleure banque (0 = rien). */
  score: number;
  /** true si le 2e candidat est proche → suggestion à revérifier. */
  ambiguous: boolean;
}

/**
 * Suggère la banque la plus plausible pour un nom de fichier.
 * Signaux (par ordre de force) : code banque contenu dans le nom > token
 * distinctif du nom de banque présent > code pays ISO présent.
 */
export function matchBankByFilename(fileName: string, banks: Bank[]): BankFileMatch {
  const fileFlat = norm(fileName).replace(/\s+/g, '');
  const fileTokens = new Set(tokenize(fileName));

  let bestId: string | null = null;
  let bestScore = 0;
  let secondScore = 0;

  for (const b of banks) {
    let score = 0;

    const code = (b.code ?? '').toLowerCase();
    if (code.length >= 4 && fileFlat.includes(code)) score += 6;

    for (const t of tokenize(b.name)) {
      if (t.length < 3 || STOP.has(t)) continue;
      if (fileTokens.has(t)) score += 3;
    }

    const iso = (b.country ?? '').toLowerCase();
    if (iso.length === 2 && fileTokens.has(iso)) score += 1;

    if (score > bestScore) {
      secondScore = bestScore;
      bestScore = score;
      bestId = b.id;
    } else if (score > secondScore) {
      secondScore = score;
    }
  }

  return {
    bankId: bestScore >= 3 ? bestId : null,
    score: bestScore,
    // Deux candidats à moins de 3 points d'écart → on marque « à vérifier ».
    ambiguous: bestScore >= 3 && bestScore - secondScore < 3,
  };
}
