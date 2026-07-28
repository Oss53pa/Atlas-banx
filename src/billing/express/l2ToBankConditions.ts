// ============================================================================
// ATLASBANX — Conversion du référentiel L2 (rubriques CDC) → BankConditions
// ============================================================================
// L2 (public-bank-reference) renvoie des conditions par rubrique CDC
// (rubric_code + value_numeric + dimensions). Les détecteurs consomment le
// modèle BankConditions. Ce mapper fait le pont, avec prise en compte du
// SEGMENT client (particulier / professionnel / entreprise) via les dimensions
// des rubriques (ex. tenue de compte différenciée par profil).
//
// - Rubriques de découvert → InterestRate (base des agios).
// - Rubriques compte.* → accountFees structuré (tenue, relevé, inactivité…).
// - Rubriques en pourcentage → FeeSchedule 'percentage' ; FCFA → 'fixed'.
// ============================================================================

import type { BankConditions, FeeSchedule, InterestRate, AccountFees } from '../../types';
import type { PublicRefCondition } from '../../services/publicBankReference';
import { rubricUnitOf } from '../../cdc/taxonomy/rubrics';

// Taxonomie CDC des profils (dimensions.profil).
export type ConditionSegment = 'particulier' | 'pme' | 'corporate';

export interface L2ToBankConditionsParams {
  bankCode: string;
  bankName?: string;
  country?: string;
  currency?: string;
  effectiveFrom?: string;
  conditions: readonly PublicRefCondition[];
  /** Segment client : filtre les conditions dimensionnées par profil. */
  segment?: ConditionSegment;
}

function profilOf(dimensions: unknown): string | undefined {
  if (dimensions && typeof dimensions === 'object' && 'profil' in dimensions) {
    const p = (dimensions as { profil?: unknown }).profil;
    return typeof p === 'string' ? p : undefined;
  }
  return undefined;
}

export function l2ToBankConditions(params: L2ToBankConditionsParams): BankConditions {
  const { segment } = params;

  // Valeur retenue par rubrique : on privilégie la ligne du segment demandé,
  // à défaut la ligne « catch-all » (sans profil). Les autres segments sont ignorés.
  const valueByCode = new Map<string, number>();
  for (const c of params.conditions) {
    if (c.value_numeric == null) continue;
    const profil = profilOf(c.dimensions);
    if (segment && profil && profil !== segment) continue; // autre segment → ignoré
    const isExact = segment != null && profil === segment;
    if (!valueByCode.has(c.rubric_code) || isExact) {
      valueByCode.set(c.rubric_code, c.value_numeric);
    }
  }

  const fees: FeeSchedule[] = [];
  const interestRates: InterestRate[] = [];
  const num = (code: string): number => valueByCode.get(code) ?? 0;

  for (const [code, value] of valueByCode) {
    if (code === 'decouverts.taux_autorise') {
      interestRates.push({ type: 'authorized', rate: value / 100, calculationMethod: 'simple', dayCountConvention: 'ACT/360' });
      continue;
    }
    if (code === 'decouverts.taux_non_autorise') {
      interestRates.push({ type: 'unauthorized', rate: value / 100, calculationMethod: 'simple', dayCountConvention: 'ACT/360' });
      continue;
    }
    // Unité déclarée dans la taxonomie (source de vérité) plutôt qu'une regex :
    // évite qu'une commission FIXE (FCFA) soit prise pour un pourcentage et
    // qu'un taux en % soit pris pour un montant fixe.
    if (rubricUnitOf(code) === 'percent') {
      fees.push({ code, name: code, amount: 0, type: 'percentage', percentage: value });
    } else {
      fees.push({ code, name: code, amount: value, type: 'fixed' });
    }
  }

  // Tenue de compte selon le segment (mensuelle prioritaire, sinon annuelle/12).
  const tenueValue = valueByCode.has('compte.tenue_mensuelle')
    ? num('compte.tenue_mensuelle')
    : Math.round(num('compte.tenue_annuelle') / 12);
  const seg: ConditionSegment = segment ?? 'particulier';

  // La structure BankConditions.tenueCompte parle en particulier/professionnel/
  // entreprise ; on projette la taxonomie CDC (particulier/pme/corporate) dessus.
  const accountFees: AccountFees = {
    tenueCompte: {
      particulier: seg === 'particulier' ? tenueValue : 0,
      professionnel: seg === 'pme' ? tenueValue : 0,
      entreprise: seg === 'corporate' ? tenueValue : 0,
    },
    fraisOuverture: num('compte.ouverture'),
    fraisCloture: num('compte.cloture'),
    fraisInactivite: num('compte.inactivite'),
    releveCompte: { mensuel: num('compte.releve_mensuel'), duplicata: num('compte.releve_duplicata') },
    attestationSolde: num('compte.attestation_solde'),
    lettreInjonction: num('compte.lettre_injonction'),
    droitTimbre: num('compte.droit_timbre'),
  };

  return {
    id: `l2-${params.bankCode}`,
    bankCode: params.bankCode,
    bankName: params.bankName ?? params.bankCode,
    country: params.country ?? '',
    currency: params.currency ?? 'XOF',
    effectiveDate: params.effectiveFrom ? new Date(params.effectiveFrom) : new Date(),
    fees,
    interestRates,
    isActive: true,
    accountFees,
  };
}
