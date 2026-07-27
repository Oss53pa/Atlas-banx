import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck, Sparkles, Lock, Building2, Briefcase } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import type { AccountType } from '../../lib/database.types';

interface LoginScreenProps {
  onSuccess: () => void;
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const {
    isLoading,
    error: authError,
    signInWithEmail,
    signUp,
    resetPassword,
    clearError,
  } = useAuthStore();

  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('enterprise');
  const [showPassword, setShowPassword] = useState(false);
  const [view, setView] = useState<'login' | 'register' | 'reset'>('login');
  const [message, setMessage] = useState('');

  // Point d'entrée discret vers la console admin Atlas Studio : triple-clic sur
  // le « · » du pied de page. La sécurité réelle reste l'auth + le rôle admin
  // vérifiés sur la page /atlas-studio ; ceci n'est qu'un accès peu visible.
  const navigate = useNavigate();
  const secretClicks = useRef<number[]>([]);
  const handleSecretEntry = () => {
    const now = Date.now();
    secretClicks.current = [...secretClicks.current, now].filter((t) => now - t < 800);
    if (secretClicks.current.length >= 3) {
      secretClicks.current = [];
      navigate('/atlas-studio');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await signInWithEmail(email, password);
    if (success) {
      onSuccess();
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await signUp(email, password, fullName, accountType);
    if (success) {
      setMessage('Vérifiez votre email pour confirmer votre compte.');
      setView('login');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await resetPassword(email);
    if (success) {
      setMessage('Un email de réinitialisation a été envoyé.');
      setView('login');
    }
  };

  const goTo = (next: 'login' | 'register' | 'reset') => {
    setView(next);
    clearError();
    setMessage('');
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-canvas-100">
      {/* ============================================================
          LEFT — Brand panel (ink navy + champagne gold)
          ============================================================ */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950 px-14 py-12">
        {/* Ambient gold glows */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 right-0 h-[520px] w-[520px] rounded-full bg-accent-500/12 blur-3xl" />
          <div className="absolute bottom-0 -left-24 h-[420px] w-[420px] rounded-full bg-ink-700/50 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(rgb(255 255 255) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
            }}
          />
        </div>

        {/* Top row — wordmark */}
        <div className="relative flex items-center justify-between">
          <span className="font-display text-4xl text-gradient-gold leading-none">Atlas Studio</span>
        </div>

        {/* Middle — headline */}
        <div className="relative max-w-lg">
          <div className="inline-flex items-center gap-2.5 mb-7">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
            <span className="text-[11px] font-semibold text-accent-300 uppercase tracking-[0.22em]">
              Audit bancaire · CEMAC · UEMOA
            </span>
          </div>

          <h1 className="font-serif text-white leading-[1.05]">
            <span className="block text-5xl">L'audit bancaire</span>
            <span className="block font-display text-6xl leading-[1.1] text-gradient-gold">à hauteur d'expert.</span>
          </h1>

          <p className="mt-6 text-[15px] leading-relaxed text-white/60">
            Analyse intégrale de vos relevés, conformité CEMAC · UEMOA et IA{' '}
            <span className="font-display text-lg text-accent-300">Proph3t</span> intégrée — pour les
            cabinets et directions financières exigeants.
          </p>
        </div>

        {/* Bottom — trust features + footer */}
        <div className="relative space-y-5">
          <ul className="space-y-3.5">
            {[
              { icon: ShieldCheck, text: 'Chiffrement AES-256 · Conformité OHADA' },
              { icon: Sparkles, text: 'IA Proph3t · Audit Benford & analyse prédictive' },
              { icon: Lock, text: "Piste d'audit SHA-256 inaltérable" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-accent-400/20 bg-white/[0.04] text-accent-300">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm text-white/55">{text}</span>
              </li>
            ))}
          </ul>

          <div className="pt-5 border-t border-white/10">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/30">
              © 2026 Atlas Studio{' '}
              <span
                onClick={handleSecretEntry}
                className="cursor-default select-none"
                aria-hidden="true"
              >
                ·
              </span>{' '}
              CEMAC &amp; UEMOA
            </p>
          </div>
        </div>
      </aside>

      {/* ============================================================
          RIGHT — Form panel (warm ivory)
          ============================================================ */}
      <main className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Mobile wordmark */}
          <div className="mb-8 lg:hidden">
            <span className="font-display text-3xl text-ink-900">Atlas Studio</span>
          </div>

          {/* -------------------- LOGIN -------------------- */}
          {view === 'login' && (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-600 mb-3">
                Connexion · Sécurisé
              </p>
              <h2 className="font-serif text-4xl text-ink-900 tracking-tight">Bon retour</h2>
              <p className="mt-2 text-[15px] text-ink-500">
                Connectez-vous à votre espace{' '}
                <span className="font-serif italic text-ink-800">Atlas Banx</span> pour reprendre votre activité.
              </p>

              {message && (
                <div className="mt-6 flex items-start gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-3.5 py-2.5 rounded-lg">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{message}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="mt-8 space-y-5">
                <div>
                  <label htmlFor="email" className="label">Adresse email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@entreprise.com"
                    className="input"
                    autoFocus
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="login-password" className="label !mb-0">Mot de passe</label>
                    <a
                      href="https://atlas-studio.org/portal/forgot-password"
                      className="text-xs text-ink-400 hover:text-accent-700 transition-colors"
                    >
                      Oublié ?
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Votre mot de passe"
                      className="input pr-12"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 transition-colors"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {authError && (
                  <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200/70 px-3.5 py-2.5 rounded-lg">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{authError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!email || !password || isLoading}
                  className="btn btn-primary w-full py-3.5 text-sm tracking-tight"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    <>
                      Se connecter
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-9">
                <div className="flex items-center gap-4">
                  <span className="h-px flex-1 bg-primary-200" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">
                    Première fois
                  </span>
                  <span className="h-px flex-1 bg-primary-200" />
                </div>
                <button
                  onClick={() => goTo('register')}
                  className="btn btn-secondary w-full mt-5 py-3.5 text-sm tracking-tight"
                >
                  Créer un compte Atlas Studio
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Entrée Particulier — audit d'un relevé sans création de compte */}
              <div className="mt-6 rounded-xl border border-accent-200/70 bg-accent-50/40 p-4">
                <p className="text-sm font-semibold text-ink-900">Vous êtes un particulier ?</p>
                <p className="mt-1 text-[13px] text-ink-500">
                  Auditez votre relevé bancaire <span className="font-medium text-ink-700">sans créer de compte</span> :
                  importez, payez, obtenez votre rapport.
                </p>
                <button
                  onClick={() => navigate('/audit-express')}
                  className="btn btn-accent w-full mt-3 py-3 text-sm tracking-tight"
                >
                  Auditer mon relevé
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {/* -------------------- REGISTER -------------------- */}
          {view === 'register' && (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-600 mb-3">
                Inscription · Atlas Studio
              </p>
              <h2 className="font-serif text-4xl text-ink-900 tracking-tight">Créer un compte</h2>
              <p className="mt-2 text-[15px] text-ink-500">
                Rejoignez la plateforme d'audit bancaire{' '}
                <span className="font-serif italic text-ink-800">Atlas Banx</span>.
              </p>

              <form onSubmit={handleRegister} className="mt-8 space-y-5">
                <div>
                  <label className="label">Type de compte</label>
                  <div className="grid grid-cols-1 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setAccountType('enterprise')}
                      disabled={isLoading}
                      className={`flex items-start gap-3 p-3.5 border-2 rounded-xl text-left transition-all duration-200 ease-premium ${
                        accountType === 'enterprise'
                          ? 'border-ink-900 bg-canvas-100 shadow-card'
                          : 'border-primary-200 hover:border-primary-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        accountType === 'enterprise' ? 'bg-ink-900 text-white' : 'bg-canvas-200 text-ink-500'
                      }`}>
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold tracking-tight ${
                          accountType === 'enterprise' ? 'text-ink-900' : 'text-ink-700'
                        }`}>
                          Entreprise
                        </p>
                        <p className="text-xs text-ink-500 mt-0.5">
                          J'audite les transactions de ma société
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountType('cabinet')}
                      disabled={isLoading}
                      className={`flex items-start gap-3 p-3.5 border-2 rounded-xl text-left transition-all duration-200 ease-premium ${
                        accountType === 'cabinet'
                          ? 'border-ink-900 bg-canvas-100 shadow-card'
                          : 'border-primary-200 hover:border-primary-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        accountType === 'cabinet' ? 'bg-ink-900 text-white' : 'bg-canvas-200 text-ink-500'
                      }`}>
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold tracking-tight ${
                          accountType === 'cabinet' ? 'text-ink-900' : 'text-ink-700'
                        }`}>
                          Cabinet
                        </p>
                        <p className="text-xs text-ink-500 mt-0.5">
                          J'audite plusieurs sociétés clientes
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-name" className="label">Nom complet</label>
                  <input
                    id="reg-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jean Dupont"
                    className="input"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label htmlFor="reg-email" className="label">Adresse email</label>
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@entreprise.com"
                    className="input"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label htmlFor="reg-password" className="label">Mot de passe</label>
                  <input
                    id="reg-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 caractères"
                    className="input"
                    disabled={isLoading}
                  />
                </div>

                {authError && (
                  <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200/70 px-3.5 py-2.5 rounded-lg">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{authError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!email || !password || isLoading}
                  className="btn btn-primary w-full py-3.5 text-sm tracking-tight"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>S'inscrire <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <button
                  onClick={() => goTo('login')}
                  className="text-sm text-ink-600 hover:text-accent-700 font-medium transition-colors"
                >
                  Déjà un compte ? <span className="text-ink-900">Se connecter</span>
                </button>
              </div>
            </>
          )}

          {/* -------------------- RESET -------------------- */}
          {view === 'reset' && (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-600 mb-3">
                Réinitialisation
              </p>
              <h2 className="font-serif text-4xl text-ink-900 tracking-tight">Mot de passe oublié</h2>
              <p className="mt-2 text-[15px] text-ink-500">
                Saisissez votre email, nous vous enverrons un lien de réinitialisation.
              </p>

              <form onSubmit={handleResetPassword} className="mt-8 space-y-5">
                <div>
                  <label htmlFor="reset-email" className="label">Adresse email</label>
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@entreprise.com"
                    className="input"
                    autoFocus
                    disabled={isLoading}
                  />
                </div>

                {authError && (
                  <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200/70 px-3.5 py-2.5 rounded-lg">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{authError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!email || isLoading}
                  className="btn btn-primary w-full py-3.5 text-sm tracking-tight"
                >
                  {isLoading ? 'Envoi...' : (<>Envoyer le lien <ArrowRight className="w-4 h-4" /></>)}
                </button>
              </form>

              <div className="mt-8 text-center">
                <button
                  onClick={() => goTo('login')}
                  className="text-sm text-ink-600 hover:text-accent-700 font-medium transition-colors"
                >
                  ← Retour à la connexion
                </button>
              </div>
            </>
          )}

          <p className="mt-10 text-center text-xs text-ink-400 tracking-wide">
            <ShieldCheck className="inline w-3 h-3 mr-1 mb-0.5" />
            Plateforme sécurisée — Réservée aux utilisateurs autorisés
          </p>
        </div>
      </main>
    </div>
  );
}
