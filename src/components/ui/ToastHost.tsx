// ============================================================================
// ToastHost — écoute les évènements `atlas-toast` et affiche des notifications
// ============================================================================
// Plusieurs composants émettent window.dispatchEvent(new CustomEvent(
// 'atlas-toast', { detail: { type, message } })). Ce host — monté une seule
// fois dans l'app — les rend (pile en bas à droite, auto-fermeture). Sans lui,
// ces notifications étaient silencieuses.
// ============================================================================

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';
interface Toast { id: number; type: ToastType; message: string; }

const STYLES: Record<ToastType, { border: string; bg: string; text: string; Icon: typeof Info }> = {
  success: { border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-800', Icon: CheckCircle2 },
  error:   { border: 'border-rose-200',    bg: 'bg-rose-50',    text: 'text-rose-800',    Icon: XCircle },
  warning: { border: 'border-amber-200',   bg: 'bg-amber-50',   text: 'text-amber-900',   Icon: AlertTriangle },
  info:    { border: 'border-primary-200', bg: 'bg-white',      text: 'text-primary-800', Icon: Info },
};

export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let seq = 0;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { type?: ToastType; message?: string } | undefined;
      if (!detail?.message) return;
      const id = ++seq;
      setToasts((t) => [...t, { id, type: detail.type ?? 'info', message: detail.message! }]);
      // Auto-fermeture (plus long pour les erreurs/avertissements).
      const ttl = detail.type === 'error' || detail.type === 'warning' ? 8000 : 5000;
      window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl);
    };
    window.addEventListener('atlas-toast', handler);
    return () => window.removeEventListener('atlas-toast', handler);
  }, []);

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => {
        const s = STYLES[t.type];
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border ${s.border} ${s.bg} px-3 py-2.5 shadow-lg`}
            role="status"
          >
            <s.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${s.text}`} />
            <p className={`flex-1 text-xs leading-relaxed ${s.text}`}>{t.message}</p>
            <button
              onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))}
              className={`shrink-0 rounded p-0.5 ${s.text} opacity-60 hover:opacity-100`}
              aria-label="Fermer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
