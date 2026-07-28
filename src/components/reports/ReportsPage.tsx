import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Download, Calendar, Trash2, Eye,
  Brain, Loader2, Building2, Landmark, ChevronRight, LayoutGrid, List,
  FileCheck, Clock, Archive, Printer
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Modal,
  Select,
} from '../ui';
import { useAnalysisStore, useTransactionStore, useSettingsStore, useClientStore } from '../../store';
import { PremiumReportService, auditLog, AuditEventType } from '../../services';
import {
  freezeReportSnapshot,
  getReportSnapshot,
  reviveReportData,
  deleteReportSnapshot,
} from '../../services/report/reportSnapshot';
import { formatCurrency, formatDate } from '../../utils';
import { Severity, type Anomaly } from '../../types';
import { partitionByCertainty } from '../../services/audit/anomalyCertainty';
import { ReportViewer, generateAtlasBanxAuditReport } from '../reporting';
import type { FullReport, BankStatement, ClientReport, Client, AnalysisResult } from '../../types';

type ViewMode = 'table' | 'card';
type TabType = 'statements' | 'reports';

export function ReportsPage() {
  const navigate = useNavigate();
  const { currentAnalysis, analysisHistory } = useAnalysisStore();
  const { transactions } = useTransactionStore();
  const { claudeApi, organization } = useSettingsStore();
  const { clients, statements, reports, addReport, updateReport, deleteReport, deleteStatement } = useClientStore();

  // Supprime un relevé importé (Supabase + store), après confirmation. Retire
  // aussi les rapports gelés qui en dépendent n'a pas de sens ici : les rapports
  // restent, mais le relevé source disparaît de la liste.
  const handleDeleteStatement = (statement: BankStatement) => {
    const label = `${getClient(statement.clientId)?.name ?? 'ce client'} · ${formatDate(statement.periodStart)} → ${formatDate(statement.periodEnd)}`;
    if (!window.confirm(`Supprimer le relevé importé (${label}) ? Cette action est définitive.`)) return;
    void deleteStatement(statement.id);
  };

  const [activeTab, setActiveTab] = useState<TabType>('statements');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showViewer, setShowViewer] = useState(false);
  const [previewReport, setPreviewReport] = useState<FullReport | null>(null);
  const [selectedStatement, setSelectedStatement] = useState<BankStatement | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reportConfig, setReportConfig] = useState({
    type: 'audit' as 'audit' | 'summary' | 'detailed' | 'recovery',
    includeAI: true,
  });

  // Get client by ID
  const getClient = (clientId: string) => clients.find(c => c.id === clientId);

  // Statistiques RECALCULÉES pour le périmètre d'un seul client/relevé. Les
  // statistiques globales de l'analyse (toutes clients) ne doivent JAMAIS
  // alimenter un rapport nominatif : sinon le donut/les barres/le graphe par
  // type exposent la répartition d'AUTRES clients et contredisent l'entête.
  const buildClientStatistics = (
    filtered: Anomaly[],
    statementTxCount: number,
  ): AnalysisResult['statistics'] => {
    const bySeverity = {
      [Severity.CRITICAL]: 0, [Severity.HIGH]: 0, [Severity.MEDIUM]: 0, [Severity.LOW]: 0,
    } as Record<Severity, number>;
    const byType: Record<string, number> = {};
    let totalAmount = 0;
    for (const a of filtered) {
      bySeverity[a.severity] = (bySeverity[a.severity] ?? 0) + 1;
      byType[a.type] = (byType[a.type] ?? 0) + 1;
      totalAmount += a.amount || 0;
    }
    return {
      totalTransactions: statementTxCount,
      analyzedTransactions: statementTxCount,
      totalAnomalies: filtered.length,
      totalAnomalyAmount: totalAmount,
      // Économies potentielles = uniquement le récupérable CERTAIN (≥ 90 %).
      potentialSavings: partitionByCertainty(filtered).certainAmount,
      anomaliesBySeverity: bySeverity,
      anomaliesByType: byType,
    } as AnalysisResult['statistics'];
  };

  // Nombre de transactions du relevé (périmètre client), pour les stats.
  const statementTxCount = (statement: BankStatement): number =>
    transactions.filter(
      t => t.clientId === statement.clientId &&
        new Date(t.date) >= new Date(statement.periodStart) &&
        new Date(t.date) <= new Date(statement.periodEnd),
    ).length;

  // Get statement stats
  const getStatementStats = (statement: BankStatement) => {
    const statementTransactions = transactions.filter(
      t => t.clientId === statement.clientId &&
      new Date(t.date) >= new Date(statement.periodStart) &&
      new Date(t.date) <= new Date(statement.periodEnd)
    );

    const allAnalyses = [...(currentAnalysis ? [currentAnalysis] : []), ...(analysisHistory || [])];
    const anomalies = allAnalyses.flatMap(a => a.anomalies).filter(an =>
      an.transactions.some(t =>
        t.clientId === statement.clientId &&
        new Date(t.date) >= new Date(statement.periodStart) &&
        new Date(t.date) <= new Date(statement.periodEnd)
      )
    );

    const totalAmount = anomalies.reduce((sum, a) => sum + a.amount, 0);

    return {
      transactions: statementTransactions.length,
      anomalies: anomalies.length,
      amount: totalAmount,
    };
  };

  // Get reports for a statement
  const getStatementReports = (statement: BankStatement) => {
    return reports.filter(r =>
      r.clientId === statement.clientId &&
      new Date(r.period.start).getTime() === new Date(statement.periodStart).getTime() &&
      new Date(r.period.end).getTime() === new Date(statement.periodEnd).getTime()
    );
  };

  // Charte cabinet (marque blanche) dérivée des réglages d'organisation.
  const buildCabinetBranding = () =>
    organization?.name
      ? {
          name: organization.name,
          tagline: organization.legalName || undefined,
          address: [organization.address, organization.city, organization.country].filter(Boolean).join(', ') || undefined,
          phone: organization.phone || undefined,
          email: organization.senderEmail || undefined,
          website: organization.website || undefined,
          logo: organization.logo || undefined,
          accentColor: organization.accentColor || undefined,
        }
      : undefined;

  // Re-télécharge un rapport DÉJÀ généré depuis son snapshot gelé : les données
  // sont exactement celles de la génération initiale (immuables). Repli sur
  // l'analyse vivante uniquement pour les anciens rapports sans snapshot.
  const downloadFrozenReport = async (report: ClientReport) => {
    const snap = getReportSnapshot(report.id);
    if (snap) {
      await PremiumReportService.download(reviveReportData(snap), undefined, report.id, { userPermissions: ['print'] });
      return;
    }
    // Un rapport GELÉ (contentHash présent) dont le snapshot est introuvable ne
    // doit PAS être reconstruit depuis l'analyse vivante — cela ferait « bouger »
    // les données. On le signale plutôt que de livrer un PDF potentiellement
    // différent de l'original.
    if (report.contentHash) {
      window.dispatchEvent(new CustomEvent('atlas-toast', {
        detail: { type: 'error', message: 'Instantané du rapport introuvable sur cet appareil — régénérez le rapport pour le retélécharger.' },
      }));
      return;
    }
    // Rapport LEGACY (jamais gelé) : reconstruction au mieux depuis l'analyse.
    const client = getClient(report.clientId);
    const allAnalyses = [...(currentAnalysis ? [currentAnalysis] : []), ...(analysisHistory || [])];
    const analysisData = allAnalyses.find(a =>
      a.anomalies.some(an => an.transactions.some(t => t.clientId === report.clientId)),
    );
    if (client && analysisData) {
      const clientAnomalies = analysisData.anomalies.filter(an =>
        an.transactions.some(t => t.clientId === report.clientId),
      );
      await PremiumReportService.download(
        {
          title: report.title,
          clientName: client.name,
          period: report.period,
          anomalies: clientAnomalies,
          statistics: buildClientStatistics(clientAnomalies, 0),
          summary: analysisData.summary,
          cabinet: buildCabinetBranding(),
          auditId: report.id,
        },
        undefined,
        report.id,
        { userPermissions: ['print'] },
      );
    } else {
      window.dispatchEvent(new CustomEvent('atlas-toast', {
        detail: { type: 'error', message: 'Aucune analyse disponible pour régénérer ce rapport.' },
      }));
    }
  };

  // Suppression : retire aussi le snapshot gelé associé.
  const removeReport = (id: string) => {
    deleteReportSnapshot(id);
    deleteReport(id);
  };

  // Generate report for statement
  const handleGenerateReport = async (statement: BankStatement) => {
    const client = getClient(statement.clientId);
    if (!client) return;

    setGenerating(true);
    try {
      // Anomalies du CLIENT uniquement (jamais celles des autres clients).
      const allAnalyses = [...(currentAnalysis ? [currentAnalysis] : []), ...(analysisHistory || [])];
      const analysisData = allAnalyses.find(a =>
        a.anomalies.some(an => an.transactions.some(t => t.clientId === statement.clientId)),
      );
      const clientAnomalies = (analysisData?.anomalies ?? []).filter(an =>
        an.transactions.some(t => t.clientId === statement.clientId),
      );
      const clientStats = buildClientStatistics(clientAnomalies, statementTxCount(statement));
      // Montant affiché = récupérable CERTAIN (≥ 90 %), cohérent avec le PDF.
      const recoverable = partitionByCertainty(clientAnomalies).certainAmount;

      // Identifiant STABLE et unique (le store conserve cet id via le spread).
      const reportId = crypto.randomUUID();
      const reportData: ClientReport = {
        id: reportId,
        clientId: statement.clientId,
        title: `Rapport ${reportConfig.type} - ${client.name}`,
        type: reportConfig.type,
        period: {
          start: new Date(statement.periodStart),
          end: new Date(statement.periodEnd),
        },
        anomalyCount: clientAnomalies.length,
        totalAmount: recoverable,
        recoveredAmount: 0,
        status: 'final',
        generatedAt: new Date(),
      };

      addReport(reportData);

      auditLog({
        eventType: AuditEventType.REPORT_GENERATED,
        resourceType: 'report',
        action: 'created',
        resourceId: reportId,
        clientId: statement.clientId,
        payload: {
          reportType: reportConfig.type,
          anomalyCount: clientAnomalies.length,
          recoverableAmount: recoverable,
          period: { start: reportData.period.start, end: reportData.period.end },
        },
      });

      if (analysisData) {
        // Rapport canonique unifié : PDF premium (même moteur que Analyses /
        // audit express), périmètre client, chiffré (non modifiable).
        const premiumPayload = {
          title: reportData.title,
          clientName: client.name,
          period: reportData.period,
          anomalies: clientAnomalies,
          statistics: clientStats,
          summary: analysisData.summary,
          cabinet: buildCabinetBranding(),
          auditId: reportId,
        };

        // Gèle le contenu : à partir d'ici, les données de CE rapport ne bougent
        // plus, même si l'analyse est relancée. Empreinte rattachée au rapport.
        const snap = await freezeReportSnapshot(reportId, premiumPayload, reportData.generatedAt.toISOString());
        updateReport(reportId, { contentHash: snap.contentHash });

        // Livrable CERTIFIÉ : PDF chiffré, permissions « impression seule ».
        await PremiumReportService.download(premiumPayload, undefined, reportId, { userPermissions: ['print'] });
      }

      setShowGenerateModal(false);
      setSelectedStatement(null);
    } catch (error) {
      console.error('Erreur generation rapport:', error);
    } finally {
      setGenerating(false);
    }
  };

  // View report
  const handleViewReport = (statement: BankStatement) => {
    const client = getClient(statement.clientId);
    if (!client) return;

    const allAnalyses = [...(currentAnalysis ? [currentAnalysis] : []), ...(analysisHistory || [])];
    const analysisData = allAnalyses.find(a =>
      a.anomalies.some(an => an.transactions.some(t => t.clientId === statement.clientId))
    ) || createEmptyAnalysis(client);

    const report = generateAtlasBanxAuditReport({
      client: client as any,
      analysis: analysisData as unknown as AnalysisResult,
      auditorName: 'Expert-Comptable',
      auditorCompany: 'Cabinet d\'Expertise Comptable',
    });

    setPreviewReport(report);
    setShowViewer(true);
  };

  // Create empty analysis for preview
  const createEmptyAnalysis = (client: Client) => {
    const defaultDate = new Date();
    return {
      id: 'demo-analysis',
      status: 'completed' as const,
      startedAt: defaultDate,
      completedAt: defaultDate,
      anomalies: [],
      config: {
        dateRange: { start: new Date(defaultDate.getFullYear(), 0, 1), end: defaultDate },
        transactionIds: [],
        clientId: client.id,
        rules: [],
      },
      statistics: {
        totalTransactions: 0,
        analyzedTransactions: 0,
        totalAnomalies: 0,
        totalAnomalyAmount: 0,
        potentialSavings: 0,
        anomaliesBySeverity: {
          [Severity.CRITICAL]: 0,
          [Severity.HIGH]: 0,
          [Severity.MEDIUM]: 0,
          [Severity.LOW]: 0,
        },
        anomaliesByType: {},
      },
      summary: {
        status: 'OK' as const,
        message: 'Aucune anomalie detectee.',
        keyFindings: [],
        recommendations: [],
      },
    };
  };

  // Aperçu d'un rapport DÉJÀ généré : rendu depuis le snapshot gelé (données
  // figées). Repli sur l'analyse vivante pour les anciens rapports sans snapshot.
  const handleViewFrozenReport = (report: ClientReport) => {
    const client = getClient(report.clientId);
    if (!client) return;
    const snap = getReportSnapshot(report.id);
    if (!snap) {
      const statement = statements.find(s =>
        s.clientId === report.clientId &&
        new Date(s.periodStart).getTime() === new Date(report.period.start).getTime(),
      );
      if (statement) handleViewReport(statement);
      return;
    }
    const frozen = reviveReportData(snap);
    const base = createEmptyAnalysis(client);
    const analysis = {
      ...base,
      anomalies: frozen.anomalies,
      statistics: frozen.statistics,
      summary: frozen.summary,
    } as unknown as AnalysisResult;
    const rendered = generateAtlasBanxAuditReport({
      client: client as any,
      analysis,
      auditorName: 'Expert-Comptable',
      auditorCompany: buildCabinetBranding()?.name ?? 'Cabinet d\'Expertise Comptable',
    });
    setPreviewReport(rendered);
    setShowViewer(true);
  };

  const statusConfig = {
    imported: { label: 'Importe', color: 'bg-primary-100 text-primary-700', icon: Clock },
    analyzed: { label: 'Analyse', color: 'bg-primary-100 text-primary-700', icon: FileCheck },
    archived: { label: 'Archive', color: 'bg-gray-100 text-gray-700', icon: Archive },
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-primary-900">Rapports</h1>
        <p className="text-sm text-primary-500">Generez des rapports d'audit bancaire</p>
      </div>

      {/* Tabs & View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex border-b border-primary-200">
          <button
            onClick={() => setActiveTab('statements')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'statements'
                ? 'border-primary-900 text-primary-900'
                : 'border-transparent text-primary-500 hover:text-primary-700'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-1.5" />
            Releves ({statements.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'reports'
                ? 'border-primary-900 text-primary-900'
                : 'border-transparent text-primary-500 hover:text-primary-700'
            }`}
          >
            <FileCheck className="w-4 h-4 inline mr-1.5" />
            Rapports generes ({reports.length})
          </button>
        </div>
        <div className="flex border border-primary-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-primary-900 text-white' : 'bg-white text-primary-500 hover:bg-primary-50'}`}
            title="Vue tableau"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('card')}
            className={`p-2 transition-colors ${viewMode === 'card' ? 'bg-primary-900 text-white' : 'bg-white text-primary-500 hover:bg-primary-50'}`}
            title="Vue cartes"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Statements Tab */}
      {activeTab === 'statements' && (
        <>
          {viewMode === 'table' ? (
            /* Table View - Always show */
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-primary-50 border-b border-primary-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-primary-600 uppercase">Client</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-primary-600 uppercase">Banque</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-primary-600 uppercase">Période</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-primary-600 uppercase">Opérations</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-primary-600 uppercase">Anomalies</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-primary-600 uppercase">Montant</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-primary-600 uppercase">Statut</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-primary-600 uppercase">Rapports</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-primary-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-100">
                    {statements.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center">
                          <FileText className="w-8 h-8 text-primary-300 mx-auto mb-2" />
                          <p className="text-sm text-primary-500">
                            Aucun releve importe.{' '}
                            <button
                              onClick={() => navigate('/import')}
                              className="text-primary-900 underline hover:text-primary-700"
                            >
                              Importer des releves
                            </button>
                          </p>
                        </td>
                      </tr>
                    ) : (
                      statements.map((statement) => {
                      const client = getClient(statement.clientId);
                      const stats = getStatementStats(statement);
                      const statementReports = getStatementReports(statement);
                      const StatusIcon = statusConfig[statement.status].icon;

                      return (
                        <tr key={statement.id} className="hover:bg-primary-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-primary-900 flex items-center justify-center flex-shrink-0">
                                <Building2 className="w-4 h-4 text-white" />
                              </div>
                              <span className="text-sm font-medium text-primary-900">
                                {client?.name || 'Client inconnu'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Landmark className="w-3.5 h-3.5 text-primary-400" />
                              <span className="text-sm text-primary-600">{statement.bankName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-primary-400" />
                              <span className="text-xs text-primary-600">
                                {formatDate(statement.periodStart)} - {formatDate(statement.periodEnd)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm text-primary-600">{stats.transactions}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {stats.anomalies > 0 ? (
                              <Badge variant="warning">{stats.anomalies}</Badge>
                            ) : (
                              <span className="text-sm text-primary-400">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-medium text-green-600">
                              {formatCurrency(stats.amount, 'XAF')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[statement.status].color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig[statement.status].label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {statementReports.length > 0 ? (
                              <Badge variant="secondary">{statementReports.length}</Badge>
                            ) : (
                              <span className="text-sm text-primary-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleViewReport(statement)}
                                className="p-1.5 hover:bg-primary-100 rounded text-primary-500 hover:text-primary-700"
                                title="Voir le rapport"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedStatement(statement);
                                  setShowGenerateModal(true);
                                }}
                                className="p-1.5 hover:bg-primary-50 rounded text-primary-500 hover:text-primary-600"
                                title="Generer un rapport"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => navigate(`/clients/${statement.clientId}`)}
                                className="p-1.5 hover:bg-primary-100 rounded text-primary-500 hover:text-primary-700"
                                title="Voir le client"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteStatement(statement)}
                                className="p-1.5 hover:bg-red-50 rounded text-primary-500 hover:text-red-600"
                                title="Supprimer le relevé"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            /* Card View */
            statements.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="w-8 h-8 text-primary-300 mx-auto mb-2" />
                <p className="text-sm text-primary-500">
                  Aucun releve importe.{' '}
                  <button
                    onClick={() => navigate('/import')}
                    className="text-primary-900 underline hover:text-primary-700"
                  >
                    Importer des releves
                  </button>
                </p>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {statements.map((statement) => {
                const client = getClient(statement.clientId);
                const stats = getStatementStats(statement);
                const statementReports = getStatementReports(statement);
                const StatusIcon = statusConfig[statement.status].icon;

                return (
                  <Card key={statement.id} className="p-3 hover:border-primary-300 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary-900 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-primary-900">{client?.name || 'Client inconnu'}</h3>
                          <p className="text-xs text-primary-500">{statement.bankName}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[statement.status].color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig[statement.status].label}
                      </span>
                    </div>

                    <div className="text-xs text-primary-500 mb-3 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(statement.periodStart)} - {formatDate(statement.periodEnd)}
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center p-2 bg-primary-50 rounded">
                        <p className="text-lg font-bold text-primary-900">{stats.transactions}</p>
                        <p className="text-xs text-primary-500">Tx</p>
                      </div>
                      <div className="text-center p-2 bg-amber-50 rounded">
                        <p className="text-lg font-bold text-amber-600">{stats.anomalies}</p>
                        <p className="text-xs text-primary-500">Anom.</p>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded">
                        <p className="text-sm font-bold text-green-600">{formatCurrency(stats.amount, 'XAF')}</p>
                        <p className="text-xs text-primary-500">Montant</p>
                      </div>
                    </div>

                    {statementReports.length > 0 && (
                      <div className="mb-3 p-2 bg-primary-50 rounded flex items-center justify-between">
                        <span className="text-xs text-primary-700">{statementReports.length} rapport(s) genere(s)</span>
                        <FileCheck className="w-4 h-4 text-primary-600" />
                      </div>
                    )}

                    <div className="flex gap-2 pt-2 border-t border-primary-100">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleViewReport(statement)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Voir
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedStatement(statement);
                          setShowGenerateModal(true);
                        }}
                      >
                        <Printer className="w-3 h-3 mr-1" />
                        Generer
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteStatement(statement)}
                        title="Supprimer le relevé"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
              </div>
            )
          )}
        </>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <>
          {viewMode === 'table' ? (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-primary-50 border-b border-primary-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-primary-600 uppercase">Titre</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-primary-600 uppercase">Client</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-primary-600 uppercase">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-primary-600 uppercase">Période</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-primary-600 uppercase">Anomalies</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-primary-600 uppercase">Montant</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-primary-600 uppercase">Statut</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-primary-600 uppercase">Créé le</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-primary-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-100">
                    {reports.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center">
                          <FileCheck className="w-8 h-8 text-primary-300 mx-auto mb-2" />
                          <p className="text-sm text-primary-500">Aucun rapport genere</p>
                          <p className="text-xs text-primary-400 mt-1">Generez des rapports depuis l'onglet Releves</p>
                        </td>
                      </tr>
                    ) : (
                      reports.map((report) => {
                      const client = getClient(report.clientId);
                      const typeLabels = {
                        audit: 'Audit complet',
                        summary: 'Synthetique',
                        detailed: 'Detaille',
                        recovery: 'Recouvrement',
                      };
                      const statusLabels = {
                        draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700' },
                        final: { label: 'Final', color: 'bg-primary-100 text-primary-700' },
                        sent: { label: 'Envoye', color: 'bg-primary-100 text-primary-700' },
                      };

                      return (
                        <tr key={report.id} className="hover:bg-primary-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-primary-500" />
                              <span className="text-sm font-medium text-primary-900">{report.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-primary-600">{client?.name || 'Client inconnu'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-primary-500">{typeLabels[report.type]}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-primary-600">
                              {formatDate(report.period.start)} - {formatDate(report.period.end)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="secondary">{report.anomalyCount}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-medium text-green-600">
                              {formatCurrency(report.totalAmount, 'XAF')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusLabels[report.status].color}`}>
                              {statusLabels[report.status].label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-primary-500">{formatDate(report.generatedAt)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleViewFrozenReport(report)}
                                className="p-1.5 hover:bg-primary-100 rounded text-primary-500 hover:text-primary-700"
                                title="Voir le rapport (données figées)"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => void downloadFrozenReport(report)}
                                className="p-1.5 hover:bg-primary-100 rounded text-primary-500 hover:text-primary-700"
                                title="Télécharger le PDF (données figées)"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => removeReport(report.id)}
                                className="p-1.5 hover:bg-red-50 rounded text-primary-500 hover:text-red-600"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            reports.length === 0 ? (
              <Card className="p-8 text-center">
                <FileCheck className="w-8 h-8 text-primary-300 mx-auto mb-2" />
                <p className="text-sm text-primary-500">Aucun rapport genere</p>
                <p className="text-xs text-primary-400 mt-1">Generez des rapports depuis l'onglet Releves</p>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {reports.map((report) => {
                const client = getClient(report.clientId);
                const typeLabels = {
                  audit: 'Audit complet',
                  summary: 'Synthetique',
                  detailed: 'Detaille',
                  recovery: 'Recouvrement',
                };

                return (
                  <Card key={report.id} className="p-3 hover:border-primary-300 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary-100 rounded-lg">
                          <FileText className="w-4 h-4 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-primary-900 line-clamp-1">{report.title}</h3>
                          <p className="text-xs text-primary-500">{client?.name}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      <div className="flex items-center gap-1 text-primary-500">
                        <Calendar className="w-3 h-3" />
                        {formatDate(report.generatedAt)}
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">{typeLabels[report.type]}</Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="p-2 bg-primary-50 rounded text-center">
                        <p className="text-lg font-bold text-primary-900">{report.anomalyCount}</p>
                        <p className="text-xs text-primary-500">Anomalies</p>
                      </div>
                      <div className="p-2 bg-green-50 rounded text-center">
                        <p className="text-sm font-bold text-green-600">{formatCurrency(report.totalAmount, 'XAF')}</p>
                        <p className="text-xs text-primary-500">Montant</p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-primary-100">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleViewFrozenReport(report)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Voir
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void downloadFrozenReport(report)}
                        title="Télécharger le PDF (données figées)"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeReport(report.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
              </div>
            )
          )}
        </>
      )}

      {/* Generate Report Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => {
          setShowGenerateModal(false);
          setSelectedStatement(null);
        }}
        title="Generer un rapport"
      >
        {selectedStatement && (
          <div className="space-y-4">
            <div className="p-3 bg-primary-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-primary-500" />
                <span className="font-medium">{getClient(selectedStatement.clientId)?.name}</span>
              </div>
              <div className="text-sm text-primary-600">
                {selectedStatement.bankName} • {formatDate(selectedStatement.periodStart)} - {formatDate(selectedStatement.periodEnd)}
              </div>
            </div>

            <Select
              label="Type de rapport"
              value={reportConfig.type}
              onChange={(e) => setReportConfig({ ...reportConfig, type: e.target.value as any })}
              options={[
                { value: 'audit', label: 'Rapport d\'audit complet' },
                { value: 'summary', label: 'Rapport synthetique' },
                { value: 'detailed', label: 'Rapport detaille' },
                { value: 'recovery', label: 'Rapport de recouvrement' },
              ]}
            />

            {claudeApi.isEnabled && (
              <label className="flex items-center gap-2 p-3 bg-primary-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={reportConfig.includeAI}
                  onChange={(e) => setReportConfig({ ...reportConfig, includeAI: e.target.checked })}
                  className="w-4 h-4"
                />
                <Brain className="w-4 h-4 text-primary-600" />
                <span className="text-sm text-primary-700">Inclure l'analyse IA</span>
              </label>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={() => setShowGenerateModal(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => handleGenerateReport(selectedStatement)}
                disabled={generating}
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Download className="w-4 h-4 mr-1" />
                )}
                Generer et telecharger
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Report Viewer Modal */}
      {showViewer && previewReport && (
        <ReportViewer
          report={previewReport}
          onClose={() => setShowViewer(false)}
        />
      )}
    </div>
  );
}
