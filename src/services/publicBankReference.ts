// ============================================================================
// ATLASBANX — Lecture publique du référentiel L2 (sans compte)
// ============================================================================
// Appelle l'Edge Function `public-bank-reference` pour récupérer les conditions
// de référence PUBLIÉES (L2) d'une banque. Permet au funnel Particulier de
// comparer un relevé au barème officiel de la banque, sans authentification.
// ============================================================================

import { getSupabaseClient } from '../lib/supabase';

export interface PublicRefCondition {
  rubric_code: string;
  value_numeric: number | null;
  dimensions: unknown;
}

export interface PublicBankReference {
  bankCode: string;
  found: boolean;
  legalName?: string;
  versionLabel?: string | null;
  effectiveFrom?: string;
  conditions: PublicRefCondition[];
}

/**
 * Récupère le référentiel L2 publié d'une banque à une date donnée.
 * Renvoie null si indisponible (Supabase non configuré, erreur réseau).
 */
export async function fetchPublicBankReference(
  bankCode: string,
  referenceDate?: string,
): Promise<PublicBankReference | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.functions.invoke('public-bank-reference', {
      body: { bankCode, referenceDate },
    });
    if (error || !data) return null;
    return data as PublicBankReference;
  } catch {
    return null;
  }
}
