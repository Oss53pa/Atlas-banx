// ============================================================================
// ATLASBANX — Journal de couverture du référentiel L2 (console admin)
// ============================================================================
// Récupère toutes les versions de barème par banque (via la RPC admin
// `admin_reference_journal`, réservée aux administrateurs), et fournit des
// utilitaires pour dresser le journal et repérer les PÉRIODES MANQUANTES par
// banque et par type de client (segment).
// ============================================================================

import { getSupabaseClient } from '../../lib/supabase';
import { getRubricSeed, rubricUnitOf } from '../taxonomy/rubrics';
import type { ConditionUnit } from '../types';

export type JournalSegment = 'particulier' | 'pme' | 'corporate' | 'tous';

export interface ReferenceJournalRow {
  bankCode: string;
  bankName: string;
  zone: string;
  countryIso: string;
  versionId: string;
  versionLabel: string | null;
  validationStatus: 'draft' | 'submitted' | 'validated' | 'published' | 'rejected';
  effectiveFrom: string | null; // YYYY-MM-DD
  effectiveTo: string | null;   // YYYY-MM-DD | null = ouvert (∞)
  publishedAt: string | null;
  segments: JournalSegment[];
  conditionsCount: number;
}

/** Récupère le journal complet (toutes banques, toutes versions). */
export async function fetchReferenceJournal(): Promise<ReferenceJournalRow[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase.schema('atlasbanx').rpc('admin_reference_journal');
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    bankCode: String(r.bank_code),
    bankName: String(r.bank_name),
    zone: String(r.zone ?? ''),
    countryIso: String(r.country_iso ?? ''),
    versionId: String(r.version_id),
    versionLabel: (r.version_label as string) ?? null,
    validationStatus: (r.validation_status as ReferenceJournalRow['validationStatus']) ?? 'draft',
    effectiveFrom: (r.effective_from as string) ?? null,
    effectiveTo: (r.effective_to as string) ?? null,
    publishedAt: (r.published_at as string) ?? null,
    segments: ((r.segments as string[]) ?? []) as JournalSegment[],
    conditionsCount: Number(r.conditions_count ?? 0),
  }));
}

// ────────────────────────────────────────────────────────────────────────────
// Détail d'une version de barème (conditions importées + source)
// ────────────────────────────────────────────────────────────────────────────

export interface ReferenceConditionRow {
  id: string;
  rubricCode: string;
  profil: string | null; // dimensions.profil (null = tous segments)
  valueNumeric: number | null;
  valueFormula: unknown | null;
  pdfPage: number | null;
  notes: string | null;
}

export interface ReferenceVersionDetail {
  versionId: string;
  versionLabel: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  validationStatus: string;
  sourcePdfUrl: string | null;
  sourceHash: string | null;
  conditions: ReferenceConditionRow[];
}

const BANK_REFERENCES_BUCKET = 'bank-references';

export type SourceDocKind = 'http' | 'storage' | 'seed' | 'none';

/**
 * Résout une URL ouvrable pour le document source d'un barème :
 *  - URL http(s) → renvoyée telle quelle ;
 *  - chemin de stockage (bank-references/…) → URL signée temporaire ;
 *  - référence de démonstration (seed://) ou absente → pas d'URL.
 */
