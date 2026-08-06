// ============================================================================
// ATLASBANX — Extraction par VISION (Claude multimodal) — repli qualité
// ============================================================================
// Quand l'OCR déterministe échoue (scan dense/médiocre, MANUSCRIT, layout
// exotique), un modèle de vision LIT l'image là où Tesseract ne peut pas.
//
// Passe par l'Edge Function `claude-proxy` (qui transmet `messages` tel quel à
// l'API Anthropic — laquelle supporte les blocs image base64). La clé Anthropic
// vit côté serveur (user_ai_keys) : opt-in, jamais dans le navigateur.
//
// Dégradation gracieuse : sans clé / hors-ligne / réponse invalide → renvoie []
// et l'appelant conserve le résultat OCR déterministe. Aucune dépendance
// réseau n'est introduite dans le flux de base (n'est appelé qu'en repli).
// ============================================================================

import { getSupabaseClient } from '../lib/supabase';
import type { LabelValuePair } from '../extraction/conditions/types';

/** Modèle vision par défaut (Claude supporte la vision). Surchargée si besoin. */
const DEFAULT_VISION_MODEL = 'claude-sonnet-4-6-20250514';

function proxyUrl(): string | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!url || url === 'votre-supabase-url') return null;
  return `${url.replace(/\/$/, '')}/functions/v1/claude-proxy`;
}

/** L'extraction vision est-elle tentable (Supabase joignable) ? La présence
 *  effective de la clé Anthropic est vérifiée côté serveur (→ 400 sinon). */
export function isVisionExtractionAvailable(): boolean {
  return Boolean(proxyUrl()) && Boolean(getSupabaseClient());
}

const MEDIA_TYPES: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', webp: 'image/webp',
};

/** Découpe une data-URL en { media_type, base64 }. */
function splitDataUrl(dataUrl: string): { mediaType: string; data: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (m) return { mediaType: m[1], data: m[2] };
  return null;
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
  + "en-têtes de sections et les numéros de section. Réponds STRICTEMENT par un "
  + "tableau JSON valide, ex: "
  + "[{\"label\":\"Tenue de compte\",\"value\":5000,\"unit\":\"FCFA\",\"qualitative\":null}]";

/**
 * Parse défensivement la réponse du modèle en LabelValuePair[]. Exporté pour
 * les tests (indépendant du réseau).
 */
export function parseVisionPairs(answer: string): LabelValuePair[] {
  if (!answer) return [];
  const start = answer.indexOf('[');
  const end = answer.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(answer.slice(start, end + 1));
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
    const qualitative = q === 'gratuit' ? 'gratuit'
      : q === 'consulter' ? 'consulter'
      : undefined;
    out.push({
      label,
      rawValue: String(rawVal ?? (qualitative ?? '')),
      value: qualitative ? 0 : Math.abs(value),
      unit: unit as LabelValuePair['unit'],
      qualitative: qualitative as LabelValuePair['qualitative'],
      confidence: 0.9,       // vision = source fiable pour ce qui est lu
      page: 1,
      y: -i,                 // conserve l'ordre de lecture
    });
  });
  return out;
}

/**
 * Envoie l'image à Claude Vision et renvoie les lignes tarifaires en
 * LabelValuePair[]. `[]` en cas d'indisponibilité/erreur (repli gracieux).
 */
export async function visionExtractConditionPairs(
  imageDataUrl: string,
  opts: { model?: string; signal?: AbortSignal } = {},
): Promise<LabelValuePair[]> {
  const url = proxyUrl();
  const supabase = getSupabaseClient();
  if (!url || !supabase) return [];
  const img = splitDataUrl(imageDataUrl);
  if (!img) return [];

  let token: string | undefined;
  try {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token;
  } catch {
    return [];
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: opts.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token ?? (import.meta.env.VITE_SUPABASE_ANON_KEY as string)}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      },
      body: JSON.stringify({
        model: opts.model ?? DEFAULT_VISION_MODEL,
        max_tokens: 4000,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: USER_INSTRUCTION },
              { type: 'image', source: { type: 'base64', media_type: img.mediaType || MEDIA_TYPES.png, data: img.data } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    // Réponse Anthropic : { content: [{ type:'text', text }] }
    const text: string = Array.isArray(data?.content)
      ? data.content.filter((b: { type?: string }) => b?.type === 'text').map((b: { text?: string }) => b.text ?? '').join('\n')
      : (typeof data?.content === 'string' ? data.content : '');
    return parseVisionPairs(text);
  } catch {
    return [];
  }
}
