// ============================================================================
// CDC — Soumission d'un référentiel bancaire validé (workflow 2 yeux, étape 1)
// ============================================================================
// À partir des champs validés dans le SplitScreenValidator, crée une version
// de référence L2 en brouillon (bank_reference_versions + conditions) puis la
// soumet à validation par un pair. La validation + publication se font ensuite
// par un AUTRE utilisateur (imposé par RLS + trigger check_two_eyes_distinct).
// ============================================================================

import { isSupabaseConfigured } from '../../lib/supabase';
import { CdcService } from './CdcService';
import type { ExtractedField } from '../components/SplitScreenValidator';

export interface SubmitReferenceInput {
  /** Code banque (Bank.code de l'app) — mappé sur cdc_banks.code. */
  bankCode: string;
  /** URL (ou data-URL) du PDF source archivé. */
  pdfUrl: string;
  /** Champs validés par l'opérateur. */
  fields: ExtractedField[];
  /** Date d'entrée en vigueur (défaut : aujourd'hui). */
  effectiveFrom?: Date;
  /**
   * Hash SHA-256 (hex) pré-calculé du PDF source. Fourni quand le fichier a
   * déjà été lu côté client (upload storage) : évite un re-fetch et garantit
   * que l'empreinte porte sur les octets réels du document.
   */
  sourceHashSha256?: string;
  /**
   * Segment client auquel s'appliquent ces conditions (barème différencié),
   * selon la taxonomie CDC : 'particulier' | 'pme' | 'corporate'. Posé dans
   * `dimensions.profil`. Absent = condition « catch-all » (tous segments).
   */
  segment?: 'particulier' | 'pme' | 'corporate';
  /**
   * Métadonnées de banque pour l'auto-création dans cdc_banks si le code n'y
   * existe pas encore (console admin sur une banque de l'app pas encore
   * présente au référentiel CDC).
   */
  bankMeta?: { legalName: string; countryIso: string; zone: 'UEMOA' | 'CEMAC' };
  /**
   * Auto-validation (phase de démarrage) : publie immédiatement la version au
   * lieu de la laisser en attente d'un second validateur. Réservé aux admins
   * (imposé côté base par admin_autopublish_reference). À n'utiliser que
   * lorsqu'un seul administrateur Atlas Studio existe.
   */
  autoPublish?: boolean;
}

export interface SubmitReferenceResult {
  versionId: string;
  conditionsCount: number;
  /** true si la version a été publiée immédiatement (auto-validation). */
  published?: boolean;
}

/**
 * Parse une valeur textuelle « 2 500 » / « 11,5 » / « 0.25 » en nombre.
 * Retourne null si non numérique (champ purement textuel).
 */
function parseNumeric(value: string | number | null): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const cleaned = value
    .replace(/\s|\u00A0/g, '')   // espaces (dont insécables)
    .replace(/,/g, '.')          // virgule décimale → point
    .replace(/[^0-9.-]/g, '');  // retire unités/symboles résiduels
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** SHA-256 (hex) du PDF source. Repli sur l'URL si le contenu est illisible. */
async function hashPdf(pdfUrl: string): Promise<string> {
  try {
    const res = await fetch(pdfUrl);
    const buf = await res.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return toHex(digest);
  } catch {
    const enc = new TextEncoder().encode(pdfUrl);
    const digest = await crypto.subtle.digest('SHA-256', enc);
    return toHex(digest);
  }
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Crée une version de référence en brouillon à partir des champs validés,
 * puis la soumet à validation (étape 1 du workflow 2 yeux).
 */
export async function submitValidatedReference(
  input: SubmitReferenceInput,
): Promise<SubmitReferenceResult> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase n\'est pas configuré — la publication de référentiel nécessite une connexion.',
    );
  }
  if (input.fields.length === 0) {
    throw new Error('Aucun champ à publier.');
  }

  const service = new CdcService();

  // 1. Résoudre la banque CDC par code — auto-création si absente et métadonnées fournies.
  const banks = await service.listBanks();
  let bank = banks.find((b) => b.code === input.bankCode);
  if (!bank) {
    if (!input.bankMeta) {
      throw new Error(
        `Banque « ${input.bankCode} » introuvable dans le référentiel CDC (cdc_banks).`,
      );
    }
    bank = await service.createBank({
      code: input.bankCode,
      legalName: input.bankMeta.legalName,
      countryIso: input.bankMeta.countryIso,
      zone: input.bankMeta.zone,
      jurisdictionIds: [],
      swiftBic: null,
      parentGroup: null,
      isActive: true,
    });
  }

  // 2. Créer la version brouillon
  const effectiveFrom = input.effectiveFrom ?? new Date();
  const sourceHash = input.sourceHashSha256 ?? (await hashPdf(input.pdfUrl));

  // 2bis. Anti-doublon : refuser de republier le MÊME document source (même
  //       empreinte SHA-256) tant qu'une version active existe pour la banque.
  const duplicate = await service.findBankReferenceVersionByHash(bank.id, sourceHash);
  if (duplicate) {
    throw new Error(
      `Ce document source est déjà publié au référentiel pour cette banque `
      + `(version « ${duplicate.versionLabel} », statut ${duplicate.validationStatus}). `
      + `Import ignoré pour éviter un doublon.`,
    );
  }

  const version = await service.createBankReferenceVersion({
    bankId: bank.id,
    versionLabel: `Validation IA — ${effectiveFrom.toISOString().slice(0, 10)}`,
    effectiveFrom,
    effectiveTo: null,
    sourcePdfUrl: input.pdfUrl,
    sourceHashSha256: sourceHash,
    validationStatus: 'draft',
    validatedBy: null,
    validatedAt: null,
    publishedAt: null,
  });

  // 3. Ajouter les conditions issues des champs validés
  const segmentDimensions = input.segment ? { profil: input.segment } : null;
  const conditions = input.fields
    .filter((f) => f.rubricCode)
    .map((f) => ({
      rubricCode: f.rubricCode,
      dimensions: segmentDimensions,
      valueNumeric: parseNumeric(f.value),
      valueFormula: null,
      pdfBbox: f.bbox
        ? { x: f.bbox.x, y: f.bbox.y, w: f.bbox.w, h: f.bbox.h }
        : null,
      pdfPage: f.bbox?.page ?? null,
      notes: [
        f.label,
        f.unit ? `(${f.unit})` : '',
        f.value != null && f.value !== '' ? `valeur brute: ${f.value}` : '',
      ]
        .filter(Boolean)
        .join(' '),
    }));

  if (conditions.length > 0) {
    await service.addBankReferenceConditions(version.id, conditions);
  }

  // 4. Auto-validation (phase de démarrage) : publier tout de suite si demandé.
  //    On passe DIRECTEMENT du brouillon à « publié » via la fonction admin
  //    (draft → published), sans l'étape « submitted » — la base impose que
  //    l'appelant soit admin, gère la supersession des versions chevauchantes,
  //    et lève l'altérité deux-yeux le temps de la transaction.
  if (input.autoPublish) {
    await service.autoPublishBankReferenceVersion(version.id);
    return { versionId: version.id, conditionsCount: conditions.length, published: true };
  }

  // 4bis. Sinon : soumettre à validation (workflow deux yeux — un pair validera
  //       puis publiera).
  await service.submitBankReferenceVersion(version.id);
  return { versionId: version.id, conditionsCount: conditions.length, published: false };
}
