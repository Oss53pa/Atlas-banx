/**
 * @module AtlasBanx
 * @file src/components/auth/MfaGate.tsx
 * @description Barrière produit (app-side) imposant l'enrôlement MFA aux
 *              comptes CABINET. Si le workspace actif est un cabinet et que
 *              l'utilisateur n'a aucun facteur TOTP vérifié, l'accès est
 *              remplacé par un écran d'enrôlement bloquant.
 *
 *              IMPORTANT — fail SAFE : il ne s'agit PAS d'une frontière de
 *              sécurité (l'API et la RLS restent la vraie protection) mais d'un
 *              garde-fou produit. En cas de doute (Supabase non configuré,
 *              impossibilité de lister les facteurs, workspace non chargé), on
 *              LAISSE PASSER et on journalise, afin de ne jamais verrouiller
 *              l'utilisateur hors de son application (auto-lockout).
 */

import { useCallback, useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../ui';
import { MfaSettings } from '../settings/MfaSettings';
import { useMfa } from '../../hooks/useMfa';
import { useWorkspace } from '../../workspace/useWorkspace';
import { useAuthStore } from '../../store/authStore';
import { isSupabaseConfigured } from '../../lib/supabase';

type GateState = 'checking' | 'allowed' | 'required';

export function MfaGate({ children }: { children: React.ReactNode }) {
  const { isCabinet, loading } = useWorkspace();
  const { hasVerifiedTotp } = useMfa();
  const signOut = useAuthStore((s) => s.signOut);
  const [state, setState] = useState<GateState>('checking');

  const check = useCallback(async () => {
    // Non-cabinet → jamais concerné.
    if (!isCabinet) {
      setState('allowed');
      return;
    }
    // Fail-safe : sans backend, on ne peut pas vérifier → laisser passer.
    if (!isSupabaseConfigured()) {
      console.warn('[MfaGate] Supabase non configuré — MFA non imposée (fail-safe).');
      setState('allowed');
      return;
    }
    try {
      const ok = await hasVerifiedTotp();
      setState(ok ? 'allowed' : 'required');
    } catch (err) {
      // Fail-safe : impossible de lister les facteurs → ne pas bloquer.
      console.warn('[MfaGate] Vérification MFA impossible — accès autorisé (fail-safe).', err);
      setState('allowed');
    }
  }, [isCabinet, hasVerifiedTotp]);

  useEffect(() => {
    // Attendre la fin du chargement du workspace pour connaître isCabinet.
    if (loading) return;
    void check();
  }, [loading, check]);

  if (state === 'required') {
    return (
      <div className="min-h-screen bg-canvas-100 flex items-start justify-center p-4 overflow-auto">
        <div className="w-full max-w-2xl py-10 space-y-6">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h1 className="text-lg font-bold text-ink-900">
                Authentification à deux facteurs requise
              </h1>
              <p className="text-sm text-ink-600 mt-1">
                Les comptes de cabinet doivent activer la MFA avant d'accéder à
                l'application. Configurez un facteur TOTP ci-dessous pour continuer.
              </p>
            </div>
          </div>

          <MfaSettings onFactorsChange={check} />

          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => void signOut()}>
              Se déconnecter
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 'checking' et 'allowed' : on rend l'application (fail-safe, non bloquant).
  return <>{children}</>;
}
