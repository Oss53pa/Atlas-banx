// ============================================================================
// ATLASBANX — Archive minimale du livrable certifié (audit express)
// ============================================================================
// Le parcours particulier ne conserve NI le relevé NI les données personnelles.
// On enregistre uniquement une empreinte inviolable du PDF certifié + des
// métadonnées non nominatives, à des fins de preuve en cas de contrôle/enquête
// (table append-only, lecture réservée aux admins — cf. migration 044).
// Best-effort : un échec d'archivage ne bloque JAMAIS la remise du rapport.
// ============================================================================

import { getSupabaseClient } from '../../lib/supabase';

export interface ExpressArchiveRow {
  reportRef: string;
  pdfSha256: string;
  bankCode?: string;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  anomalyCount: number;
  totalRecoverable: number;
  usedOfficialGrid: boolean;
}

/** SHA-256 (hex) d'un buffer (les octets EXACTS du PDF téléchargé). */
export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function toIsoDate(d?: Date | null): string | null {
  return d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : null;
}

/**
 * Enregistre l'empreinte du livrable dans l'archive Atlas. Ne lève jamais :
 * en cas d'échec (hors-ligne, non configuré), on renvoie false et le parcours
 * continue normalement.
 */
export async function archiveExpressReport(row: ExpressArchiveRow): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    // Écriture via la fonction contrôlée (valide le format, borne les montants,
    // ignore les collisions) — plus d'INSERT direct anonyme (cf. migration 047).
    const { error } = await supabase
      .schema('atlasbanx')
      .rpc('express_archive_insert', {
        p_report_ref: row.reportRef,
        p_pdf_sha256: row.pdfSha256,
        p_bank_code: row.bankCode || null,
        p_period_start: toIsoDate(row.periodStart),
        p_period_end: toIsoDate(row.periodEnd),
        p_anomaly_count: row.anomalyCount,
        p_total_recoverable: Math.round(row.totalRecoverable),
        p_used_official_grid: row.usedOfficialGrid,
      });
    return !error;
  } catch {
    return false;
  }
}
