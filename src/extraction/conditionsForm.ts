// ============================================================================
// ATLASBANX — BankConditions form helpers
// ============================================================================
// FullBankConditions est la version « riche » du modèle BankConditions que la
// modale d'édition utilise dans son formulaire. Elle est plus structurée que
// la forme legacy (`fees: FeeSchedule[]`, `interestRates: InterestRate[]`) :
// chaque rubrique est un objet typé (tenueCompte, virements, …).
//
// Ce module exporte :
//   - L'interface FullBankConditions et la fabrique getEmptyFullConditions()
//   - Le mapping REGISTRY_TO_FORM_PATH qui convertit les clés FieldRegistry
//     (ex. `accountFees.tenueCompte.particulier`) vers les chemins du
//     formulaire (ex. `tenueCompte.particulierLocal`)
//   - applyExtractedValuesToConditions() qui projette les `extractedValues`
//     d'un ArchivedDocument sur un FullBankConditions et renvoie le résultat
//
// La modale ET la page Banques l'utilisent — la modale pour visualiser, la
// page Banques pour synthétiser une ConditionGrid par document actif lors
// de la sauvegarde (architecture bi-temporelle requise par le resolver).
// ============================================================================

import type { ArchivedDocument } from '../types';
import { setByPath } from './normalize';

// Frais personnalisés saisis manuellement dans le formulaire (hors PDF extrait).
export interface CustomFee {
  id: string;
  label: string;
  amount: number;
  type: 'fixed' | 'percent';
  frequency: 'once' | 'monthly' | 'yearly' | 'per_operation';
  category: string;
}

// ────────────────────────────────────────────────────────────────────────────
// FullBankConditions — la forme « riche » du formulaire d'édition
// ────────────────────────────────────────────────────────────────────────────

export interface FullBankConditions {
  tenueCompte: {
    particulierLocal: number;
    particulierEtranger: number;
    professionnel: number;
    entreprise: number;
    association: number;
    compteEpargne: number;
    compteDevises: number;
  };
  ouvertureCompte: {
    particulier: number;
    entreprise: number;
    minimumDepot: number;
  };
  clotureCompte: {
    particulier: number;
    entreprise: number;
  };
  releves: {
    mensuelPapier: number;
    mensuelEmail: number;
    duplicata: number;
    releveAnnuel: number;
    attestationSolde: number;
    certificatNonEngagement: number;
    rib: number;
  };
  guichet: {
    versementEspeces: number;
    versementEspecesCommission: number;
    retraitEspeces: number;
    retraitEspecesCommission: number;
    changeManuel: number;
    achatDevises: number;
    venteDevises: number;
  };
  cartes: Array<{
    id: string;
    nom: string;
    type: 'debit' | 'credit' | 'prepaid';
    reseau: 'VISA' | 'MASTERCARD' | 'GIMAC' | 'GIM-UEMOA' | 'AUTRE';
    cotisationAnnuelle: number;
    fraisEmission: number;
    plafondRetraitJour: number;
    plafondPaiementJour: number;
    plafondRetraitMois: number;
    plafondPaiementMois: number;
    validiteAnnees: number;
  }>;
  fraisCartes: {
    retraitDabPropre: number;
    retraitDabAutre: number;
    retraitDabInternational: number;
    paiementTpePropre: number;
    paiementTpeAutre: number;
    paiementTpeInternational: number;
    paiementInternet: number;
    oppositionCarte: number;
    renouvellementAnticipe: number;
    codeOublie: number;
    carteCaptee: number;
    consultationSolde: number;
  };
  virements: {
    interneGratuit: boolean;
    interneFrais: number;
    nationalMemeBank: number;
    nationalAutreBank: number;
    nationalAutreBankCommission: number;
    zoneMonetaire: number;
    zoneMonetaireCommission: number;
    international: number;
    internationalCommission: number;
    swift: number;
    instantane: number;
    permanent: number;
    rejetVirement: number;
    recuVirement: number;
  };
  cheques: {
    carnet25: number;
    carnet50: number;
    carnet100: number;
    chequeGuichet: number;
    chequeCertifie: number;
    chequeBanque: number;
    oppositionCheque: number;
    chequeImpaye: number;
    chequeRetourne: number;
    encaissementPlace: number;
    encaissementDeplacement: number;
    encaissementEtranger: number;
    encaissementEtrangerCommission: number;
  };
  credits: {
    decouvertAutorise: number;
    decouvertNonAutorise: number;
    commissionMouvement: number;
    commissionPlusForte: number;
    tauxUsure: number;
    fraisDossierCredit: number;
    creditConsommationMin: number;
    creditConsommationMax: number;
    creditImmobilierMin: number;
    creditImmobilierMax: number;
    creditPME: number;
    penaliteRetard: number;
  };
  ebanking: {
    abonnementMensuel: number;
    abonnementAnnuel: number;
    parOperation: number;
    virementEnLigne: number;
    consultationGratuite: boolean;
    smsAlerte: number;
    smsAlerteAbonnement: number;
    mobileBanking: number;
    ussd: number;
  };
  divers: {
    coffrePetit: number;
    coffreMoyen: number;
    coffreGrand: number;
    assuranceCompte: number;
    garantieBancaire: number;
    garantieLocative: number;
    cautionMarche: number;
    lettreInjonction: number;
    saisieAttribution: number;
    mainLevee: number;
    procuration: number;
    successionFrais: number;
    successionCommission: number;
    avoirInactif: number;
    fraisInactivite: number;
    droitTimbre: number;
    tvaServices: number;
  };
  customFees: CustomFee[];
  documents: ArchivedDocument[];
}

