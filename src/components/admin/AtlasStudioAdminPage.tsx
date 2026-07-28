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
//
// La console d'import RÉUTILISE l'interface bancaire complète de l'application
// (BanksPage → liste des banques, détail, rubriques par catégorie, import PDF
// IA+OCR, journal des grilles). L'admin y accède à l'onglet « Validation IA »
// de BankConditionsModal (visible seulement pour role=admin/super_admin) qui
// soumet une version de référence L2 mutualisée au workflow deux yeux. On ne
// duplique donc pas l'interface : on factorise celle qui existe déjà.
// ============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldAlert, ArrowLeft, LogOut, AlertCircle, Users, Building2, BarChart3, Sparkles, CalendarClock } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useBankStore } from '../../store/bankStore';
import { BanksPage } from '../banks';
import { ConditionsIntelligencePage } from '../conditions-intelligence';
import { ReferenceJournalPanel } from './ReferenceJournalPanel';
import { ImportGuidePanel } from './ImportGuidePanel';

type AdminView = 'particuliers' | 'entreprises' | 'journal' | 'benchmark';

const ADMIN_TABS: { id: AdminView; label: string; Icon: typeof Users }[] = [
  { id: 'particuliers', label: 'Conditions Particuliers', Icon: Users },
  { id: 'entreprises', label: 'Conditions Entreprises', Icon: Building2 },
  { id: 'journal', label: 'Journal L2', Icon: CalendarClock },
  { id: 'benchmark', label: 'Benchmark', Icon: BarChart3 },
];

