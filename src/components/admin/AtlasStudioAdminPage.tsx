// ============================================================================
// Atlas Studio — Console d'administration (accès dérobé)
// ============================================================================
// Page volontairement séparée de l'application cliente, sans navigation ni
// sidebar. Atteinte par un point d'entrée discret (triple-clic sur le « · »
// du pied de page de connexion) mais protégée par une VRAIE barrière :
//   1. authentification (Supabase) ;
//   2. contrôle de rôle : seul un profil `role === 'admin'` accède à l'import.
// L'obscurité du point d'entrée n'est qu'un confort — la sécurité repose sur
// l'auth + le rôle + la RLS L2 côté base.
// ============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldAlert, ArrowLeft, LogOut, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { MutualizedImportPanel } from './MutualizedImportPanel';

export default function AtlasStudioAdminPage() {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    isDemoMode,
    profile,
    isLoading,
    error: authError,
    signInWithEmail,
    signOut,
    clearError,
  } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isAdmin = profile?.role === 'admin';
  const authed = isAuthenticated || isDemoMode;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await signInWithEmail(email, password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ink-900 via-ink-950 to-black text-white">
      <div className="mx-auto max-w-3xl px-6 py-14">
        {/* En-tête discret */}
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/5 text-amber-300">
              <Lock className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight text-white">Atlas Studio · Console</p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/30">Accès administrateur</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Retour
          </button>
        </div>

        {/* --- Non authentifié : connexion admin --- */}
        {!authed && (
          <div className="mx-auto max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-7">
            <h1 className="font-serif text-2xl text-white">Connexion administrateur</h1>
            <p className="mt-1.5 text-sm text-white/50">
              Espace réservé à l'équipe Atlas Studio.
            </p>
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@atlasbanx.com"
                autoFocus
                disabled={isLoading}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/25 focus:border-amber-400/50 focus:outline-none"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                disabled={isLoading}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/25 focus:border-amber-400/50 focus:outline-none"
              />
              {authError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={!email || !password || isLoading}
                className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-ink-950 hover:bg-amber-400 disabled:opacity-40"
              >
                {isLoading ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>
          </div>
        )}

        {/* --- Authentifié mais non admin : accès refusé --- */}
        {authed && !isAdmin && (
          <div className="mx-auto max-w-md rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-8 text-center">
            <span className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-300">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <h1 className="font-serif text-xl text-white">Accès refusé</h1>
            <p className="mt-2 text-sm text-white/50">
              Ce compte n'a pas le rôle administrateur requis pour l'import des conditions
              mutualisées.
            </p>
            <button
              onClick={() => signOut()}
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 hover:bg-white/5"
            >
              <LogOut className="h-3.5 w-3.5" /> Se déconnecter
            </button>
          </div>
        )}

        {/* --- Admin : interface d'import mutualisé --- */}
        {authed && isAdmin && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7">
            <MutualizedImportPanel />
          </div>
        )}
      </div>
    </div>
  );
}
