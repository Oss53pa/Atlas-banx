// ============================================================================
// ImportGuidePanel — guide pas-à-pas de l'import des conditions L2 (admin)
// ============================================================================
// Rendu comme un BOUTON compact (« Guide d'import ») à placer dans l'en-tête :
// il n'occupe aucune place à l'écran et ouvre le guide dans une fenêtre modale
// à la demande. L'admin importe ainsi un barème sans se tromper, sans que le
// mode d'emploi n'encombre la console.
// ============================================================================

import { useState } from 'react';
import {
  Landmark, FileUp, ListChecks, Send, ShieldCheck, CalendarClock,
  AlertTriangle, BookOpen, X,
} from 'lucide-react';

interface Step {
  Icon: typeof Landmark;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    Icon: Landmark,
    title: '1. Ouvrir la banque',
    body: "Dans la liste (toutes les banques CEMAC/UEMOA y figurent), cliquez sur la banque dont vous importez les conditions. Vérifiez que vous êtes bien sur l'onglet du bon type de client (Particuliers ou Entreprises).",
  },
  {
    Icon: FileUp,
    title: '2. Importer le document source',
    body: "Téléversez le PDF officiel des conditions de la banque (ou saisissez les rubriques à la main si vous n'avez pas le PDF). Le document est conservé comme preuve, avec une empreinte SHA-256 — il sera consultable depuis le Journal.",
  },
  {
    Icon: ListChecks,
    title: '3. Renseigner les rubriques',
    body: "Pour chaque frais : le code de rubrique (ex. compte.tenue_mensuelle, decouverts.taux_autorise), le type de client concerné, et la VALEUR. L'unité est déterminée par la rubrique : montant en FCFA (tenue de compte, cotisation carte…) ou taux en % (découvert, commission de mouvement…).",
  },
  {
    Icon: CalendarClock,
    title: "4. Fixer la date d'effet",
    body: "Indiquez la date à partir de laquelle ce barème s'applique. Un nouveau barème publié clôt automatiquement le précédent à cette date (pas de chevauchement).",
  },
  {
    Icon: Send,
    title: '5. Soumettre',
    body: "Enregistrez : le barème passe à l'état « soumis ». À ce stade c'est un brouillon — il n'alimente PAS encore les audits.",
  },
  {
    Icon: ShieldCheck,
    title: '6. Publier (contrôle deux yeux)',
    body: "Dans l'onglet « Validation IA » de la banque, un SECOND administrateur valide puis publie le barème (ou activez l'auto-validation si un seul admin). Une fois publié, il devient la référence utilisée par les audits.",
  },
  {
    Icon: BookOpen,
    title: '7. Vérifier dans le Journal',
    body: "Le barème publié apparaît dans le Journal L2 (onglet « Journal L2 ») : conditions, document source, périodes couvertes. Les périodes manquantes y sont signalées pour savoir quoi importer ensuite.",
  },
];

const PITFALLS: string[] = [
  "Unité : un montant FIXE se saisit en FCFA, un TAUX en % — respectez le code de rubrique, l'unité en découle (ne saisissez pas 15 000 pour une commission en %).",
  'Type de client : distinguez bien Particulier / PME / Entreprise. « Tous segments » = s\'applique à tous.',
  "Publication obligatoire : tant qu'un barème n'est pas PUBLIÉ, il reste un brouillon et n'est pas utilisé par les audits.",
  'Référentiel vide = pas de comparaison au barème officiel : importez au moins un barème publié par banque et type de client.',
];

/** Bouton compact « Guide d'import » + fenêtre modale du guide (à la demande). */
export function ImportGuidePanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
        title="Guide pas à pas pour importer un barème"
      >
        <BookOpen className="h-3.5 w-3.5" /> Guide d'import
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/40 p-4 sm:p-8"
          onClick={() => setOpen(false)}
        >
          <div
            className="mt-4 w-full max-w-3xl rounded-xl border border-primary-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête */}
            <div className="flex items-start justify-between gap-3 border-b border-primary-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
                  <BookOpen className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-primary-900">Comment importer un barème — guide pas à pas</p>
                  <p className="text-[11px] text-primary-500">7 étapes · de l'ouverture de la banque à la publication</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-primary-400 hover:bg-primary-50 hover:text-primary-700"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto px-5 py-4">
              <ol className="grid gap-3 sm:grid-cols-2">
                {STEPS.map((s) => (
                  <li key={s.title} className="flex gap-3 rounded-lg border border-primary-100 bg-primary-50/40 p-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-primary-600 border border-primary-200">
                      <s.Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-primary-900">{s.title}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-primary-600">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/70 p-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5" /> Pièges à éviter
                </p>
                <ul className="space-y-1">
                  {PITFALLS.map((p, i) => (
                    <li key={i} className="flex gap-1.5 text-[11px] leading-relaxed text-amber-900">
                      <span className="text-amber-500">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
