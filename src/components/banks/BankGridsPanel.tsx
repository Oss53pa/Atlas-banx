// ============================================================================
// ATLASBANX — BankGridsPanel
// ============================================================================
// Panneau de visualisation des grilles tarifaires d'une banque dans la page
// Banques. Remplace l'ancien « Active Grid Viewer » qui ne montrait qu'une
// seule grille (celle pointée par activeGridId) — incompatible avec notre
// nouveau modèle multi-grille où une banque peut avoir plusieurs grilles
// actives couvrant chacune une période différente.
//
// UX :
//   - Une bande de chips en haut, une par grille non-draft
//   - La chip sélectionnée affiche un GridSummaryCard détaillé
//   - Boutons « Éditer » (ouvre la modale scopée sur le doc source) et
//     « Voir source » (idem mais sur l'onglet Documents)
// ============================================================================

import { useState, useMemo, useEffect } from 'react';
import { Calendar, AlertCircle, FileText, Upload, History } from 'lucide-react';
import { Button } from '../ui';
import type { Bank, ConditionGrid, MonetaryZone, TariffSegment } from '../../types';
import { TARIFF_SEGMENT_LABEL } from '../../types';
import { GridSummaryCard } from './GridSummaryCard';
import { GridDuplicatesBanner } from './GridDuplicatesBanner';
import { SegmentBadge } from './SegmentBadge';

// Filtre par segment : « all » = tous, « none » = grilles sans segment (catch-all).
type SegmentFilter = 'all' | TariffSegment | 'none';

interface BankGridsPanelProps {
  bank: Bank;
  grids: ConditionGrid[];
  zone: MonetaryZone | null;
  onUploadPdf: () => void;
  onEditGrid: (grid: ConditionGrid | null) => void;
  onViewSource: (grid: ConditionGrid) => void;
  onDeleteGrid: (grid: ConditionGrid) => void;
  onChangeSegment: (grid: ConditionGrid, segment: TariffSegment | null) => void;
  /** Segment pré-sélectionné dans le filtre (contexte d'import admin scopé). */
  initialSegment?: TariffSegment;
}

function fmtPeriod(grid: ConditionGrid): string {
  const fmt = (d: Date | string) =>
    new Date(d).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  const from = fmt(grid.effectiveDate);
  const to = grid.expirationDate ? fmt(grid.expirationDate) : '∞';
  return `${from} → ${to}`;
}

