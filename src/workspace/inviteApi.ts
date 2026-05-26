// ============================================================================
// inviteApi — gestion des invitations de membres (atlasbanx.workspace_invites)
// ============================================================================
// CRUD sur les invitations + acceptation. La RLS (migr. 026) gère les droits :
//   - SELECT : tout membre du workspace (ou l'invité par son email)
//   - INSERT/DELETE : DG du workspace uniquement
//   - acceptation : RPC SECURITY DEFINER accept_workspace_invites (migr. 030)
// ============================================================================

import { getSupabaseClient } from '../lib/supabase';
import type { CabinetRole, WorkspaceInvite } from './types';

interface InviteRow {
  id: string;
  workspace_id: string;
  email: string;
  role: CabinetRole;
  invited_by: string | null;
  accepted_at: string | null;
  created_at: string;
}

function mapInvite(r: InviteRow): WorkspaceInvite {
  return {
    id: r.id,
    workspaceId: r.workspace_id,
    email: r.email,
    role: r.role,
    invitedBy: r.invited_by,
    acceptedAt: r.accepted_at ? new Date(r.accepted_at) : null,
    createdAt: new Date(r.created_at),
  };
}

/** Liste les invitations d'un workspace (acceptées + en attente). */
export async function listInvites(workspaceId: string): Promise<WorkspaceInvite[]> {
  const sb = getSupabaseClient();
  if (!sb) return [];
  const { data, error } = await sb
    .schema('atlasbanx' as never)
    .from('workspace_invites' as never)
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[inviteApi] listInvites failed:', error.message);
    return [];
  }
  return ((data ?? []) as InviteRow[]).map(mapInvite);
}

/** Crée une invitation (DG uniquement — la RLS rejette sinon). */
export async function createInvite(
  workspaceId: string,
  email: string,
  role: CabinetRole,
  invitedBy: string,
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: 'Supabase non configuré' };
  const { error } = await sb
    .schema('atlasbanx' as never)
    .from('workspace_invites' as never)
    .insert({
      workspace_id: workspaceId,
      email: email.trim().toLowerCase(),
      role,
      invited_by: invitedBy,
    } as never);
  if (error) {
    // 23505 = unique_violation (déjà invité)
    const msg = error.code === '23505'
      ? 'Cet email est déjà invité dans ce cabinet.'
      : error.message;
    return { ok: false, error: msg };
  }
  return { ok: true };
}

/** Révoque une invitation (DG uniquement). */
export async function revokeInvite(inviteId: string): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: 'Supabase non configuré' };
  const { error } = await sb
    .schema('atlasbanx' as never)
    .from('workspace_invites' as never)
    .delete()
    .eq('id', inviteId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Accepte les invitations en attente de l'utilisateur courant (RPC). Retourne le nb acceptées. */
export async function acceptMyInvites(): Promise<number> {
  const sb = getSupabaseClient();
  if (!sb) return 0;
  const { data, error } = await sb
    .schema('atlasbanx' as never)
    .rpc('accept_workspace_invites' as never);
  if (error) {
    console.error('[inviteApi] acceptMyInvites failed:', error.message);
    return 0;
  }
  return typeof data === 'number' ? data : 0;
}
