// ============================================================================
// TeamManagementPage — gestion des membres du cabinet + invitations
// ============================================================================
// DG : invite par email (rôle), révoque les invitations en attente, voit le
// roster. Autres rôles : lecture seule du roster. S'appuie sur la RLS
// (workspace_invites) — les actions DG-only échouent côté serveur pour les
// non-DG, mais on masque aussi l'UI par sécurité/UX.
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, UserPlus, Mail, Trash2, ShieldCheck } from 'lucide-react';
import {
  Card, CardHeader, CardTitle, CardDescription, CardBody,
  Button, Badge, Input, Select, Alert, ConfirmDialog,
} from '../ui';
import { useWorkspace, useRole } from '../../workspace';
import { listInvites, createInvite, revokeInvite } from '../../workspace';
import { ROLE_LABEL, type CabinetRole, type WorkspaceInvite } from '../../workspace/types';
import { loadTeamMembers } from '../../features/statement-detail/api/teamApi';
import type { MentionableUser } from '../shared';
import { useAuthStore } from '../../store/authStore';
import { formatDate } from '../../utils';

const INVITABLE_ROLES: CabinetRole[] = ['junior', 'senior', 'dg', 'consultation'];

export function TeamManagementPage() {
  const { workspace } = useWorkspace();
  const { can } = useRole();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const isDg = can.admin;

  const [members, setMembers] = useState<MentionableUser[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CabinetRole>('junior');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<WorkspaceInvite | null>(null);

  const wsId = workspace?.id ?? null;

  const refresh = useCallback(async () => {
    if (!wsId) return;
    setLoading(true);
    try {
      const [m, i] = await Promise.all([loadTeamMembers(wsId), listInvites(wsId)]);
      setMembers(m);
      setInvites(i);
    } finally {
      setLoading(false);
    }
  }, [wsId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const pendingInvites = useMemo(() => invites.filter((i) => !i.acceptedAt), [invites]);

  const handleInvite = async () => {
    if (!wsId || !userId) return;
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setFeedback({ kind: 'error', msg: 'Adresse email invalide.' });
      return;
    }
    if (members.some((m) => m.handle && m.displayName && trimmed && m.displayName.toLowerCase().includes(trimmed))) {
      // best-effort guard ; la contrainte unique gère le doublon réel
    }
    setSubmitting(true);
    setFeedback(null);
    const res = await createInvite(wsId, trimmed, role, userId);
    setSubmitting(false);
    if (res.ok) {
      setEmail('');
      setRole('junior');
      setFeedback({ kind: 'success', msg: `Invitation envoyée à ${trimmed}.` });
      void refresh();
    } else {
      setFeedback({ kind: 'error', msg: res.error ?? 'Échec de l’invitation.' });
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    const res = await revokeInvite(revokeTarget.id);
    setRevokeTarget(null);
    if (res.ok) {
      void refresh();
    } else {
      setFeedback({ kind: 'error', msg: res.error ?? 'Échec de la révocation.' });
    }
  };

  if (!workspace) {
    return (
      <div className="text-center py-12 text-primary-500">
        <Users className="w-10 h-10 mx-auto mb-3 text-primary-300" />
        <p>Aucun espace de travail actif.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-900 flex items-center justify-center">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-primary-900">Équipe — {workspace.name}</h1>
          <p className="text-sm text-primary-500">
            {members.length} membre{members.length > 1 ? 's' : ''}
            {pendingInvites.length > 0 && ` · ${pendingInvites.length} invitation${pendingInvites.length > 1 ? 's' : ''} en attente`}
          </p>
        </div>
      </div>

      {feedback && (
        <Alert variant={feedback.kind === 'success' ? 'success' : 'error'} title={feedback.kind === 'success' ? 'Succès' : 'Erreur'}>
          {feedback.msg}
        </Alert>
      )}

      {/* Invite form — DG only */}
      {isDg && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Inviter un membre
            </CardTitle>
            <CardDescription>
              L’invité rejoindra ce cabinet à sa prochaine connexion (rattachement par email).
            </CardDescription>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-primary-700 mb-1">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="collaborateur@cabinet.com"
                />
              </div>
              <div className="sm:w-48">
                <label className="block text-sm font-medium text-primary-700 mb-1">Rôle</label>
                <Select value={role} onChange={(e) => setRole(e.target.value as CabinetRole)}>
                  {INVITABLE_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                  ))}
                </Select>
              </div>
              <Button onClick={handleInvite} disabled={submitting || !email.trim()}>
                <Mail className="w-4 h-4 mr-1.5" />
                {submitting ? 'Envoi…' : 'Inviter'}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Members roster */}
      <Card>
        <CardHeader>
          <CardTitle>Membres</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {loading && members.length === 0 ? (
            <p className="p-6 text-center text-sm text-primary-400">Chargement…</p>
          ) : members.length === 0 ? (
            <p className="p-6 text-center text-sm text-primary-400">Aucun membre.</p>
          ) : (
            <div className="divide-y divide-primary-100">
              {members.map((m) => (
                <div key={m.userId} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700">
                      {(m.displayName || '?').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-primary-900">{m.displayName}</p>
                      <p className="text-xs text-primary-400">@{m.handle}</p>
                    </div>
                  </div>
                  {m.role && (
                    <Badge variant={m.role === 'dg' ? 'warning' : 'secondary'} className="text-[11px] flex items-center gap-1">
                      {m.role === 'dg' && <ShieldCheck className="w-3 h-3" />}
                      {ROLE_LABEL[m.role as CabinetRole]}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Pending invites — DG only */}
      {isDg && pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invitations en attente</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-primary-100">
              {pendingInvites.map((inv) => (
                <div key={inv.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary-900">{inv.email}</p>
                    <p className="text-xs text-primary-400">
                      {ROLE_LABEL[inv.role]} · invité le {formatDate(inv.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => setRevokeTarget(inv)}
                    className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                    title="Révoquer l’invitation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <ConfirmDialog
        isOpen={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title="Révoquer l’invitation"
        message={`Annuler l’invitation de ${revokeTarget?.email ?? ''} ?`}
        confirmLabel="Révoquer"
        variant="danger"
      />
    </div>
  );
}
