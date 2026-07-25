// ============================================================================
// ATLASBANX — useMfa hook
// ============================================================================
// Thin, typed wrapper around `supabase.auth.mfa.*` (TOTP factors).
// Exposes enrollment, verification, listing, unenrollment and AAL helpers.
//
// Handles the null client (Supabase non configuré) gracefully:
//   - read paths (listFactors / getAal / hasVerifiedTotp) resolve to safe
//     empty/neutral values instead of throwing, so callers can fail SAFE ;
//   - write paths (enroll / verify / unenroll) throw an explicit error since
//     they cannot possibly succeed without a backend.
// ============================================================================

import { useCallback, useMemo } from 'react';
import type { AuthenticatorAssuranceLevels } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabase';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface MfaTotpFactor {
  id: string;
  friendlyName: string;
  factorType: 'totp';
  status: 'verified' | 'unverified';
  createdAt: string;
}

export interface MfaEnrollResult {
  factorId: string;
  /** SVG markup (or data-URL) of the QR code, rendered directly by the UI. */
  qrCodeSvg: string;
  /** TOTP shared secret, for manual entry in the authenticator app. */
  secret: string;
  /** otpauth:// provisioning URI. */
  uri: string;
}

export interface MfaAal {
  currentLevel: AuthenticatorAssuranceLevels | null;
  nextLevel: AuthenticatorAssuranceLevels | null;
}

export interface UseMfaReturn {
  /** True when a Supabase client is available (backend configured). */
  isAvailable: boolean;
  listFactors: () => Promise<MfaTotpFactor[]>;
  enrollTotp: (friendlyName?: string) => Promise<MfaEnrollResult>;
  verifyEnrollment: (factorId: string, code: string) => Promise<void>;
  unenroll: (factorId: string) => Promise<void>;
  getAal: () => Promise<MfaAal>;
  /** Convenience: does the current user have at least one verified TOTP factor? */
  hasVerifiedTotp: () => Promise<boolean>;
}

const NOT_CONFIGURED = 'Supabase non configuré — MFA indisponible.';

// ----------------------------------------------------------------------------
// Hook
// ----------------------------------------------------------------------------

export function useMfa(): UseMfaReturn {
  const isAvailable = getSupabaseClient() !== null;

  const listFactors = useCallback(async (): Promise<MfaTotpFactor[]> => {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error || !data) return [];

    return (data.totp ?? []).map((f) => ({
      id: f.id,
      friendlyName: f.friendly_name ?? 'Authenticator',
      factorType: 'totp' as const,
      status: f.status as 'verified' | 'unverified',
      createdAt: f.created_at,
    }));
  }, []);

  const enrollTotp = useCallback(
    async (friendlyName = 'AtlasBanx TOTP'): Promise<MfaEnrollResult> => {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error(NOT_CONFIGURED);

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName,
      });
      if (error || !data) {
        throw new Error(error?.message ?? "Impossible d'enrôler le facteur TOTP.");
      }

      return {
        factorId: data.id,
        qrCodeSvg: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      };
    },
    [],
  );

  const verifyEnrollment = useCallback(
    async (factorId: string, code: string): Promise<void> => {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error(NOT_CONFIGURED);

      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });
      if (challengeError || !challenge) {
        throw new Error(challengeError?.message ?? 'Challenge MFA impossible.');
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) {
        throw new Error(verifyError.message || 'Code invalide.');
      }
    },
    [],
  );

  const unenroll = useCallback(async (factorId: string): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error(NOT_CONFIGURED);

    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) throw new Error(error.message || 'Désenrôlement MFA impossible.');
  }, []);

  const getAal = useCallback(async (): Promise<MfaAal> => {
    const supabase = getSupabaseClient();
    if (!supabase) return { currentLevel: null, nextLevel: null };

    const { data, error } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || !data) return { currentLevel: null, nextLevel: null };

    return {
      currentLevel: data.currentLevel ?? null,
      nextLevel: data.nextLevel ?? null,
    };
  }, []);

  const hasVerifiedTotp = useCallback(async (): Promise<boolean> => {
    const factors = await listFactors();
    return factors.some((f) => f.status === 'verified');
  }, [listFactors]);

  return useMemo(
    () => ({
      isAvailable,
      listFactors,
      enrollTotp,
      verifyEnrollment,
      unenroll,
      getAal,
      hasVerifiedTotp,
    }),
    [isAvailable, listFactors, enrollTotp, verifyEnrollment, unenroll, getAal, hasVerifiedTotp],
  );
}
