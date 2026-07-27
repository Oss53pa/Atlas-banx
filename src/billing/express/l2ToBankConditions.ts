// ============================================================================
// ATLASBANX — Conversion du référentiel L2 (rubriques CDC) → BankConditions
// ============================================================================
// L2 (public-bank-reference) renvoie des conditions par rubrique CDC
// (rubric_code + value_numeric). Les détecteurs d'audit consomment le modèle
// BankConditions (fees[] + interestRates[]). Ce mapper fait le pont, pour que
// l'audit Particulier compare aussi au BARÈME OFFICIEL de la banque.
//
// - Rubriques de découvert → InterestRate (base des agios).
// - Rubriques en pourcentage → FeeSchedule 'percentage'.
// - Autres → FeeSchedule 'fixed' (montant FCFA).
// ============================================================================

import type { BankConditions, FeeSchedule, InterestRate } from '../../types';
import type { PublicRefCondition } from '../../services/publicBankReference';

// Rubriques dont l'unité est un pourcentage (inférée du code, l'endpoint ne
// renvoie pas l'unité). Couvre taux, CPFD, commissions de mouvement, etc.
const PERCENT_RE = /taux|cpfd|\.ira$|commission_mouvement$|paiement_etranger$|_commission$/;

export interface L2ToBankConditionsParams {
  bankCode: string;
  bankName?: string;
  country?: string;
  currency?: string;
  effectiveFrom?: string;
  conditions: readonly PublicRefCondition[];
}

export function l2ToBankConditions(params: L2ToBankConditionsParams): BankConditions {
  const fees: FeeSchedule[] = [];
  const interestRates: InterestRate[] = [];

  for (const c of params.conditions) {
    if (c.value_numeric == null) continue;
    const code = c.rubric_code;
    const value = c.value_numeric;

    // Découverts → taux d'intérêt (agios).
    if (code === 'decouverts.taux_autorise') {
      interestRates.push({ type: 'authorized', rate: value / 100, calculationMethod: 'simple', dayCountConvention: 'ACT/360' });
      continue;
    }
    if (code === 'decouverts.taux_non_autorise') {
      interestRates.push({ type: 'unauthorized', rate: value / 100, calculationMethod: 'simple', dayCountConvention: 'ACT/360' });
      continue;
    }

    if (PERCENT_RE.test(code)) {
      fees.push({ code, name: code, amount: 0, type: 'percentage', percentage: value });
    } else {
      fees.push({ code, name: code, amount: value, type: 'fixed' });
    }
  }

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
  };
}