// ────────────────────────────────────────────────────────────────────────────
// Squelette vide — TOUS LES FRAIS À 0
// ────────────────────────────────────────────────────────────────────────────
// Aucune valeur n'est pré-remplie : les conditions bancaires PROVIENNENT soit
// d'un import (PDF tarification) soit d'une saisie manuelle. Tout chiffre
// hardcodé serait potentiellement faux et trompeur pour l'auditeur.

export function getEmptyFullConditions(): FullBankConditions {
  return {
    tenueCompte: {
      particulierLocal: 0,
      particulierEtranger: 0,
      professionnel: 0,
      entreprise: 0,
      association: 0,
      compteEpargne: 0,
      compteDevises: 0,
    },
    ouvertureCompte: {
      particulier: 0,
      entreprise: 0,
      minimumDepot: 0,
    },
    clotureCompte: {
      particulier: 0,
      entreprise: 0,
    },
    releves: {
      mensuelPapier: 0,
      mensuelEmail: 0,
      duplicata: 0,
      releveAnnuel: 0,
      attestationSolde: 0,
      certificatNonEngagement: 0,
      rib: 0,
    },
    guichet: {
      versementEspeces: 0,
      versementEspecesCommission: 0,
      retraitEspeces: 0,
      retraitEspecesCommission: 0,
      changeManuel: 0,
      achatDevises: 0,
      venteDevises: 0,
    },
    cartes: [],
    fraisCartes: {
      retraitDabPropre: 0,
      retraitDabAutre: 0,
      retraitDabInternational: 0,
      paiementTpePropre: 0,
      paiementTpeAutre: 0,
      paiementTpeInternational: 0,
      paiementInternet: 0,
      oppositionCarte: 0,
      renouvellementAnticipe: 0,
      codeOublie: 0,
      carteCaptee: 0,
      consultationSolde: 0,
    },
    virements: {
      interneGratuit: false,
      interneFrais: 0,
      nationalMemeBank: 0,
      nationalAutreBank: 0,
      nationalAutreBankCommission: 0,
      zoneMonetaire: 0,
      zoneMonetaireCommission: 0,
      international: 0,
      internationalCommission: 0,
      swift: 0,
      instantane: 0,
      permanent: 0,
      rejetVirement: 0,
      recuVirement: 0,
    },
    cheques: {
      carnet25: 0,
      carnet50: 0,
      carnet100: 0,
      chequeGuichet: 0,
      chequeCertifie: 0,
      chequeBanque: 0,
      oppositionCheque: 0,
      chequeImpaye: 0,
      chequeRetourne: 0,
      encaissementPlace: 0,
      encaissementDeplacement: 0,
      encaissementEtranger: 0,
      encaissementEtrangerCommission: 0,
    },
    credits: {
      decouvertAutorise: 0,
      decouvertNonAutorise: 0,
      commissionMouvement: 0,
      commissionPlusForte: 0,
      tauxUsure: 0,
      fraisDossierCredit: 0,
      creditConsommationMin: 0,
      creditConsommationMax: 0,
      creditImmobilierMin: 0,
      creditImmobilierMax: 0,
      creditPME: 0,
      penaliteRetard: 0,
    },
    ebanking: {
      abonnementMensuel: 0,
      abonnementAnnuel: 0,
      parOperation: 0,
      virementEnLigne: 0,
      consultationGratuite: false,
      smsAlerte: 0,
      smsAlerteAbonnement: 0,
      mobileBanking: 0,
      ussd: 0,
    },
    divers: {
      coffrePetit: 0,
      coffreMoyen: 0,
      coffreGrand: 0,
      assuranceCompte: 0,
      garantieBancaire: 0,
      garantieLocative: 0,
      cautionMarche: 0,
      lettreInjonction: 0,
      saisieAttribution: 0,
      mainLevee: 0,
      procuration: 0,
      successionFrais: 0,
      successionCommission: 0,
      avoirInactif: 0,
      fraisInactivite: 0,
      droitTimbre: 0,
      tvaServices: 0,
    },
    customFees: [],
    documents: [],
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Patchers — pour les cibles qui ne sont pas de simples dot-paths
// ────────────────────────────────────────────────────────────────────────────

export type ConditionsPatcher = (
  conditions: FullBankConditions,
  value: number | string | boolean,
) => void;

/**
 * Upsert une carte par réseau+nom dans le tableau cartes[]. Met à jour
 * `cotisationAnnuelle` si l'entrée existe, sinon crée une nouvelle carte
 * avec des plafonds à 0 (à l'utilisateur de les remplir).
 */
function upsertCardCotisation(
  reseau: FullBankConditions['cartes'][number]['reseau'],
  nomKeyword: string,
  defaultNom: string,
): ConditionsPatcher {
  return (conditions, value) => {
    const cotisation = Number(value);
    if (!Number.isFinite(cotisation)) return;
    const kw = nomKeyword.toLowerCase();
    const existing = conditions.cartes.find(
      (c) => c.reseau === reseau && c.nom.toLowerCase().includes(kw),
    );
    if (existing) {
      existing.cotisationAnnuelle = cotisation;
    } else {
      conditions.cartes.push({
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        nom: defaultNom,
        type: 'debit',
        reseau,
        cotisationAnnuelle: cotisation,
        fraisEmission: 0,
        plafondRetraitJour: 0,
        plafondPaiementJour: 0,
        plafondRetraitMois: 0,
        plafondPaiementMois: 0,
        validiteAnnees: 2,
      });
    }
  };
}

// ────────────────────────────────────────────────────────────────────────────
// REGISTRY_TO_FORM_PATH — translate FieldRegistry keys → form-state paths
// ────────────────────────────────────────────────────────────────────────────
// Une entrée peut être :
//   - un dot-path string  → utilisé directement par setByPath()
//   - un Patcher function → appelé avec (conditions, value) pour muter en place
//
// La forme Patcher est requise pour les cibles tableau-par-critère
// (ex. cartes[reseau='VISA' && nom contains 'Gold'].cotisationAnnuelle) que
// setByPath ne sait pas naviguer.
//
// Toute clé FieldRegistry non listée tombe en passe-à-travers — comportement
// désiré pour les clés qui matchent déjà le formulaire (ex. cheques.*).

export const REGISTRY_TO_FORM_PATH: Record<string, string | ConditionsPatcher> = {
  'accountFees.tenueCompte.particulier':     'tenueCompte.particulierLocal',
  'accountFees.tenueCompte.professionnel':   'tenueCompte.professionnel',
  'accountFees.tenueCompte.entreprise':      'tenueCompte.entreprise',
  'accountFees.fraisOuverture':              'ouvertureCompte.particulier',
  'accountFees.fraisCloture':                'clotureCompte.particulier',
  'accountFees.fraisInactivite':             'divers.fraisInactivite',
  'accountFees.releveCompte.mensuel':        'releves.mensuelPapier',
  'accountFees.releveCompte.duplicata':      'releves.duplicata',
  'accountFees.attestationSolde':            'releves.attestationSolde',
  'accountFees.lettreInjonction':            'divers.lettreInjonction',
  'creditFees.tauxDecouvertAutorise':        'credits.decouvertAutorise',
  'creditFees.tauxDecouvertNonAutorise':     'credits.decouvertNonAutorise',
  'creditFees.commissionMouvement':          'credits.commissionMouvement',
  'creditFees.commissionPlusForteDecouverte':'credits.commissionPlusForte',
  'creditFees.tauxUsureLegal':               'credits.tauxUsure',
  'creditFees.fraisDossierCredit':           'credits.fraisDossierCredit',
  'creditFees.creditConsoTauxMin':           'credits.creditConsommationMin',
  'creditFees.creditConsoTauxMax':           'credits.creditConsommationMax',
  'creditFees.creditImmoTauxMin':            'credits.creditImmobilierMin',
  'creditFees.creditImmoTauxMax':            'credits.creditImmobilierMax',
  'cardFees.opposition':                     'fraisCartes.oppositionCarte',
  'cardFees.retraitDabAutreBanque':          'fraisCartes.retraitDabAutre',
  'transferFees.virementInterne.commission':       'virements.interneFrais',
  'transferFees.virementCemacUemoa.commission':    'virements.zoneMonetaireCommission',
  'transferFees.virementInternational.commission': 'virements.internationalCommission',
  'transferFees.virementInternational.swift':      'virements.swift',
  'checkFees.chequierEmission':              'cheques.carnet25',
  'checkFees.oppositionCheque':              'cheques.oppositionCheque',
  'checkFees.chequeSansProvision':           'cheques.chequeImpaye',
  'eBankingFees.abonnementMensuel':          'ebanking.abonnementMensuel',
  'eBankingFees.smsAlerte':                  'ebanking.smsAlerte',
  'eBankingFees.virementEnLigne':            'ebanking.virementEnLigne',
  'eBankingFees.mobileBanking':              'ebanking.mobileBanking',
  'eBankingFees.ussd':                       'ebanking.ussd',
  'cashOperations.versementEspeces':           'guichet.versementEspeces',
  'cashOperations.versementEspecesCommission': 'guichet.versementEspecesCommission',
  'cashOperations.retraitEspeces':             'guichet.retraitEspeces',
  'cashOperations.retraitEspecesCommission':   'guichet.retraitEspecesCommission',
  'cashOperations.changeManuel':               'guichet.changeManuel',
  'cashOperations.achatDevises':               'guichet.achatDevises',
  'cashOperations.venteDevises':               'guichet.venteDevises',
  'cardFees.retraitDabPropre':              'fraisCartes.retraitDabPropre',
  'cardFees.retraitDabInternational':       'fraisCartes.retraitDabInternational',
  'cardFees.paiementTpePropre':             'fraisCartes.paiementTpePropre',
  'cardFees.paiementTpeInternational':      'fraisCartes.paiementTpeInternational',
  'cardFees.paiementInternet':              'fraisCartes.paiementInternet',
  'cardFees.codeOublie':                    'fraisCartes.codeOublie',
  'cardFees.consultationSolde':             'fraisCartes.consultationSolde',
  'transferFees.virementNationalAutreBanque': 'virements.nationalAutreBank',
  'transferFees.virementInstantane':          'virements.instantane',
  'transferFees.virementPermanent':           'virements.permanent',
  'transferFees.rejetVirement':               'virements.rejetVirement',
  'checkFees.chequeCertifie':       'cheques.chequeCertifie',
  'checkFees.chequeBanque':         'cheques.chequeBanque',
  'checkFees.encaissementPlace':    'cheques.encaissementPlace',
  'checkFees.encaissementEtranger': 'cheques.encaissementEtranger',
  'miscFees.coffrePetit':       'divers.coffrePetit',
  'miscFees.garantieBancaire':  'divers.garantieBancaire',
  'miscFees.successionFrais':   'divers.successionFrais',
  'miscFees.procurationCompte': 'divers.procuration',
  'miscFees.assuranceCompte':   'divers.assuranceCompte',
  'miscFees.droitTimbre':       'divers.droitTimbre',

  // ─── COMPLÉTUDE 100% ───
  'accountFees.tenueCompte.particulierEtranger': 'tenueCompte.particulierEtranger',
  'accountFees.tenueCompte.association':         'tenueCompte.association',
  'accountFees.tenueCompte.compteEpargne':       'tenueCompte.compteEpargne',
  'accountFees.tenueCompte.compteDevises':       'tenueCompte.compteDevises',
  'accountFees.fraisOuvertureEntreprise':        'ouvertureCompte.entreprise',
  'accountFees.minimumDepot':                    'ouvertureCompte.minimumDepot',
  'accountFees.fraisClotureEntreprise':          'clotureCompte.entreprise',
  'accountFees.releveCompte.mensuelEmail':       'releves.mensuelEmail',
  'accountFees.releveCompte.annuel':             'releves.releveAnnuel',
  'accountFees.certificatNonEngagement':         'releves.certificatNonEngagement',
  'accountFees.rib':                             'releves.rib',
  'cardFees.paiementTpeAutre':       'fraisCartes.paiementTpeAutre',
  'cardFees.renouvellementAnticipe': 'fraisCartes.renouvellementAnticipe',
  'cardFees.carteCaptee':            'fraisCartes.carteCaptee',
  'transferFees.virementNationalMemeBank':              'virements.nationalMemeBank',
  'transferFees.virementNationalAutreBanqueCommission': 'virements.nationalAutreBankCommission',
  'transferFees.virementZoneMonetaire':                 'virements.zoneMonetaire',
  'transferFees.virementInternationalFraisFixes':       'virements.international',
  'transferFees.recuVirement':                          'virements.recuVirement',
  'checkFees.carnet50':                       'cheques.carnet50',
  'checkFees.carnet100':                      'cheques.carnet100',
  'checkFees.chequeGuichet':                  'cheques.chequeGuichet',
  'checkFees.chequeRetourne':                 'cheques.chequeRetourne',
  'checkFees.encaissementDeplacement':        'cheques.encaissementDeplacement',
  'checkFees.encaissementEtrangerCommission': 'cheques.encaissementEtrangerCommission',
  'creditFees.creditPME':       'credits.creditPME',
  'creditFees.penaliteRetard':  'credits.penaliteRetard',
  'eBankingFees.abonnementAnnuel':      'ebanking.abonnementAnnuel',
  'eBankingFees.parOperation':          'ebanking.parOperation',
  'eBankingFees.smsAlerteAbonnement':   'ebanking.smsAlerteAbonnement',
  'miscFees.coffreMoyen':           'divers.coffreMoyen',
  'miscFees.coffreGrand':           'divers.coffreGrand',
  'miscFees.garantieLocative':      'divers.garantieLocative',
  'miscFees.cautionMarche':         'divers.cautionMarche',
  'miscFees.saisieAttribution':     'divers.saisieAttribution',
  'miscFees.mainLevee':             'divers.mainLevee',
  'miscFees.successionCommission':  'divers.successionCommission',
  'miscFees.avoirInactif':          'divers.avoirInactif',
  'miscFees.tvaServices':           'divers.tvaServices',

  // ─── CARTES — cotisations annuelles par type ───
  'cardFees.visaClassic':  upsertCardCotisation('VISA',  'classic',  'Visa Classic'),
  'cardFees.visaGold':     upsertCardCotisation('VISA',  'gold',     'Visa Gold'),
  'cardFees.visaPlatinum': upsertCardCotisation('VISA',  'platinum', 'Visa Platinum'),
  'cardFees.gimac':        upsertCardCotisation('GIMAC', 'gimac',    'Carte GIMAC'),
};

// ────────────────────────────────────────────────────────────────────────────
// applyExtractedValuesToConditions — projette `extractedValues` sur un base
// ────────────────────────────────────────────────────────────────────────────
// Retourne un NOUVEAU FullBankConditions (deep-clone) avec les valeurs
// extraites appliquées via REGISTRY_TO_FORM_PATH.

export function applyExtractedValuesToConditions(
  base: FullBankConditions,
  values: Record<string, number | string | boolean | null | undefined>,
): FullBankConditions {
  const next = JSON.parse(JSON.stringify(base)) as FullBankConditions;
  for (const [rawKey, value] of Object.entries(values)) {
    if (value === null || value === undefined) continue;
    const target = REGISTRY_TO_FORM_PATH[rawKey] ?? rawKey;
    if (typeof target === 'function') {
      target(next, value);
    } else {
      setByPath(next as unknown as Record<string, unknown>, target, value);
    }
  }
  return next;
}

// ────────────────────────────────────────────────────────────────────────────
// mergeBankConditions — fusionne la forme DB par-dessus le squelette vide
// ────────────────────────────────────────────────────────────────────────────
// Garantit que toutes les sous-clés requises par le formulaire existent
// (sinon les <input> recevraient `undefined`), tout en préservant chaque
// champ saisi par l'utilisateur ou extrait du PDF.

export function mergeBankConditions(
  empty: FullBankConditions,
  bankData: Partial<FullBankConditions> | null | undefined,
): FullBankConditions {
  if (!bankData) return empty;
  const merged: FullBankConditions = { ...empty };
  const objectSectionKeys: Array<keyof FullBankConditions> = [
    'tenueCompte', 'ouvertureCompte', 'clotureCompte', 'releves',
    'guichet', 'fraisCartes', 'virements', 'cheques', 'credits',
    'ebanking', 'divers',
  ];
  for (const k of objectSectionKeys) {
    const fromDb = bankData[k] as Record<string, unknown> | undefined;
    if (fromDb && typeof fromDb === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (merged as any)[k] = { ...(empty[k] as object), ...fromDb };
    }
  }
  if (Array.isArray(bankData.cartes))    merged.cartes    = bankData.cartes;
  if (Array.isArray(bankData.customFees)) merged.customFees = bankData.customFees;
  if (Array.isArray(bankData.documents))  merged.documents  = bankData.documents;
  return merged;
}
