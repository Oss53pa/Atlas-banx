// ============================================================================
// ATLASBANX — Extraction par VISION (LLM multimodal) — repli qualité
// ============================================================================
// Quand l'OCR déterministe échoue (scan dense/médiocre, MANUSCRIT, layout
// exotique), un modèle de vision LIT l'image là où Tesseract ne peut pas.
//
// Deux fournisseurs, dans cet ordre :
//   1. GROQ (qwen/qwen3.6-27b, multimodal) via l'Edge Function `groq-proxy`.
//      Clé GROQ_API_KEY côté serveur (déjà configurée) → dispo pour TOUS les
//      utilisateurs, aucune clé perso requise. Chemin préféré.
//   2. CLAUDE (vision) via `claude-proxy`, si l'utilisateur a renseigné sa
//      propre clé Anthropic. Repli.
//
// Les deux Edge Functions transmettent `messages` tel quel → les API supportent
// les blocs image (OpenAI `image_url` pour Groq, `image`/base64 pour Anthropic).
//
// Dégradation gracieuse : sans clé / hors-ligne / réponse invalide → renvoie []
// et l'appelant conserve le résultat OCR déterministe.
// ============================================================================

import { getSupabaseClient } from '../lib/supabase';
import type { LabelValuePair } from '../extraction/conditions/types';

const GROQ_VISION_MODEL = 'qwen/qwen3.6-27b';      // Groq, multimodal, JSON mode
const CLAUDE_VISION_MODEL = 'claude-sonnet-4-6-20250514';

function fnUrl(slug: string): string | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!url || url === 'votre-supabase-url') return null;
  return `${url.replace(/\/$/, '')}/functions/v1/${slug}`;
}

/** L'extraction vision est-elle tentable ? (Supabase joignable → au moins le
 *  chemin Groq à clé serveur.) La présence effective des clés est vérifiée
 *  côté serveur (→ erreur sinon, gérée en repli gracieux). */
export function isVisionExtractionAvailable(): boolean {
  return Boolean(fnUrl('groq-proxy')) && Boolean(getSupabaseClient());
}

const MEDIA_TYPES: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
};

function splitDataUrl(dataUrl: string): { mediaType: string; data: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  return m ? { mediaType: m[1], data: m[2] } : null;
}

const SYSTEM_PROMPT =
  "Tu es un extracteur de GRILLES TARIFAIRES bancaires (zone UEMOA/CEMAC). "
  + "On te donne l'image d'un document de conditions (éventuellement scanné, "
  + "de mauvaise qualité, ou manuscrit). Tu lis chaque ligne tarifaire et tu "
  + "renvoies UNIQUEMENT un tableau JSON, sans texte autour.";

const USER_INSTRUCTION =
  "Extrais TOUTES les lignes tarifaires visibles. Pour chaque ligne, renvoie un "
  + "objet {\"label\": string (le libellé de la prestation, nettoyé), \"value\": "
  + "number (le montant en chiffres, 0 si gratuit/qualitatif), \"unit\": \"FCFA\"|"
  + "\"%\"|null, \"qualitative\": \"gratuit\"|\"consulter\"|null}. Ignore les "
  + "en-têtes de sections et les numéros de section. Ne réfléchis pas à voix "
  + "haute, réponds DIRECTEMENT et STRICTEMENT par un tableau JSON valide, ex: "
  + "[{\"label\":\"Tenue de compte\",\"value\":5000,\"unit\":\"FCFA\",\"qualitative\":null}]";

/**
 * Parse défensivement la réponse du modèle en LabelValuePair[]. Exporté pour
 * les tests (indépendant du réseau).
 */