export function BankGridsPanel({
  bank,
  grids,
  zone,
  onUploadPdf,
  onEditGrid,
  onViewSource,
  onDeleteGrid,
  onChangeSegment,
  initialSegment,
}: BankGridsPanelProps) {
  const currency: 'XAF' | 'XOF' = zone === 'UEMOA' ? 'XOF' : 'XAF';

  // On garde uniquement les grilles non-draft (les drafts sont des
  // brouillons en cours d'extraction, pas pertinent pour la consultation).
  const visibleGrids = useMemo(
    () => grids.filter((g) => g.status !== 'draft'),
    [grids],
  );

  // Tri : actives d'abord, puis archivées ; à statut égal, dernière effectiveDate en premier
  const allSortedGrids = useMemo(() => {
    const statusOrder = { active: 0, archived: 1, draft: 2 } as const;
    return [...visibleGrids].sort((a, b) => {
      const so = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
      if (so !== 0) return so;
      return new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime();
    });
  }, [visibleGrids]);

  // Filtre par segment (Particuliers / Entreprises / …) — permet de distinguer
  // clairement à qui s'appliquent les grilles d'une même banque.
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>(initialSegment ?? 'all');

  // Segments réellement présents dans les grilles de cette banque, pour ne
  // proposer que des filtres utiles (+ « Tous »).
  const presentSegments = useMemo(() => {
    const set = new Set<SegmentFilter>();
    let hasNone = false;
    for (const g of allSortedGrids) {
      if (g.segment) set.add(g.segment);
      else hasNone = true;
    }
    const ordered: SegmentFilter[] = (['particuliers', 'entreprises', 'associations'] as TariffSegment[])
      .filter((s) => set.has(s));
    if (hasNone) ordered.push('none');
    return ordered;
  }, [allSortedGrids]);

  const sortedGrids = useMemo(() => {
    if (segmentFilter === 'all') return allSortedGrids;
    if (segmentFilter === 'none') return allSortedGrids.filter((g) => !g.segment);
    return allSortedGrids.filter((g) => g.segment === segmentFilter);
  }, [allSortedGrids, segmentFilter]);

  const [selectedGridId, setSelectedGridId] = useState<string | null>(
    () => sortedGrids[0]?.id ?? null,
  );

  // Resync quand la liste change (ex: nouvelle grille importée).
  useEffect(() => {
    if (!selectedGridId || !sortedGrids.some((g) => g.id === selectedGridId)) {
      setSelectedGridId(sortedGrids[0]?.id ?? null);
    }
  }, [sortedGrids, selectedGridId]);

  const selectedGrid = sortedGrids.find((g) => g.id === selectedGridId) ?? null;
  const activeCount = sortedGrids.filter((g) => g.status === 'active').length;

  if (allSortedGrids.length === 0) {
    return (
      <div className="rounded-lg border border-primary-200 bg-white p-6 text-center">
        <FileText className="w-10 h-10 text-primary-300 mx-auto mb-2" />
        <h3 className="text-sm font-medium text-primary-900 mb-1">Aucune grille tarifaire</h3>
        <p className="text-xs text-primary-500 mb-3">
          Importez un PDF de conditions ou saisissez les valeurs manuellement
          pour que l'audit puisse appliquer les bons tarifs.
        </p>
        <div className="flex justify-center gap-2">
          <Button size="sm" className="h-7 text-xs" onClick={onUploadPdf}>
            <Upload className="w-3 h-3 mr-1" />
            Importer PDF
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs"
            onClick={() => onEditGrid(null)}
          >
            Saisie manuelle
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Doublons éventuels — même période + même segment */}
      <GridDuplicatesBanner grids={sortedGrids} onDeleteGrid={onDeleteGrid} />

      {/* Chips switcher */}
      <div className="rounded-lg border border-primary-200 bg-white px-3 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-semibold text-primary-900">
              Grilles tarifaires
            </h3>
            <span className="text-[11px] text-primary-500">
              {activeCount} active{activeCount > 1 ? 's' : ''}
              {sortedGrids.length > activeCount && ` · ${sortedGrids.length - activeCount} archivée${sortedGrids.length - activeCount > 1 ? 's' : ''}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {activeCount > 1 && (
              <span
                className="inline-flex items-center gap-1 text-[10px] text-amber-700"
                title="L'audit applique la grille couvrant la date de chaque transaction"
              >
                <AlertCircle className="w-3 h-3" />
                Multi-période
              </span>
            )}
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs"
              onClick={onUploadPdf}
              title="Importer un ou plusieurs PDF de conditions (périodes/années précédentes incluses)"
            >
              <Upload className="w-3 h-3 mr-1" />
              Importer une période
            </Button>
          </div>
        </div>
        {/* Filtre par segment — distinguer Particuliers / Entreprises / … */}
        {presentSegments.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-primary-400">Barème :</span>
            <button
              type="button"
              onClick={() => setSegmentFilter('all')}
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                segmentFilter === 'all'
                  ? 'border-primary-900 bg-primary-900 text-white'
                  : 'border-primary-200 bg-white text-primary-500 hover:bg-primary-50'
              }`}
            >
              Tous ({allSortedGrids.length})
            </button>
            {presentSegments.map((seg) => {
              const count = seg === 'none'
                ? allSortedGrids.filter((g) => !g.segment).length
                : allSortedGrids.filter((g) => g.segment === seg).length;
              const label = seg === 'none' ? 'Tous segments' : TARIFF_SEGMENT_LABEL[seg];
              return (
                <button
                  key={seg}
                  type="button"
                  onClick={() => setSegmentFilter(seg)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                    segmentFilter === seg
                      ? 'border-primary-900 bg-primary-900 text-white'
                      : 'border-primary-200 bg-white text-primary-600 hover:bg-primary-50'
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {sortedGrids.map((grid) => {
            const isSelected = grid.id === selectedGridId;
            const isActive = grid.status === 'active';
            return (
              <button
                key={grid.id}
                type="button"
                onClick={() => setSelectedGridId(grid.id)}
                className={[
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
                  isSelected
                    ? 'bg-primary-900 text-white border-primary-900'
                    : isActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-primary-50 text-primary-600 border-primary-200 hover:bg-primary-100',
                ].join(' ')}
                title={`${grid.name} — ${grid.status}`}
              >
                <Calendar className="w-3 h-3" />
                <span>{fmtPeriod(grid)}</span>
                <SegmentBadge
                  segment={grid.segment}
                  short
                  className={isSelected ? 'border-white/30 bg-white/15 text-white' : ''}
                />
                {isActive ? null : (
                  <History className="w-3 h-3 opacity-60" />
                )}
              </button>
            );
          })}
          {sortedGrids.length === 0 && (
            <p className="px-1 py-1 text-[11px] text-primary-400">
              Aucune grille pour ce segment.
            </p>
          )}
        </div>
      </div>

      {/* Détail de la grille sélectionnée */}
      {selectedGrid && (
        <GridSummaryCard
          grid={selectedGrid}
          currency={currency}
          onEdit={() => onEditGrid(selectedGrid)}
          onViewSource={() => onViewSource(selectedGrid)}
          onChangeSegment={(segment) => onChangeSegment(selectedGrid, segment)}
        />
      )}

      {/* Hint quand il y a plus d'une grille active — pédagogie */}
      {activeCount > 1 && selectedGrid && (
        <p className="text-[11px] text-primary-500 italic px-1">
          {bank.name} a {activeCount} grilles tarifaires actives couvrant des
          périodes distinctes. L'audit choisit automatiquement la grille en
          vigueur à la date de chaque transaction.
        </p>
      )}
    </div>
  );
}