export default function AtlasStudioAdminPage() {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    isDemoMode,
    profile,
    isLoading,
    isInitialized,
    error: authError,
    signInWithEmail,
    signOut,
    clearError,
    loadProfile,
  } = useAuthStore();

  const { banks: storeBanks, setSelectedBank } = useBankStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState<AdminView>('particuliers');

  // Depuis le journal : ouvrir l'onglet d'import scopé sur la banque + segment.
  const handleImportFromJournal = (bankCode: string, segment: 'particulier' | 'pme' | 'corporate' | 'tous') => {
    const bank = storeBanks.find((b) => b.code === bankCode);
    if (bank) setSelectedBank(bank.id);
    setView(segment === 'particulier' ? 'particuliers' : 'entreprises');
  };

  // Aligné sur public.is_admin() côté base : admin OU super_admin (+ démo).
  // NB : le type généré de profile.role diverge du schéma réel ; comparaison
  // par string.
  const role = profile?.role as string | undefined;
  const isAdmin = isDemoMode || role === 'admin' || role === 'super_admin';
  const authed = isAuthenticated || isDemoMode;
  // Session ouverte mais profil pas encore chargé (ou échec de chargement) : on
  // NE DOIT PAS afficher « Accès refusé » — sinon un admin légitime est bloqué
  // le temps que loadProfile résolve, ou définitivement si l'appel a échoué.
  const profilePending = isAuthenticated && !isDemoMode && !profile;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await signInWithEmail(email, password);
  };

  // --- Admin authentifié : console d'import mutualisé ---------------------
  // Thème clair (comme l'application) car on y monte l'interface BanksPage
  // telle quelle. On l'encadre d'un bandeau admin discret + un rappel du
  // périmètre L2 (référentiel partagé, onglet « Validation IA » → workflow
  // deux yeux).
  if (authed && isAdmin) {
    return (
      <div className="min-h-screen bg-primary-50">
        {/* Bandeau admin */}
        <header className="sticky top-0 z-30 border-b border-primary-200 bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-2.5 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 text-amber-600">
                <Lock className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold tracking-tight text-primary-900">
                  Atlas Studio · Console
                </p>
                <p className="text-[11px] uppercase tracking-[0.16em] text-primary-400">
                  Import des conditions mutualisées (référentiel L2)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Onglets : Particuliers · Entreprises · Benchmark */}
              <nav className="mr-1 flex rounded-lg bg-primary-100 p-0.5">
                {ADMIN_TABS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => setView(id)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      view === id ? 'bg-white text-primary-900 shadow-sm' : 'text-primary-500 hover:text-primary-800'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                ))}
              </nav>
              {(view === 'particuliers' || view === 'entreprises') && <ImportGuidePanel />}
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-primary-500 hover:bg-primary-100 hover:text-primary-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Retour
              </button>
              <button
                onClick={() => signOut()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 px-2.5 py-1.5 text-xs text-primary-600 hover:bg-primary-100"
              >
                <LogOut className="h-3.5 w-3.5" /> Se déconnecter
              </button>
            </div>
          </div>
          {/* Rappel de périmètre — dépend de la vue */}
          <div className="border-t border-amber-100 bg-amber-50/60 px-4 py-2 text-[11px] text-amber-900 sm:px-6">
            {view === 'benchmark' ? (
              <p className="text-center">
                <strong>Benchmark inter-banques</strong> — classement par quartile et par rubrique,
                comparaison zonale CEMAC/UEMOA, évolution et alertes de dérive sur les barèmes publiés.
              </p>
            ) : view === 'journal' ? (
              <p className="mx-auto max-w-4xl text-center leading-relaxed">
                <strong>Journal du référentiel L2</strong> — barèmes importés par banque, type de client et
                période. Les <strong>périodes manquantes</strong> (trous de couverture, barème expiré) sont
                mises en évidence pour savoir quoi importer ensuite.
              </p>
            ) : (
              <p className="mx-auto max-w-4xl text-center leading-relaxed">
                Import des conditions <strong>{view === 'particuliers' ? 'Particuliers' : 'Entreprises'}</strong> (référentiel
                <strong> L2 mutualisé</strong>, partagé par tous les clients). Ouvrez une banque → importez le PDF
                ou saisissez les rubriques. <Sparkles className="inline h-3 w-3 -mt-0.5" /> <strong>Important :</strong> pour
                que le barème soit réellement utilisé par les audits, publiez-le via l'onglet
                <strong> « Validation IA »</strong> de la banque (workflow deux yeux). Tant qu'il n'est pas publié,
                il reste un brouillon local et n'alimente pas l'audit.
              </p>
            )}
          </div>
        </header>

        {/* Vue active : import scopé par segment, journal, ou benchmark */}
        <main className="px-3 py-4 sm:px-6">
          {view === 'benchmark' ? (
            <ConditionsIntelligencePage />
          ) : view === 'journal' ? (
            <ReferenceJournalPanel onImport={handleImportFromJournal} />
          ) : (
            <BanksPage
              key={view}
              defaultSegment={view === 'particuliers' ? 'particuliers' : 'entreprises'}
            />
          )}
        </main>
      </div>
    );
  }

  // --- Non authentifié / non admin : écrans sombres discrets --------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-ink-900 via-ink-950 to-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-14">
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

        {/* --- Session ouverte, profil en cours de chargement / échec --- */}
        {profilePending && (
          <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <span className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-300">
              <Lock className="h-5 w-5" />
            </span>
            <h1 className="font-serif text-xl text-white">Vérification du profil…</h1>
            <p className="mt-2 text-sm text-white/50">
              {isInitialized
                ? "Le profil n'a pas pu être chargé. Réessayez ou reconnectez-vous."
                : 'Chargement de votre profil administrateur.'}
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                onClick={() => void loadProfile()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200 hover:bg-amber-400/20"
              >
                Réessayer
              </button>
              <button
                onClick={() => signOut()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 hover:bg-white/5"
              >
                <LogOut className="h-3.5 w-3.5" /> Se déconnecter
              </button>
            </div>
          </div>
        )}

        {/* --- Authentifié, profil chargé mais non admin : accès refusé --- */}
        {authed && !profilePending && !isAdmin && (
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
      </div>
    </div>
  );
}
