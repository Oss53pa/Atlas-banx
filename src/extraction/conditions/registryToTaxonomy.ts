// ============================================================================
// ATLASBANX — Pont clé de registre (FIELD_DEFINITIONS) → code taxonomie CDC
// ============================================================================
// Deux espaces de rubriques coexistent :
//   • extraction / vérification → clés FIELD_DEFINITIONS ("accountFees.
//     tenueCompte.particulier", clés `custom:…`)
//   • référentiel L2 + audits    → codes taxonomie CDC ("compte.tenue_mensuelle")
//
// La publication L2 (submitValidatedReference) stocke un `rubric_code` que le
// lecteur d'audit (l2ToBankConditions) interprète en TAXONOMIE. Sans conversion,
// les conditions publiées ne se rattachent pas aux postes structurés (tenue de
// compte, découvert…) ni à la bonne unité (% vs FCFA, via rubricUnitOf(code)).
//
// Ce module convertit une clé de rubrique en code taxonomie. Le mapping est
// EXACT pour les postes que l'audit structure (compte.* et decouverts.*) et
// pour les correspondances 1:1 évidentes ; sinon on renvoie la clé telle quelle
// (elle devient une ligne de frais générique — comportement inchangé).
// ============================================================================

import { isCustomRubricKey, parseCustomRubricKey } from './RubricClassifier';

/** Correspondances registre → taxonomie CDC (codes vérifiés existants). */
export const REGISTRY_TO_TAXONOMY: Record<string, string> = {
  // ── Compte (structuré par l'audit) ──────────────────────────────────────
  'accountFees.tenueCompte.particulier': 'compte.tenue_mensuelle',
  'accountFees.tenueCompte.professionnel': 'compte.tenue_pro',
  'accountFees.tenueCompte.entreprise': 'compte.tenue_corporate',
  'accountFees.fraisOuverture': 'compte.ouverture',
  'accountFees.fraisOuvertureEntreprise': 'compte.frais_dossier_ouverture',
  'accountFees.fraisCloture': 'compte.cloture',
  'accountFees.fraisInactivite': 'compte.inactivite',
  'accountFees.releveCompte.mensuel': 'compte.releve_mensuel',
  'accountFees.releveCompte.duplicata': 'compte.releve_duplicata',
  'accountFees.attestationSolde': 'compte.attestation_solde',
  'accountFees.certificatNonEngagement': 'compte.attestation_bancaire',
  'accountFees.lettreInjonction': 'compte.lettre_injonction',
  'accountFees.rib': 'compte.rib',
  'miscFees.droitTimbre': 'compte.droit_timbre',
  'miscFees.procurationCompte': 'compte.procuration',

  // ── Découverts & agios (structuré + unité % critique) ───────────────────
  'creditFees.tauxDecouvertAutorise': 'decouverts.taux_autorise',
  'creditFees.tauxDecouvertNonAutorise': 'decouverts.taux_non_autorise',
  'creditFees.commissionMouvement': 'decouverts.commission_mouvement',
  'creditFees.commissionPlusForteDecouverte': 'decouverts.cpfd',
  'creditFees.tauxUsureLegal': 'decouverts.taux_usure_applicable',

  // ── Crédits ─────────────────────────────────────────────────────────────
  'creditFees.fraisDossierCredit': 'credits.frais_dossier_conso',
  'creditFees.creditConsoTauxMin': 'credits.taux_conso',
  'creditFees.creditImmoTauxMin': 'credits.taux_immo',

  // ── Cartes (correspondances 1:1) ────────────────────────────────────────
  'cardFees.visaClassic': 'cartes.cotisation_debit',
  'cardFees.visaGold': 'cartes.cotisation_premium',
  'cardFees.opposition': 'cartes.opposition',
  'cardFees.retraitDabAutreBanque': 'cartes.retrait_dab_autre',
  'cardFees.retraitDabPropre': 'cartes.retrait_dab_national',
  'cardFees.retraitDabInternational': 'cartes.retrait_dab_international',
  'cardFees.paiementTpePropre': 'cartes.paiement_tpe_national',
  'cardFees.paiementTpeInternational': 'cartes.paiement_etranger',
  'cardFees.consultationSolde': 'cartes.consultation_solde',
  'cardFees.renouvellementAnticipe': 'cartes.renouvellement_anticipe',

  // ── Virements ───────────────────────────────────────────────────────────
  'transferFees.virementInterne.commission': 'virements.intra_banque_commission',
  'transferFees.virementNationalAutreBanque': 'virements.inter_banques',
  'transferFees.virementCemacUemoa.commission': 'virements.zone_uemoa',
  'transferFees.virementInternational.commission': 'virements.swift_commission',
  'transferFees.virementInternational.swift': 'virements.swift_international',
  'transferFees.virementInstantane': 'virements.instantane',
  'transferFees.virementPermanent': 'virements.permanent',
  'transferFees.rejetVirement': 'virements.rejet',

  // ── Chèques ─────────────────────────────────────────────────────────────
  'checkFees.chequierEmission': 'cheques.carnet_25',
  'checkFees.oppositionCheque': 'cheques.opposition',
  'checkFees.chequeSansProvision': 'cheques.rejet_emis',
  'checkFees.chequeCertifie': 'cheques.certification',
  'checkFees.chequeBanque': 'cheques.cheque_guichet',
  'checkFees.encaissementPlace': 'cheques.remise_sur_place',
  'checkFees.encaissementEtranger': 'cheques.remise_hors_place',

  // ── E-banking ───────────────────────────────────────────────────────────
  'eBankingFees.abonnementMensuel': 'ebanking.abonnement_mobile',
  'eBankingFees.smsAlerte': 'ebanking.sms_alerte',
  'eBankingFees.virementEnLigne': 'ebanking.virement_en_ligne',

  // ── Espèces / opérations spéciales ──────────────────────────────────────
  'cashOperations.versementEspeces': 'operations_speciales.versement_especes',
  'cashOperations.retraitEspeces': 'operations_speciales.retrait_especes',
  'cashOperations.achatDevises': 'operations_speciales.change_manuel_achat',
  'cashOperations.venteDevises': 'operations_speciales.change_manuel_vente',

  // ── Divers ──────────────────────────────────────────────────────────────
  'miscFees.coffrePetit': 'incidents.coffre_petit',
  'miscFees.garantieBancaire': 'operations_speciales.garantie_internationale',
  'miscFees.assuranceCompte': 'incidents.assurance_compte',
};

/**
 * Convertit une clé de rubrique (registre ou `custom:…`) en code taxonomie CDC.
 * - clé de registre mappée → code taxonomie exact ;
 * - clé `custom:cat:slug`  → `cat.slug` (ligne de frais générique) ;
 * - sinon                  → la clé telle quelle (passthrough).
 */
export function toTaxonomyCode(rubricKey: string): string {
  const mapped = REGISTRY_TO_TAXONOMY[rubricKey];
  if (mapped) return mapped;
  if (isCustomRubricKey(rubricKey)) {
    const parsed = parseCustomRubricKey(rubricKey);
    if (parsed) return `${parsed.category}.${parsed.slug.replace(/-/g, '_')}`;
  }
  return rubricKey;
}
