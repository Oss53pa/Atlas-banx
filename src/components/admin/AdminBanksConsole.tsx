// ============================================================================
// Atlas Studio — Console d'import des conditions bancaires MUTUALISÉES (L2)
// ============================================================================
// Interface complète, calquée sur la richesse de l'app cliente :
//   - liste des banques (recherche, zones CEMAC/UEMOA) ;
//   - détail d'une banque : toutes les rubriques par catégorie (taxonomie CDC) ;
//   - import PDF (extraction IA + OCR) pour pré-remplir ;
//   - segment (Particulier / PME / Entreprise) ;
//   - soumission versionnée (workflow deux yeux).
// Écriture réservée aux admins (RLS). Les clients ne peuvent pas alimenter L2.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, Building2, UploadCloud, Loader2, FileText, CheckCircle2, AlertCircle,
  ChevronDown, ChevronRight, Landmark,
} from 'lucide-react';
import { DEFAULT_BANKS, type BankWithZone } from '../../store/bankStore';
import { RUBRICS_TAXONOMY, RUBRIC_CATEGORIES } from '../../cdc/taxonomy/rubrics';
import type { RubricCategory } from '../../cdc/types';
import { submitValidatedReference } from '../../cdc/services/submitValidatedReference';
import { extractConditions } from '../../extraction/conditions';
import { extractionResultToFields } from '../banks/extractionToFields';
import { fetchPublicBankReference } from '../../services/publicBankReference';
import { getSupabaseClient } from '../../lib/supabase';
import type { ExtractedField } from '../../cdc/components/SplitScreenValidator';

const BANK_REFERENCES_BUCKET = 'bank-references';

// Rubriques éditables (hors racines de catégorie), groupées par catégorie.
const CATEGORY_ORDER: RubricCategory[] = [
  'compte', 'decouverts', 'cartes', 'virements', 'cheques', 'credits', 'ebanking', 'operations_speciales', 'incidents',
];
const RUBRICS_BY_CATEGORY: Record<string, typeof RUBRICS_TAXONOMY> = (() => {
  const map: Record<string, typeof RUBRICS_TAXONOMY> = {};
  for (const r of RUBRICS_TAXONOMY) {
    if (!r.parentCode) continue; // ignore les racines de catégorie
    (map[r.category] ??= []).push(r);
  }
  return map;
})();

function unitSuffix(unit: string): string {
  return unit === 'percent' ? '%' : unit === 'days' ? 'jours' : unit === 'count' ? 'nb' : 'FCFA';
}
async function hashFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}

