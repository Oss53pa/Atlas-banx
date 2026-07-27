/**
 * Vérification du JWT SSO Atlas Studio — VERSION HARMONISÉE (alignée app-token).
 *
 * Aligné sur l'émetteur (portail Atlas-Studio-Website · edge function app-token) :
 *   - en-tête { alg:"HS256", typ:"JWT", kid:<appId> } → clé résolue PAR APP,
 *     miroir de `federation_keys` : JWT_SECRET_<APPID> si provisionnée, sinon
 *     repli sur le JWT_SECRET partagé ;
 *   - claim `aud` = appId → le token n'est valable QUE pour l'app visée ;
 *   - `exp` toujours émis (8h) → ici traité comme OBLIGATOIRE, avec une
 *     tolérance d'horloge et prise en compte de `nbf`.
 *
 * Contrat unique destiné à devenir un paquet partagé par toutes les apps
 * satellites (une seule source de vérité). Ne pas re-forker par app :
 * l'audience acceptée est passée en paramètre, plus de `appId` codé en dur.
 */
export interface AtlasStudioClaims {
  userId: string;
  email: string;
  fullName: string;
  appId: string;
  aud?: string;
  plan: string;
  iat: number;
  exp: number;
  nbf?: number;
  allowed_societies?: string[];
}

export interface VerifyOptions {
  /** Audience(s) acceptée(s) pour cette app : id canonique + éventuels alias. */
  audience: string | string[];
  /** Tolérance d'horloge en secondes (défaut 60). */
  clockSkewSec?: number;
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeJson<T>(segment: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(segment))) as T;
}

/**
 * Résout la clé de vérification par app depuis l'en-tête `kid`, miroir de
 * `federation_keys` côté émetteur : JWT_SECRET_<APPID> si provisionnée, sinon
 * le JWT_SECRET partagé. Lecture paresseuse de l'env → une clé fraîchement
 * définie est prise en compte sans redéploiement du code.
 */
function resolveSecret(kid?: string): string {
  if (kid) {
    const envName = `JWT_SECRET_${kid.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
    const perApp = Deno.env.get(envName);
    if (perApp) return perApp;
  }
  const shared = Deno.env.get("JWT_SECRET");
  if (!shared) {
    throw new Error(
      "Configuration serveur : aucune clé JWT disponible (ni JWT_SECRET_<APP> ni JWT_SECRET partagé)",
    );
  }
  return shared;
}

export async function verifyAtlasJWT(
  token: string,
  opts: VerifyOptions,
): Promise<AtlasStudioClaims> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Format JWT invalide");
  const [headerB64, payloadB64, signatureB64] = parts;

  // 1. En-tête → résolution de la clé PAR APP via `kid`.
  const header = decodeJson<{ alg?: string; kid?: string }>(headerB64);
  const secret = resolveSecret(header.kid);

  // 2. Signature HMAC-SHA256.
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlDecode(signatureB64),
    encoder.encode(`${headerB64}.${payloadB64}`),
  );
  if (!valid) throw new Error("Signature JWT invalide");

  // 3. Claims.
  const claims = decodeJson<AtlasStudioClaims>(payloadB64);
  const now = Math.floor(Date.now() / 1000);
  const skew = opts.clockSkewSec ?? 60;

  // 4. Expiration OBLIGATOIRE (+ nbf) avec tolérance d'horloge.
  if (!claims.exp) throw new Error("Token sans expiration (exp) — refusé");
  if (claims.exp + skew < now) throw new Error("Token expiré");
  if (claims.nbf && claims.nbf - skew > now) {
    throw new Error("Token pas encore valide (nbf)");
  }

  // 5. Claims obligatoires.
  if (!claims.email || !claims.userId) {
    throw new Error("Claims obligatoires manquants (email, userId)");
  }

  // 6. Audience : `aud` (repli `appId` pour compat) ∈ audiences acceptées.
  const aud = claims.aud ?? claims.appId;
  const accepted = Array.isArray(opts.audience) ? opts.audience : [opts.audience];
  if (!aud || !accepted.includes(aud)) {
    throw new Error(
      `Audience du token "${aud ?? "(absente)"}" non autorisée (attendu : ${accepted.join(", ")})`,
    );
  }

  return claims;
}
