import { describe, it, expect, beforeEach } from 'vitest';
import {
  freezeReportSnapshot,
  getReportSnapshot,
  reviveReportData,
  deleteReportSnapshot,
  hashReportData,
} from '../reportSnapshot';
import { AnomalyType, Severity, TransactionType, type Anomaly } from '../../../types';
import type { PremiumReportData } from '../../PremiumReportService';

function makeData(amount: number): PremiumReportData {
  const anomaly: Anomaly = {
    id: 'a1', type: AnomalyType.OVERCHARGE, severity: Severity.HIGH,
    confidence: 0.95, amount, recommendation: 'r',
    status: 'pending', detectedAt: new Date('2026-02-01T00:00:00Z'),
    evidence: [],
    transactions: [{
      id: 't1', clientId: 'c1', accountNumber: '1', bankCode: 'NSIA',
      date: new Date('2026-02-02T00:00:00Z'), valueDate: new Date('2026-02-02T00:00:00Z'),
      amount: -amount, balance: 0, description: 'frais', type: TransactionType.DEBIT,
      createdAt: new Date('2026-02-02T00:00:00Z'), updatedAt: new Date('2026-02-02T00:00:00Z'),
    }],
  } as Anomaly;
  return {
    title: 'Rapport', clientName: 'Client',
    period: { start: new Date('2026-02-01T00:00:00Z'), end: new Date('2026-02-28T00:00:00Z') },
    anomalies: [anomaly],
    statistics: { totalAnomalies: 1, totalAnomalyAmount: amount } as PremiumReportData['statistics'],
    summary: { status: 'CRITICAL', message: 'm', keyFindings: [], recommendations: [] } as PremiumReportData['summary'],
  };
}

describe('reportSnapshot', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('gèle et relit un rapport immuable', async () => {
    const snap = await freezeReportSnapshot('rep-1', makeData(10000), '2026-02-01T00:00:00Z');
    expect(snap.contentHash).toHaveLength(64);
    const got = getReportSnapshot('rep-1');
    expect(got?.contentHash).toBe(snap.contentHash);
  });

  it('les données ne bougent pas : re-geler le même id ne réécrit pas', async () => {
    const first = await freezeReportSnapshot('rep-2', makeData(10000), '2026-02-01T00:00:00Z');
    // Nouvelle tentative avec des données DIFFÉRENTES → doit conserver l'originale.
    const second = await freezeReportSnapshot('rep-2', makeData(99999), '2026-03-01T00:00:00Z');
    expect(second.contentHash).toBe(first.contentHash);
    expect(second.frozenAt).toBe('2026-02-01T00:00:00Z');
    expect(reviveReportData(second).statistics.totalAnomalyAmount).toBe(10000);
  });

  it('ranime les dates en objets Date exploitables', async () => {
    const snap = await freezeReportSnapshot('rep-3', makeData(5000), '2026-02-01T00:00:00Z');
    const revived = reviveReportData(snap);
    expect(revived.period.start).toBeInstanceOf(Date);
    expect(revived.anomalies[0].detectedAt).toBeInstanceOf(Date);
    expect(revived.anomalies[0].transactions[0].date).toBeInstanceOf(Date);
  });

  it('empreinte stable pour un contenu identique, différente sinon', async () => {
    const h1 = await hashReportData(makeData(10000));
    const h2 = await hashReportData(makeData(10000));
    const h3 = await hashReportData(makeData(20000));
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
  });

  it('vérifie l\'intégrité : intact → true, altéré → false', async () => {
    const { isSnapshotIntact } = await import('../reportSnapshot');
    const snap = await freezeReportSnapshot('rep-int', makeData(7000), '2026-02-01T00:00:00Z');
    expect(await isSnapshotIntact(snap)).toBe(true);
    const tampered = { ...snap, data: { ...snap.data, statistics: { ...snap.data.statistics, totalAnomalyAmount: 999999 } } };
    expect(await isSnapshotIntact(tampered)).toBe(false);
  });

  it('supprime le snapshot', async () => {
    await freezeReportSnapshot('rep-4', makeData(1000), '2026-02-01T00:00:00Z');
    deleteReportSnapshot('rep-4');
    expect(getReportSnapshot('rep-4')).toBeNull();
  });
});