export function AdminBanksConsole() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<BankWithZone | null>(null);
  const [segment, setSegment] = useState<'' | 'particulier' | 'pme' | 'corporate'>('');
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [values, setValues] = useState<Record<string, string>>({});
  const [openCats, setOpenCats] = useState<Set<string>>(new Set(['compte']));
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<{ label: string | null; from?: string } | null>(null);

  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ versionId: string; conditionsCount: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DEFAULT_BANKS.filter((b) => !q || b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q));
  }, [search]);

  const filledCount = useMemo(() => Object.values(values).filter((v) => v.trim() !== '').length, [values]);

  // À la sélection d'une banque : réinitialise et pré-remplit depuis L2 publié.
  useEffect(() => {
    if (!selected) return;
    setValues({}); setFile(null); setFileName(null); setResult(null); setError(null);
    setCurrentVersion(null);
    let cancelled = false;
    void fetchPublicBankReference(selected.code).then((ref) => {
      if (cancelled || !ref?.found) return;
      setCurrentVersion({ label: ref.versionLabel ?? null, from: ref.effectiveFrom });
      const next: Record<string, string> = {};
      for (const c of ref.conditions) {
        if (c.value_numeric != null) next[c.rubric_code] = String(c.value_numeric);
      }
      setValues(next);
    });
    return () => { cancelled = true; };
  }, [selected]);

  const setValue = (code: string, v: string) => setValues((prev) => ({ ...prev, [code]: v }));
  const toggleCat = (c: string) => setOpenCats((prev) => {
    const n = new Set(prev);
    if (n.has(c)) n.delete(c); else n.add(c);
    return n;
  });

  const onFile = async (f: File | null) => {
    if (!f || !selected) return;
    setError(null); setFile(f); setFileName(f.name); setIsExtracting(true);
    try {
      const extraction = await extractConditions(f, { bankCode: selected.code });
      const fields = extractionResultToFields(extraction);
      if (fields.length > 0) {
        setValues((prev) => {
          const next = { ...prev };
          for (const fld of fields) {
            if (fld.value != null && String(fld.value).trim() !== '') next[fld.rubricCode] = String(fld.value);
          }
          return next;
        });
        // Ouvre les catégories concernées.
        setOpenCats((prev) => {
          const n = new Set(prev);
          for (const fld of fields) {
            const cat = fld.rubricCode.split('.')[0];
            if (RUBRIC_CATEGORIES[cat as RubricCategory]) n.add(cat);
          }
          return n;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'extraction du PDF.");
    } finally {
      setIsExtracting(false);
    }
  };

  const submit = async () => {
    if (!selected) return;
    setError(null); setResult(null); setIsSubmitting(true);
    try {
      const fields: ExtractedField[] = Object.entries(values)
        .filter(([, v]) => v.trim() !== '')
        .map(([code, v], i) => {
          const seed = RUBRICS_TAXONOMY.find((r) => r.code === code);
          return {
            id: `r-${i}`, rubricCode: code,
            label: seed?.displayLabelFr ?? code, value: v.trim(),
            unit: seed ? unitSuffix(seed.unit) : undefined,
            confidence: 'high', bbox: null,
          };
        });
      if (fields.length === 0) { setError('Renseignez au moins une condition.'); return; }

      // Source PDF : upload dans le bucket si un fichier a été fourni.
      let pdfUrl = `manual://${selected.code}`;
      let sourceHashSha256: string | undefined;
      if (file) {
        const supabase = getSupabaseClient();
        if (supabase) {
          const hash = await hashFile(file);
          const path = `${selected.code}/${hash.slice(0, 16)}_${safeName(file.name)}`;
          const { error: upErr } = await supabase.storage
            .from(BANK_REFERENCES_BUCKET)
            .upload(path, file, { contentType: 'application/pdf', upsert: true });
          if (!upErr) { pdfUrl = `${BANK_REFERENCES_BUCKET}/${path}`; sourceHashSha256 = hash; }
        }
      }

      const res = await submitValidatedReference({
        bankCode: selected.code,
        pdfUrl, fields, effectiveFrom: new Date(effectiveFrom),
        sourceHashSha256, segment: segment || undefined,
        bankMeta: { legalName: selected.name, countryIso: selected.country, zone: selected.zone },
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la soumission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      {/* ===== Liste des banques ===== */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
        <div className="border-b border-white/10 p-3">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5">
            <Search className="h-4 w-4 text-white/30" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une banque…"
              className="w-full bg-transparent py-2 text-sm text-white placeholder-white/25 focus:outline-none" />
          </div>
          <p className="mt-2 px-1 text-[11px] text-white/35">{filtered.length} banques</p>
        </div>
        <ul className="max-h-[70vh] overflow-y-auto p-1.5">
          {filtered.map((b) => (
            <li key={b.code}>
              <button onClick={() => setSelected(b)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                  selected?.code === b.code ? 'bg-amber-400/10 text-amber-100' : 'text-white/70 hover:bg-white/5'
                }`}>
                <Landmark className="h-4 w-4 flex-shrink-0 text-white/30" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{b.name}</span>
                  <span className="block truncate text-[11px] text-white/35">{b.country} · {b.code} · {b.zone}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* ===== Détail banque ===== */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        {!selected ? (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center text-white/40">
            <Building2 className="h-10 w-10" />
            <p className="mt-3 text-sm">Sélectionnez une banque pour éditer ses conditions mutualisées.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* En-tête */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">{selected.name}</h2>
                <p className="text-sm text-white/50">{selected.country} · {selected.code} · {selected.zone}</p>
                {currentVersion && (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" /> Version publiée : {currentVersion.label ?? '—'}{currentVersion.from ? ` (dès ${currentVersion.from})` : ''}
                  </p>
                )}
              </div>
              <div className="text-right text-[11px] text-white/40">{filledCount} rubrique(s) renseignée(s)</div>
            </div>

            {/* Barre d'outils : import PDF + segment + date */}
            <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => fileRef.current?.click()} disabled={isExtracting}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 px-3 py-2 text-xs font-medium text-amber-200 hover:bg-amber-400/10 disabled:opacity-40">
                  {isExtracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                  {isExtracting ? 'Extraction…' : 'Importer un PDF (extraction IA + OCR)'}
                </button>
                {fileName && <span className="inline-flex items-center gap-1 text-xs text-white/50"><FileText className="h-3.5 w-3.5" /> {fileName}</span>}
                <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden"
                  onChange={(e) => { void onFile(e.target.files?.[0] ?? null); e.target.value = ''; }} />
                <div className="ml-auto flex items-center gap-2">
                  <label className="text-[11px] text-white/40">En vigueur</label>
                  <input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)}
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white focus:border-amber-400/50 focus:outline-none" />
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-white/40">Barème pour</p>
                <div className="grid grid-cols-4 gap-2">
                  {([['', 'Tous'], ['particulier', 'Particuliers'], ['pme', 'PME'], ['corporate', 'Entreprises']] as const).map(([v, label]) => (
                    <button key={v} onClick={() => setSegment(v)}
                      className={`rounded-lg border px-2 py-1.5 text-xs font-medium ${segment === v ? 'border-amber-400/60 bg-amber-400/10 text-amber-200' : 'border-white/10 text-white/50 hover:bg-white/5'}`}>{label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Rubriques par catégorie */}
            <div className="space-y-2">
              {CATEGORY_ORDER.map((cat) => {
                const rubrics = RUBRICS_BY_CATEGORY[cat] ?? [];
                if (rubrics.length === 0) return null;
                const open = openCats.has(cat);
                const catFilled = rubrics.filter((r) => (values[r.code] ?? '').trim() !== '').length;
                return (
                  <div key={cat} className="rounded-xl border border-white/10 bg-white/[0.02]">
                    <button onClick={() => toggleCat(cat)} className="flex w-full items-center justify-between px-4 py-3 text-left">
                      <span className="flex items-center gap-2 text-sm font-medium text-white">
                        {open ? <ChevronDown className="h-4 w-4 text-white/40" /> : <ChevronRight className="h-4 w-4 text-white/40" />}
                        {RUBRIC_CATEGORIES[cat]}
                        <span className="text-[11px] text-white/30">· {rubrics.length} rubriques</span>
                      </span>
                      {catFilled > 0 && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-medium text-amber-200">{catFilled}</span>}
                    </button>
                    {open && (
                      <div className="grid gap-x-4 gap-y-2 border-t border-white/5 p-4 sm:grid-cols-2">
                        {rubrics.map((r) => (
                          <label key={r.code} className="flex items-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-[13px] text-white/70" title={r.displayLabelFr}>{r.displayLabelFr}</span>
                            <span className="relative">
                              <input value={values[r.code] ?? ''} onChange={(e) => setValue(r.code, e.target.value)}
                                placeholder="—"
                                className="w-24 rounded-lg border border-white/10 bg-white/5 py-1.5 pl-2.5 pr-9 text-right text-xs text-white placeholder-white/20 focus:border-amber-400/50 focus:outline-none" />
                              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/30">{unitSuffix(r.unit)}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /><span>{error}</span>
              </div>
            )}
            {result && (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>Version <span className="font-mono">{result.versionId.slice(0, 8)}</span> créée ({result.conditionsCount} conditions), soumise à validation. Un second administrateur doit la valider puis la publier.</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-[11px] text-white/35">Soumission au workflow deux yeux — validation + publication par un pair.</p>
              <button onClick={submit} disabled={isSubmitting || filledCount === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-ink-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40">
                {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Soumission…</> : <><UploadCloud className="h-4 w-4" /> Soumettre au référentiel ({filledCount})</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
