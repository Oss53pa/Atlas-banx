// ============================================================================
// ATLASBANX — Journal de couverture du référentiel L2 (console admin)
// ============================================================================
// Récupère toutes les versions de barème par banque (via la RPC admin
// `admin_reference_journal`, réservée aux administrateurs), et fournit des
// utilitaires pour dresser le journal et repérer les PÉRIODES MANQUANTES par
// banque et par type de client (segment).
// ============================================================================

import { getSupabaseClient } from '../../lib/supabase';

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