export async function resolveSourceDocumentUrl(
  sourcePdfUrl: string | null,
): Promise<{ url: string | null; kind: SourceDocKind }> {
  if (!sourcePdfUrl) return { url: null, kind: 'none' };
  if (/^https?:\/\//.test(sourcePdfUrl)) return { url: sourcePdfUrl, kind: 'http' };
  if (sourcePdfUrl.startsWith('seed://')) return { url: null, kind: 'seed' };
  const supabase = getSupabaseClient();
  if (!supabase) return { url: null, kind: 'storage' };
  const path = sourcePdfUrl.startsWith(BANK_REFERENCES_BUCKET + '/')
    ? sourcePdfUrl.slice(BANK_REFERENCES_BUCKET.length + 1)
    : sourcePdfUrl;
  const { data } = await supabase.storage
    .from(BANK_REFERENCES_BUCKET)
    .createSignedUrl(path, 3600);
  return { url: data?.signedUrl ?? null, kind: 'storage' };
}

/**
 * Supprime un barème L2 (version + conditions) via la RPC admin. Retire aussi,
 * au mieux, le PDF source du stockage s'il s'agit d'un fichier importé.
 */
export async function deleteReferenceVersion(
  versionId: string,
  sourcePdfUrl?: string | null,
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const { error } = await supabase
    .schema('atlasbanx')
    .rpc('admin_delete_reference_version', { p_version_id: versionId });
  if (error) return false;
  if (sourcePdfUrl && !/^https?:\/\//.test(sourcePdfUrl) && !sourcePdfUrl.startsWith('seed://')) {
    const path = sourcePdfUrl.startsWith(BANK_REFERENCES_BUCKET + '/')
      ? sourcePdfUrl.slice(BANK_REFERENCES_BUCKET.length + 1)
      : sourcePdfUrl;
    try { await supabase.storage.from(BANK_REFERENCES_BUCKET).remove([path]); } catch { /* best-effort */ }
  }
  return true;
}

/** Récupère le détail d'une version : ses conditions importées + la source. */
export async function fetchReferenceVersionDetail(
  versionId: string,
): Promise<ReferenceVersionDetail | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const [{ data: vRows }, { data: cRows }] = await Promise.all([
    supabase
      .schema('atlasbanx')
      .from('bank_reference_versions')
      .select('id, version_label, effective_from, effective_to, validation_status, source_pdf_url, source_hash_sha256')
      .eq('id', versionId)
      .limit(1),
    supabase
      .schema('atlasbanx')
      .from('bank_reference_conditions')
      .select('id, rubric_code, dimensions, value_numeric, value_formula, pdf_page, notes')
      .eq('reference_version_id', versionId)
      .order('rubric_code'),
  ]);

  const v = (vRows as Record<string, unknown>[] | null)?.[0];
  if (!v) return null;

  const conditions: ReferenceConditionRow[] = ((cRows as Record<string, unknown>[]) ?? []).map((r) => ({
    id: String(r.id),
    rubricCode: String(r.rubric_code),
    profil: ((r.dimensions as Record<string, unknown> | null)?.profil as string) ?? null,
    valueNumeric: r.value_numeric !== null && r.value_numeric !== undefined ? Number(r.value_numeric) : null,
    valueFormula: r.value_formula ?? null,
    pdfPage: r.pdf_page !== null && r.pdf_page !== undefined ? Number(r.pdf_page) : null,
    notes: (r.notes as string) ?? null,
  }));

  return {
    versionId: String(v.id),
    versionLabel: (v.version_label as string) ?? null,
    effectiveFrom: (v.effective_from as string) ?? null,
    effectiveTo: (v.effective_to as string) ?? null,
    validationStatus: String(v.validation_status ?? 'draft'),
    sourcePdfUrl: (v.source_pdf_url as string) ?? null,
    sourceHash: (v.source_hash_sha256 as string) ?? null,
    conditions,
  };
}

/** Unité d'une rubrique d'après la taxonomie ('fcfa' par défaut si inconnue). */
export function rubricUnit(code: string): ConditionUnit {
  return rubricUnitOf(code);
}

