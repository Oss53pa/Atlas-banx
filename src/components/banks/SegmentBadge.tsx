// ============================================================================
// ATLASBANX — SegmentBadge
// ============================================================================
// Pastille visuelle du segment tarifaire d'une grille (Particuliers /
// Entreprises / Associations). Rend explicite, partout dans l'interface,
// À QUI s'appliquent des conditions — sans quoi une grille « particulier » et
// une grille « entreprise » sont indiscernables (même banque, mêmes rubriques).
// `segment` absent = grille catch-all applicable à tous les segments.
// ============================================================================

import { Users, Building2, HeartHandshake, Layers } from 'lucide-react';
import type { TariffSegment } from '../../types';
import { TARIFF_SEGMENT_LABEL } from '../../types';

interface SegmentStyle {
  label: string;
  short: string;
  classes: string;
  Icon: typeof Users;
}

const SEGMENT_STYLES: Record<TariffSegment, SegmentStyle> = {
  particuliers: {
    label: TARIFF_SEGMENT_LABEL.particuliers,
    short: 'Particuliers',
    classes: 'bg-blue-50 text-blue-700 border-blue-200',
    Icon: Users,
  },
  entreprises: {
    label: TARIFF_SEGMENT_LABEL.entreprises,
    short: 'Entreprises',
    classes: 'bg-violet-50 text-violet-700 border-violet-200',
    Icon: Building2,
  },
  associations: {
    label: TARIFF_SEGMENT_LABEL.associations,
    short: 'Associations',
    classes: 'bg-teal-50 text-teal-700 border-teal-200',
    Icon: HeartHandshake,
  },
};

const CATCH_ALL_STYLE: SegmentStyle = {
  label: 'Tous segments',
  short: 'Tous segments',
  classes: 'bg-primary-50 text-primary-500 border-primary-200',
  Icon: Layers,
};

function segmentStyle(segment?: TariffSegment | null): SegmentStyle {
  return (segment && SEGMENT_STYLES[segment]) || CATCH_ALL_STYLE;
}

interface SegmentBadgeProps {
  segment?: TariffSegment | null;
  /** Libellé compact (chip) plutôt que complet. */
  short?: boolean;
  className?: string;
}

export function SegmentBadge({ segment, short, className = '' }: SegmentBadgeProps) {
  const style = segmentStyle(segment);
  const Icon = style.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none ${style.classes} ${className}`}
      title={`Barème : ${style.label}`}
    >
      <Icon className="h-3 w-3" />
      {short ? style.short : style.label}
    </span>
  );
}