export function parseVisionPairs(answer: string): LabelValuePair[] {
  if (!answer) return [];
  // Modèles « thinking » (qwen) : on retire le raisonnement <think>…</think>
  // (y compris un bloc non fermé, tronqué) avant de chercher le JSON.
  const clean = answer.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<think>[\s\S]*$/i, '');
  const start = clean.indexOf('[');
  const end = clean.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(clean.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const out: LabelValuePair[] = [];
  parsed.forEach((raw, i) => {
    if (!raw || typeof raw !== 'object') return;
    const o = raw as Record<string, unknown>;
    const label = typeof o.label === 'string' ? o.label.trim() : '';
    if (label.length < 2) return;
    const rawVal = o.value;
    const value = typeof rawVal === 'number' && Number.isFinite(rawVal)
      ? rawVal
      : Number(String(rawVal ?? '').replace(/[^\d.-]/g, '')) || 0;
    const unitRaw = typeof o.unit === 'string' ? o.unit : undefined;
    const unit = unitRaw === '%' ? '%'
      : unitRaw && /fcfa|xof|xaf/i.test(unitRaw) ? 'FCFA'
      : undefined;
    const q = typeof o.qualitative === 'string' ? o.qualitative.toLowerCase() : '';
    const qualitative = q === 'gratuit' ? 'gratuit' : q === 'consulter' ? 'consulter' : undefined;
    out.push({
      label,
      rawValue: String(rawVal ?? (qualitative ?? '')),
      value: qualitative ? 0 : Math.abs(value),
      unit: unit as LabelValuePair['unit'],
      qualitative: qualitative as LabelValuePair['qualitative'],
      confidence: 0.9,
      page: 1,
      y: -i,
    });
  });
  return out;
}

async function sessionToken(): Promise<string | undefined> {
  const supabase = getSupabaseClient();
  if (!supabase) return undefined;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  } catch {
    return undefined;
  }
}

/** GROQ (qwen vision) via groq-proxy — format OpenAI `image_url`. */
async function visionViaGroq(imageDataUrl: string, signal?: AbortSignal): Promise<LabelValuePair[]> {
  const url = fnUrl('groq-proxy');
  if (!url) return [];
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const token = await sessionToken();
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? anon}`, apikey: anon },
      body: JSON.stringify({
        model: GROQ_VISION_MODEL,
        temperature: 0,
        maxTokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: USER_INSTRUCTION },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        }],
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return parseVisionPairs(typeof data?.content === 'string' ? data.content : '');
  } catch {
    return [];
  }
}

/** CLAUDE (vision) via claude-proxy — format Anthropic `image`/base64. */
async function visionViaClaude(imageDataUrl: string, signal?: AbortSignal): Promise<LabelValuePair[]> {
  const url = fnUrl('claude-proxy');
  if (!url) return [];
  const img = splitDataUrl(imageDataUrl);
  if (!img) return [];
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const token = await sessionToken();
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? anon}`, apikey: anon },
      body: JSON.stringify({
        model: CLAUDE_VISION_MODEL,
        max_tokens: 4000,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: USER_INSTRUCTION },
            { type: 'image', source: { type: 'base64', media_type: img.mediaType || MEDIA_TYPES.png, data: img.data } },
          ],
        }],
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const text: string = Array.isArray(data?.content)
      ? data.content.filter((b: { type?: string }) => b?.type === 'text').map((b: { text?: string }) => b.text ?? '').join('\n')
      : (typeof data?.content === 'string' ? data.content : '');
    return parseVisionPairs(text);
  } catch {
    return [];
  }
}

/**
 * Lit une image et renvoie les lignes tarifaires (LabelValuePair[]). Essaie
 * GROQ d'abord (clé serveur, dispo pour tous), puis CLAUDE (clé perso) en
 * secours. `[]` si aucun fournisseur ne répond (repli gracieux).
 */
export async function visionExtractConditionPairs(
  imageDataUrl: string,
  opts: { signal?: AbortSignal } = {},
): Promise<LabelValuePair[]> {
  if (!imageDataUrl) return [];
  const viaGroq = await visionViaGroq(imageDataUrl, opts.signal);
  if (viaGroq.length > 0) return viaGroq;
  return visionViaClaude(imageDataUrl, opts.signal);
}
