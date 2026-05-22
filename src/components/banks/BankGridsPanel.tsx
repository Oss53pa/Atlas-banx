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
import type { Bank, ConditionGrid, MonetaryZone } from '../../types';
import { GridSummaryCard } from './GridSummaryCard';

interface BankGridsPanelProps {
  bank: Bank;
  grids: ConditionGrid[];
  zone: MonetaryZone | null;
  onUploadPdf: () => void;
  onEditGrid: (grid: ConditionGrid | null) => void;
  onViewSource: (grid: ConditionGrid) => void;
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
}: BankGridsPanelProps) {
  const currency: 'XAF' | 'XOF' = zone === 'UEMOA' ? 'XOF' : 'XAF';

  // On garde uniquement les grilles non-draft (les drafts sont des
  // brouillons en cours d'extraction, pas pertinent pour la consultation).
  const visibleGrids = useMemo(
    () => grids.filter((g) => g.status !== 'draft'),
    [grids],
  );

  // Tri : actives d'abord, puis archivées ; à statut égal, dernière effectiveDate en premier
  const sortedGrids = useMemo(() => {
    const statusOrder = { active: 0, archived: 1, draft: 2 } as const;
    return [...visibleGrids].sort((a, b) => {
      const so = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
      if (so !== 0) return so;
      return new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime();
    });
  }, [visibleGrids]);

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

  if (sortedGrids.length === 0) {
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
      {/* Chips switcher */}
      <div className="rounded-lg border border-primary-200 bg-white px-3 py-2.5">
        <div className="flex items-baseline justify-between mb-2">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-semibold text-primary-900">
              Grilles tarifaires
            </h3>
            <span className="text-[11px] text-primary-500">
              {activeCount} active{activeCount > 1 ? 's' : ''}
              {sortedGrids.length > activeCount && ` · ${sortedGrids.length - activeCount} archivée${sortedGrids.length - activeCount > 1 ? 's' : ''}`}
            </span>
          </div>
          {activeCount > 1 && (
            <span
              className="inline-flex items-center gap-1 text-[10px] text-amber-700"
              title="L'audit applique la grille couvrant la date de chaque transaction"
            >
              <AlertCircle className="w-3 h-3" />
              Multi-période
            </span>
          )}
        </div>
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
                {isActive ? null : (
                  <History className="w-3 h-3 opacity-60" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Détail de la grille sélectionnée */}
      {selectedGrid && (
        <GridSummaryCard
          grid={selectedGrid}
          currency={currency}
          onEdit={() => onEditGrid(selectedGrid)}
          onViewSource={() => onViewSource(selectedGrid)}
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
