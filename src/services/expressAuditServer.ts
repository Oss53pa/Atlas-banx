// ============================================================================
// ATLASBANX — Audit express SERVEUR-AUTORITAIRE (funnel Particulier)
// ============================================================================
// Le récupérable et le prix affichés/facturés ne doivent PAS dépendre du calcul
// navigateur (falsifiable). On envoie les transactions à l'Edge Function
// `express-audit`, qui RE-EXÉCUTE l'audit côté serveur, calcule le récupérable
// et le prix (source de vérité) et STOCKE le rapport détaillé (livré seulement
// après paiement via `express-report`). Ici on ne récupère que le TEASER.
//
// Dégradation gracieuse : si Supabase est indisponible, on renvoie null et
// l'appelant retombe sur l'estimation client (le funnel reste utilisable).
// ============================================================================

import { getSupabaseClient } from '../lib/supabase';
import type { Transaction, BankConditions } from '../types';

export interface ExpressAuditTeaser {
  reference: string;
  recoverableFcfa: number;
  priceFcfa: number;
  isFree: boolean;
  anomalyCount: number;
}

/**
 * Ré-exécute l'audit côté serveur et renvoie le teaser autoritaire
 * (récupérable, prix, gratuité). La `reference` fournie est celle qui servira
 * au paiement (cinetpay-init) et à la livraison gatée (express-report) : elle
 * DOIT être stable de l'analyse jusqu'au paiement. Renvoie null si indisponible.
 */
export async function requestExpressAudit(input: {
  reference: string;
  transactions: Transaction[];
  bankConditions?: BankConditions;
  bankCode?: string;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  months?: number;
}): Promise<ExpressAuditTeaser | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.functions.invoke('express-audit', {
      body: {
        reference: input.reference,
        transactions: input.transactions,
        bankConditions: input.bankConditions,
        bankCode: input.bankCode || undefined,
        periodStart: input.periodStart ? input.periodStart.toISOString() : undefined,
        periodEnd: input.periodEnd ? input.periodEnd.toISOString() : undefined,
        months: input.months,
      },
    });
    if (error || !data || typeof data.recoverableFcfa !== 'number') return null;
    return {
      reference: input.reference,
      recoverableFcfa: data.recoverableFcfa,
      priceFcfa: data.priceFcfa,
      isFree: Boolean(data.isFree),
      anomalyCount: Number(data.anomalyCount) || 0,
    };
  } catch {
    return null;
  }
}

export interface ExpressReportResult {
  paid: boolean;
  reportHtml?: string;
}

/**
 * Récupère le rapport détaillé STOCKÉ côté serveur — livré uniquement si le
 * paiement associé est confirmé (ou si le rapport est gratuit). Renvoie
 * `{ paid: false }` tant que le paiement n'est pas confirmé (HTTP 402) ou en
 * cas d'indisponibilité.
 */
export async function fetchExpressReport(reference: string): Promise<ExpressReportResult> {
  const supabase = getSupabaseClient();
  if (!supabase) return { paid: false };
  try {
    const { data, error } = await supabase.functions.invoke('express-report', {
      body: { reference },
    });
    // invoke considère 402 comme une erreur → paiement non confirmé.
    if (error || !data || !data.paid) return { paid: false };
    return { paid: true, reportHtml: typeof data.reportHtml === 'string' ? data.reportHtml : undefined };
  } catch {
    return { paid: false };
  }
}