/** Libellé lisible d'un code de rubrique (taxonomie, fallback : prettification). */
export function rubricLabel(code: string): string {
  const seed = getRubricSeed(code);
  if (seed) return seed.displayLabelFr;
  const tail = code.includes('.') ? code.slice(code.indexOf('.') + 1) : code;
  return tail.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

/** true si la rubrique s'exprime en pourcentage (d'après la taxonomie). */
export function isRateRubric(code: string): boolean {
  return rubricUnitOf(code) === 'percent';
}

/** Formate une valeur de condition selon son UNITÉ déclarée dans la taxonomie. */
export function formatConditionValue(code: string, value: number | null): string {
  if (value === null) return '—';
  switch (rubricUnit(code)) {
    case 'percent': {
      const s = Number.isInteger(value) ? String(value) : value.toString().replace('.', ',');
      return `${s} %`;
    }
    case 'days':
      return `${value} jour${Math.abs(value) > 1 ? 's' : ''}`;
    case 'count':
      return String(value);
    case 'fcfa':
    default:
      return `${Math.round(value).toLocaleString('fr-FR')} FCFA`;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Analyse de couverture / trous
// ────────────────────────────────────────────────────────────────────────────

export interface CoverageSpan {
  from: string;       // YYYY-MM-DD (ou 'début' symbolique via null-handling en UI)
  to: string | null;  // null = ouvert
  covered: boolean;   // true = couvert par un barème publié ; false = trou
}

/** Segments concrets (hors 'tous'). */
export const CONCRETE_SEGMENTS: JournalSegment[] = ['particulier', 'pme', 'corporate'];

export const SEGMENT_LABELS: Record<JournalSegment, string> = {
  particulier: 'Particuliers',
  pme: 'PME',
  corporate: 'Entreprises',
  tous: 'Tous segments',
};

/**
 * Pour une banque et un segment donnés, calcule les intervalles couverts par
 * des barèmes PUBLIÉS (un barème « tous » couvre tous les segments), triés, et
 * insère des spans « trou » (covered=false) entre deux couvertures et après la
 * dernière si elle n'est pas ouverte.
 */
export function coverageForSegment(
  rows: ReferenceJournalRow[],
  segment: JournalSegment,
): CoverageSpan[] {
  const covering = rows
    .filter((r) => r.validationStatus === 'published')
    .filter((r) => r.segments.includes(segment) || r.segments.includes('tous'))
    .filter((r) => r.effectiveFrom)
    .sort((a, b) => (a.effectiveFrom! < b.effectiveFrom! ? -1 : 1));

  if (covering.length === 0) return [];

  const spans: CoverageSpan[] = [];
  let cursorEnd: string | null = null; // fin de la dernière couverture posée

  for (const r of covering) {
    const from = r.effectiveFrom!;
    const to = r.effectiveTo; // null = ouvert
    if (cursorEnd !== null && from > cursorEnd) {
      // Trou entre la fin précédente et le début courant
      spans.push({ from: cursorEnd, to: from, covered: false });
    }
    // Étend la couverture (fusion simple : on garde la borne la plus lointaine)
    spans.push({ from, to, covered: true });
    if (to === null) {
      cursorEnd = null; // ouvert → plus de trou possible ensuite
    } else if (cursorEnd === null || to > cursorEnd) {
      cursorEnd = to;
    }
  }
  return spans;
}

/** true si la couverture d'un segment se termine dans le passé (trou ouvert). */
export function hasOpenGapToday(spans: CoverageSpan[], todayIso: string): boolean {
  if (spans.length === 0) return false;
  const last = spans[spans.length - 1];
  // Dernier span couvert et fermé, dont la fin est passée → trou jusqu'à aujourd'hui.
  return last.covered && last.to !== null && last.to <= todayIso;
}

/**
 * Une banque a des « périodes manquantes » si AU MOINS un segment concret
 * ayant une couverture présente un trou temporel ou une couverture expirée.
 * (Un segment jamais couvert n'est pas compté comme « trou » : c'est un
 * référentiel non démarré, pas une période manquante entre deux barèmes.)
 */
export function bankHasMissingPeriods(rows: ReferenceJournalRow[], todayIso: string): boolean {
  return CONCRETE_SEGMENTS.some((seg) => {
    const spans = coverageForSegment(rows, seg);
    if (spans.length === 0) return false;
    return spans.some((s) => !s.covered) || hasOpenGapToday(spans, todayIso);
  });
}

/** Échappe une valeur pour un CSV (délimiteur point-virgule, style FR/Excel). */
function csvCell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Sérialise le journal (une ligne par version) en CSV point-virgule, avec un
 * indicateur « périodes manquantes » au niveau banque. BOM UTF-8 pour Excel.
 */
export function journalToCsv(rows: ReferenceJournalRow[], todayIso: string): string {
  const byBank = new Map<string, ReferenceJournalRow[]>();
  for (const r of rows) {
    const list = byBank.get(r.bankCode) ?? [];
    list.push(r);
    byBank.set(r.bankCode, list);
  }
  const missingByBank = new Map<string, boolean>();
  for (const [code, list] of byBank) missingByBank.set(code, bankHasMissingPeriods(list, todayIso));

  const header = [
    'Banque', 'Code', 'Zone', 'Pays', 'Période début', 'Période fin',
    'Types de client', 'Statut', 'Nb conditions', 'Version', 'Périodes manquantes (banque)',
  ];
  const lines = [header.join(';')];
  for (const r of rows) {
    lines.push([
      csvCell(r.bankName), csvCell(r.bankCode), csvCell(r.zone), csvCell(r.countryIso),
      csvCell(r.effectiveFrom), csvCell(r.effectiveTo ?? '∞'),
      csvCell(r.segments.join(', ')), csvCell(r.validationStatus),
      csvCell(r.conditionsCount), csvCell(r.versionLabel ?? ''),
      csvCell(missingByBank.get(r.bankCode) ? 'OUI' : 'non'),
    ].join(';'));
  }
  return '﻿' + lines.join('\r\n');
}
