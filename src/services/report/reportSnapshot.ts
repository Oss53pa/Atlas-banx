// ============================================================================
// reportSnapshot — gèle le contenu d'un rapport au moment de sa génération
// ============================================================================
// Exigence métier : « quand un rapport est déjà généré, les données qu'il
// contient ne doivent pas bouger ». Or tous les rendus (aperçu + PDF premium)
// reconstruisaient le rapport à partir de l'analyse EN COURS — donc les chiffres
// changeaient si l'analyse était relancée ou les transactions modifiées.
//
// Ce module capture, à la génération, une copie immuable de la charge utile
// premium (PremiumReportData) + une empreinte SHA-256 du contenu. Les
// re-téléchargements et l'aperçu relisent ce snapshot, jamais l'analyse vivante.
//
// Persistance : localStorage (les rapports clients sont déjà local-only). Les
// dates sont sérialisées en ISO et ranimées à la lecture (revive*).
// ============================================================================

import type { PremiumReportData } from '../PremiumReportService';
import type { Anomaly, Transaction } from '../../types';

const STORAGE_KEY = 'atlasbanx_report_snapshots_v1';

export interface ReportSnapshot {
  /** Identifiant du rapport (ClientReport.id). */
  id: string;
  /** Horodatage de gel (ISO). */
  frozenAt: string;
  /** Empreinte SHA-256 du contenu gelé (preuve de non-altération). */
  contentHash: string;
  /** Charge utile premium sérialisée (dates en ISO). */
  data: PremiumReportData;
}

// ----------------------------------------------------------------------------
// Sérialisation / ranimation des dates
// ----------------------------------------------------------------------------

/** Copie JSON-safe (Date -> ISO string via JSON.stringify). */
function toSerializable(data: PremiumReportData): PremiumReportData {
  return JSON.parse(JSON.stringify(data)) as PremiumReportData;
}

function toDate(v: unknown): Date {
  return v instanceof Date ? v : new Date(v as string);
}

/** Ranime les Date connues d'une transaction persistée. */
function reviveTransaction(t: Transaction): Transaction {
  return {
    ...t,
    date: toDate(t.date),
    valueDate: t.valueDate ? toDate(t.valueDate) : t.valueDate,
    createdAt: t.createdAt ? toDate(t.createdAt) : t.createdAt,
    updatedAt: t.updatedAt ? toDate(t.updatedAt) : t.updatedAt,
  } as Transaction;
}

/** Ranime les Date connues d'une anomalie persistée. */
function reviveAnomaly(a: Anomaly): Anomaly {
  return {
    ...a,
    detectedAt: toDate(a.detectedAt),
    reviewedAt: a.reviewedAt ? toDate(a.reviewedAt) : a.reviewedAt,
    transactions: (a.transactions ?? []).map(reviveTransaction),
  } as Anomaly;
}

/** Reconstruit une PremiumReportData exploitable (Date ranimées) depuis un snapshot. */
export function reviveReportData(snap: ReportSnapshot): PremiumReportData {
  const d = snap.data;
  return {
    ...d,
    period: { start: toDate(d.period.start), end: toDate(d.period.end) },
    anomalies: (d.anomalies ?? []).map(reviveAnomaly),
  };
}

// ----------------------------------------------------------------------------
// Empreinte
// ----------------------------------------------------------------------------

export async function hashReportData(data: PremiumReportData): Promise<string> {
  const canonical = JSON.stringify(toSerializable(data));
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  const b = new Uint8Array(buf);
  let h = '';
  for (let i = 0; i < b.length; i++) h += b[i].toString(16).padStart(2, '0');
  return h;
}

// ----------------------------------------------------------------------------
// Persistance
// ----------------------------------------------------------------------------

function readAll(): Record<string, ReportSnapshot> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ReportSnapshot>) : {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, ReportSnapshot>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota / mode privé — best-effort */
  }
}

/**
 * Gèle un rapport : stocke une copie immuable + empreinte. Idempotent par id —
 * un rapport déjà gelé n'est PAS réécrit (ses données ne doivent pas bouger).
 * Renvoie le snapshot en vigueur (existant ou nouvellement créé).
 */
export async function freezeReportSnapshot(
  id: string,
  data: PremiumReportData,
  frozenAtIso: string,
): Promise<ReportSnapshot> {
  const all = readAll();
  const existing = all[id];
  if (existing) return existing;
  const snap: ReportSnapshot = {
    id,
    frozenAt: frozenAtIso,
    contentHash: await hashReportData(data),
    data: toSerializable(data),
  };
  all[id] = snap;
  writeAll(all);
  return snap;
}

export function getReportSnapshot(id: string): ReportSnapshot | null {
  return readAll()[id] ?? null;
}

export function deleteReportSnapshot(id: string): void {
  const all = readAll();
  if (all[id]) {
    delete all[id];
    writeAll(all);
  }
}
