// ============================================================================
// ATLASBANX — Point d'entrée UNIQUE de l'audit complet
// ============================================================================
// Le même moteur (AnalysisService, 19 détecteurs) sert les 3 catégories de
// client — Entreprise, Cabinet, Particulier — pour une finalité identique.
// Toute surface (détail relevé authentifié, funnel particulier éphémère…)
// passe par ici afin de garantir un audit strictement équivalent.
// ============================================================================

import { getAnalysisService } from '../AnalysisService';
import {
  AnomalyType,
  type AnalysisConfig,
  type AnalysisResult,
  type Transaction,
  type BankConditions,
  type DetectionThresholds,
  type DailyBalance,
} from '../../types';

/** Les 12 détecteurs de l'audit complet (mêmes que le détail relevé). */
export const FULL_AUDIT_DETECTORS: AnomalyType[] = [
  AnomalyType.DUPLICATE_FEE,
  AnomalyType.GHOST_FEE,
  AnomalyType.OVERCHARGE,
  AnomalyType.INTEREST_ERROR,
  AnomalyType.VALUE_DATE_ERROR,
  AnomalyType.SUSPICIOUS_TRANSACTION,
  AnomalyType.COMPLIANCE_VIOLATION,
  AnomalyType.CASHFLOW_ANOMALY,
  AnomalyType.RECONCILIATION_GAP,
  AnomalyType.OHADA_NON_COMPLIANCE,
  AnomalyType.AML_ALERT,
  AnomalyType.FEE_ANOMALY,
];

const EMPTY_BANK_CONDITIONS = {
  bankName: '',
  accountType: 'current',
  fees: {},
  interestRates: {},
  limits: {},
} as unknown as BankConditions;

export interface RunFullAuditParams {
  transactions: Transaction[];
  /** Conditions bancaires applicables ; vides par défaut (détecteurs sans barème). */
  bankConditions?: BankConditions;
  bankCode?: string;
  thresholds?: DetectionThresholds;
  onProgress?: (pct: number, step: string) => void;
}

/**
 * Lance l'audit complet côté client (workers activés). Renvoie le résultat
 * standard (anomalies, statistiques, synthèse) — identique quelle que soit la
 * catégorie de client.
 */
export async function runFullAudit(params: RunFullAuditParams): Promise<AnalysisResult> {
  const config = {
    enabledDetectors: FULL_AUDIT_DETECTORS,
    dateRange: {},
    // IMPORTANT : ne PAS filtrer les transactions par code banque.
    // Dans un audit mono-relevé (funnel particulier, détail d'un relevé), les
    // transactions extraites du PDF ne portent pas le code de la banque
    // sélectionnée — poser `bankCodes: [bankCode]` viderait TOUT l'audit
    // (filterTransactions rejette les transactions dont t.bankCode ≠ sélection).
    // Le bankCode ne sert qu'à résoudre le barème (bankConditions), pas à filtrer.
    bankCodes: undefined,
  } as unknown as AnalysisConfig;

  // Soldes quotidiens dérivés des transactions (date, solde, n° de compte) :
  // sans eux, le détecteur d'intérêts/agios (INTEREST_ERROR) était désactivé et
  // les agios indus — une catégorie récupérable majeure — n'étaient jamais
  // détectés. On les reconstitue à partir du solde courant de chaque écriture.
  const accountBalances: DailyBalance[] = params.transactions
    .filter((t) => typeof t.balance === 'number' && !Number.isNaN(t.balance))
    .map((t) => ({
      date: t.date instanceof Date ? t.date : new Date(t.date),
      balance: t.balance as number,
      accountNumber: t.accountNumber ?? '',
    }));

  const service = getAnalysisService(params.thresholds);
  return service.analyzeTransactions(
    params.transactions,
    params.bankConditions ?? { ...EMPTY_BANK_CONDITIONS, bankName: params.bankCode ?? '' },
    config,
    // useWorkers: false — chemin de détection SÉQUENTIEL, robuste en production.
    // Le pool de Web Workers ne s'initialise pas toujours (CSP stricte, build
    // single-file) ; sur échec l'audit renvoyait 0 anomalie sans exécuter les
    // détecteurs. Ce point d'entrée partagé (funnel particulier, détail relevé)
    // privilégie la fiabilité — quelques centaines de transactions s'analysent
    // instantanément en séquentiel.
    {
      useWorkers: false,
      onProgress: params.onProgress,
      accountBalances: accountBalances.length > 0 ? accountBalances : undefined,
    },
  );
}
