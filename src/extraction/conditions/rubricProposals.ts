// ============================================================================
// ATLASBANX — Rubriques proposées (proposer → l'admin valide → auto-créée)
// ============================================================================
// Quand une condition importée porte une rubrique ABSENTE de l'application
// (rubrique « custom » auto-créée), l'utilisateur peut la PROPOSER au
// référentiel. Un administrateur la valide ou la rejette. Une fois validée,
// la rubrique devient connue de l'application et alimente les imports suivants
// (combobox + reconnaissance automatique par libellé).
//
// Persistance : table atlasbanx.rubric_proposals + RPC admin
// approve_rubric_proposal / reject_rubric_proposal (voir migration 052).
// ============================================================================

import { getSupabaseClient } from '../../lib/supabase';
import type { RubricCategory } from './RubricClassifier';

export type ProposalStatus = 'proposed' | 'approved' | 'rejected';

export interface RubricProposal {
  id: string;
  rubricKey: string;
  label: string;
  category: RubricCategory;
  unit: string;
  status: ProposalStatus;
  sourceLabel: string | null;
  bankCode: string | null;
  proposedBy: string | null;
  validatedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
  validatedAt: string | null;
}

export interface ProposeRubricInput {
  rubricKey: string;
  label: string;
  category: RubricCategory;
  /** 'amount' | 'percent' | 'days' … (défaut 'amount'). */
  unit?: string;
  /** Libellé brut extrait du document (contexte admin). */
  sourceLabel?: string;
  bankCode?: string;
}

function rowToProposal(r: Record<string, unknown>): RubricProposal {
  return {
    id: String(r.id),
    rubricKey: String(r.rubric_key),
    label: String(r.label),
    category: String(r.category) as RubricCategory,
    unit: String(r.unit ?? 'amount'),
    status: String(r.status) as ProposalStatus,
    sourceLabel: (r.source_label as string | null) ?? null,
    bankCode: (r.bank_code as string | null) ?? null,
    proposedBy: (r.proposed_by as string | null) ?? null,
    validatedBy: (r.validated_by as string | null) ?? null,
    rejectionReason: (r.rejection_reason as string | null) ?? null,
    createdAt: String(r.created_at),
    validatedAt: (r.validated_at as string | null) ?? null,
  };
}

/**
 * Propose une nouvelle rubrique au référentiel. Idempotent : reproposer la
 * même clé (contrainte unique) ne crée pas de doublon — on renvoie
 * l'éventuelle proposition existante. Retourne null si Supabase indisponible.
 */
export async function proposeRubric(input: ProposeRubricInput): Promise<RubricProposal | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .schema('atlasbanx')
    .from('rubric_proposals')
    .insert({
      rubric_key: input.rubricKey,
      label: input.label,
      category: input.category,
      unit: input.unit ?? 'amount',
      source_label: input.sourceLabel ?? null,
      bank_code: input.bankCode ?? null,
      status: 'proposed',
    })
    .select()
    .single();

  if (error) {
    // 23505 = doublon (clé déjà proposée). On récupère la ligne existante.
    if (error.code === '23505') {
      const existing = await supabase
        .schema('atlasbanx')
        .from('rubric_proposals')
        .select('*')
        .eq('rubric_key', input.rubricKey)
        .maybeSingle();
      return existing.data ? rowToProposal(existing.data as Record<string, unknown>) : null;
    }
    throw new Error(`Proposition de rubrique impossible : ${error.message}`);
  }
  return data ? rowToProposal(data as Record<string, unknown>) : null;
}

/** Liste les propositions par statut (admin voit tout ; les autres ne voient
 *  que les « approved » via la RLS). Défaut : toutes. */
export async function listRubricProposals(status?: ProposalStatus): Promise<RubricProposal[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  let query = supabase
    .schema('atlasbanx')
    .from('rubric_proposals')
    .select('*')
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToProposal);
}

/** Rubriques VALIDÉES — connues de l'application, réutilisées aux imports. */
export async function listApprovedRubrics(): Promise<RubricProposal[]> {
  return listRubricProposals('approved');
}

/** Valide une proposition (admin). La rubrique devient connue. */
export async function approveRubricProposal(id: string): Promise<RubricProposal | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .schema('atlasbanx')
    .rpc('approve_rubric_proposal', { p_id: id });
  if (error) throw new Error(`Validation impossible : ${error.message}`);
  return data ? rowToProposal(data as Record<string, unknown>) : null;
}

/** Rejette une proposition (admin). */
export async function rejectRubricProposal(id: string, reason?: string): Promise<RubricProposal | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .schema('atlasbanx')
    .rpc('reject_rubric_proposal', { p_id: id, p_reason: reason ?? null });
  if (error) throw new Error(`Rejet impossible : ${error.message}`);
  return data ? rowToProposal(data as Record<string, unknown>) : null;
}
