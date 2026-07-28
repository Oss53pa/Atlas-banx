// ============================================================================
// useStatementAnalysis — lance/relance l'analyse client-side (19 detecteurs)
// ============================================================================
// L'analyse tourne integralement cote client via AnalysisService + WorkerPool.
// Les resultats (anomalies detectees, statistiques) sont stockes dans le hook
// et exposes au composant pour affichage + relay vers l'onglet Anomalies.
// ============================================================================

import { useCallback, useState } from 'react';
import { runFullAudit } from '../../../services/audit/runFullAudit';
import {
  TransactionType,
  type Transaction,
  type BankConditions,
  type Anomaly as CoreAnomaly,
  type AnalysisResult,
} from '../../../types';
import type { BankTransaction } from '../types/statement.types';

export interface AnalysisResultSummary {
  totalAnomalies: number;
  totalAmount: number;
  status: 'OK' | 'WARNING' | 'CRITICAL';
  message: string;
  keyFindings: string[];
  recommendations: string[];
}

export interface UseStatementAnalysisResult {
  running: boolean;
  progress: number;
  progressStep: string;
  error: string | null;
  lastRunAt: string | null;
  /** Anomalies detectees par la derniere analyse. */
  detectedAnomalies: CoreAnomaly[];
  /** Resume de la derniere analyse. */
  summary: AnalysisResultSummary | null;
  /** Résultat complet de la dernière analyse (pour le rapport PDF premium). */
  lastResult: AnalysisResult | null;
  /** Lance l'analyse sur les transactions fournies. */
  run: (bankTxs: BankTransaction[], bankConditions?: BankConditions) => Promise<void>;
}

/** Convertit BankTransaction (page releve) -> Transaction (AnalysisService). */
function toAnalysisTransaction(tx: BankTransaction, meta: { clientId: string; accountNumber: string; bankCode: string }): Transaction {
  const amount = tx.creditCentimes > 0
    ? tx.creditCentimes / 100
    : -(tx.debitCentimes / 100);
  const d = new Date(tx.date);
  return {
    id: tx.id,
    clientId: meta.clientId,
    accountNumber: meta.accountNumber,
    bankCode: meta.bankCode,
    date: d,
    valueDate: tx.valueDate ? new Date(tx.valueDate) : d,
    amount,
    balance: tx.runningBalanceCentimes / 100,
    description: tx.label,
    reference: tx.reference ?? undefined,
    type: amount < 0 ? TransactionType.DEBIT : TransactionType.CREDIT,
    createdAt: d,
    updatedAt: d,
  };
}

const DEFAULT_BANK_CONDITIONS = {
  bankName: '',
  accountType: 'current',
  fees: {},
  interestRates: {},
  limits: {},
} as unknown as BankConditions;

export function useStatementAnalysis(
  _statementId: string,
  meta?: { clientId: string; accountNumber: string; bankCode: string },
): UseStatementAnalysisResult {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [detectedAnomalies, setDetectedAnomalies] = useState<CoreAnomaly[]>([]);
  const [summary, setSummary] = useState<AnalysisResultSummary | null>(null);
  const [lastResult, setLastResult] = useState<AnalysisResult | null>(null);

  const run = useCallback(
    async (bankTxs: BankTransaction[], bankConditions?: BankConditions) => {
      if (bankTxs.length === 0) {
        setError('Aucune transaction a analyser');
        return;
      }

      setRunning(true);
      setError(null);
      setProgress(0);
      setProgressStep('Initialisation...');

      try {
        const txMeta = meta ?? { clientId: '', accountNumber: '', bankCode: '' };
        const transactions = bankTxs.map((tx) => toAnalysisTransaction(tx, txMeta));

        // Point d'entrée UNIQUE partagé par toutes les catégories de client.
        const result = await runFullAudit({
          transactions,
          bankConditions: bankConditions ?? { ...DEFAULT_BANK_CONDITIONS, bankName: txMeta.bankCode },
          bankCode: txMeta.bankCode || undefined,
          onProgress: (pct, step) => {
            setProgress(pct);
            setProgressStep(step);
          },
        });

        setLastRunAt(new Date().toISOString());
        setLastResult(result);

        // Store detected anomalies
        setDetectedAnomalies(result.anomalies);

        // Store summary
        if (result.summary) {
          setSummary({
            totalAnomalies: result.anomalies.length,
            totalAmount: result.statistics.totalAnomalyAmount,
            status: result.summary.status,
            message: result.summary.message,
            keyFindings: result.summary.keyFindings,
            recommendations: result.summary.recommendations,
          });
        }

        if (result.error) {
          setError(result.error);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur analyse';
        setError(msg);
      } finally {
        setRunning(false);
        setProgress(100);
        setProgressStep('Termine');
      }
    },
    [meta],
  );

  return { running, progress, progressStep, error, lastRunAt, detectedAnomalies, summary, lastResult, run };
}
