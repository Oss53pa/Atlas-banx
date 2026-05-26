// ============================================================================
// ATLASBANX — Workspace store (Zustand)
// ============================================================================
// Holds the active workspace + the current user's role within it.
// Loaded once at app boot from atlasbanx.workspaces + cabinet_members.
//
// This is the single source of truth for "am I in cabinet or entreprise mode?"
// and "what can the current user do?". Read via useWorkspace() / useRole().
// ============================================================================

import { create } from 'zustand';
import { getSupabaseClient } from '../lib/supabase';
import type { CabinetMember, CabinetRole, Workspace, WorkspaceType } from './types';

interface WorkspaceState {
  loading: boolean;
  /** Active workspace for the connected user. */
  workspace: Workspace | null;
  /** Current user's role in the active workspace. */
  myRole: CabinetRole | null;
  /** All members of the active workspace (for the team management UI). */
  members: CabinetMember[];
  error: string | null;

  // Actions
  load: (userId: string) => Promise<void>;
  /**
   * Garantit qu'un workspace existe pour l'utilisateur : charge l'existant et,
   * s'il n'a aucune appartenance, en crée un (1 par user, rôle DG) via le RPC
   * SECURITY DEFINER create_workspace_with_dg, puis recharge.
   * No-op en mode démo / sans Supabase. Respecte les cabinets multi-membres
   * déjà existants (ne crée rien si l'user est déjà membre).
   */
  ensureWorkspace: (
    userId: string,
    opts?: { accountType?: 'enterprise' | 'cabinet'; name?: string },
  ) => Promise<void>;
  setActiveWorkspace: (workspace: Workspace, role: CabinetRole) => void;
  reset: () => void;
}

/** Mappe le account_type du profil (anglais) vers le workspace_type (français). */
function workspaceTypeFromAccount(
  accountType?: 'enterprise' | 'cabinet',
): WorkspaceType {
  return accountType === 'enterprise' ? 'entreprise' : 'cabinet';
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  loading: false,
  workspace: null,
  myRole: null,
  members: [],
  error: null,

  load: async (userId: string) => {
    set({ loading: true, error: null });
    const supabase = getSupabaseClient();
    if (!supabase) {
      set({ loading: false });
      return;
    }

    try {
      // Find the user's workspace via membership
      const { data: membership, error: memErr } = await supabase
        .schema('atlasbanx')
        .from('cabinet_members')
        .select('workspace_id, role')
        .eq('user_id', userId)
        .maybeSingle();

      if (memErr) {
        console.warn('[workspaceStore] load membership failed:', memErr.message, {
          code: memErr.code, details: memErr.details, hint: memErr.hint,
        });
      }

      if (!membership) {
        // No workspace yet — caller should bootstrap one (signup flow)
        set({ loading: false, workspace: null, myRole: null });
        return;
      }

      const { data: ws, error: wsErr } = await supabase
        .schema('atlasbanx')
        .from('workspaces')
        .select('*')
        .eq('id', membership.workspace_id)
        .single();

      if (wsErr || !ws) {
        set({ loading: false, error: wsErr?.message ?? 'Workspace introuvable' });
        return;
      }

      // Load all members of this workspace
      const { data: members } = await supabase
        .schema('atlasbanx')
        .from('cabinet_members')
        .select('*')
        .eq('workspace_id', ws.id);

      set({
        loading: false,
        workspace: {
          id: ws.id,
          name: ws.name,
          type: ws.type as WorkspaceType,
          ownerId: ws.owner_id,
          settings: ws.settings ?? {},
          createdAt: new Date(ws.created_at),
          updatedAt: new Date(ws.updated_at),
        },
        myRole: membership.role as CabinetRole,
        members: (members ?? []).map((m) => ({
          id: m.id,
          workspaceId: m.workspace_id,
          userId: m.user_id,
          role: m.role as CabinetRole,
          invitedBy: m.invited_by,
          createdAt: new Date(m.created_at),
        })),
        error: null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('[workspaceStore] load failed:', msg);
      set({ loading: false, error: msg });
    }
  },

  ensureWorkspace: async (userId, opts) => {
    const supabase = getSupabaseClient();
    if (!supabase) return; // mode démo / pas de backend → no-op

    // 1) Charge l'éventuel workspace existant.
    await get().load(userId);
    const state = get();
    if (state.workspace) return;        // déjà membre d'un workspace → rien à faire
    if (state.error) return;            // le load a échoué → ne pas créer de doublon

    // 2) Aucune appartenance → bootstrap atomique via RPC SECURITY DEFINER.
    try {
      const { error: rpcErr } = await supabase
        .schema('atlasbanx')
        .rpc('create_workspace_with_dg', {
          p_name: opts?.name?.trim() || 'Mon espace',
          p_type: workspaceTypeFromAccount(opts?.accountType),
        });
      if (rpcErr) {
        console.error('[workspaceStore] create_workspace_with_dg failed:', rpcErr.message);
        return;
      }
    } catch (err) {
      console.error('[workspaceStore] ensureWorkspace RPC threw:', err);
      return;
    }

    // 3) Recharge pour peupler workspace + role + members.
    await get().load(userId);
  },

  setActiveWorkspace: (workspace, role) => {
    set({ workspace, myRole: role });
  },

  reset: () => {
    set({ loading: false, workspace: null, myRole: null, members: [], error: null });
  },
}));
