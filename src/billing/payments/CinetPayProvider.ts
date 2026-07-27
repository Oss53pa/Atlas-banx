// ============================================================================
// ATLASBANX — Prestataire de paiement CinetPay (mobile money UEMOA/CEMAC)
// ============================================================================
// SÉCURITÉ : les clés marchandes vivent UNIQUEMENT côté serveur (Edge Functions
// cinetpay-init / -notify / -status). Le client ne fait qu'appeler ces
// fonctions ; il ne voit jamais la clé API.
//
// Modes :
//   - Supabase joignable → le SERVEUR décide 'live' (clés posées) ou 'sandbox'
//     (clés absentes → paiement simulé, aucun débit).
//   - Supabase absent (tests/offline) → sandbox local.
// ============================================================================

import { getSupabaseClient } from '../../lib/supabase';
import type {
  PaymentProvider,
  PaymentRequest,
  PaymentInitResult,
  PaymentVerifyResult,
  PaymentMode,
  PaymentStatus,
} from './types';

export class CinetPayProvider implements PaymentProvider {
  readonly name = 'CinetPay';
  readonly mode: PaymentMode;

  constructor(hint?: { apiKey?: string; siteId?: string }) {
    // Indice informatif seulement ; le mode réel est décidé côté serveur.
    this.mode = hint?.apiKey && hint?.siteId ? 'live' : 'sandbox';
  }

  async initiate(request: PaymentRequest): Promise<PaymentInitResult> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      // Repli local : paiement simulé.
      return {
        transactionId: `sandbox-${request.reference}`,
        status: 'pending',
        redirectUrl: null,
        mode: 'sandbox',
      };
    }

    const { data, error } = await supabase.functions.invoke('cinetpay-init', {
      body: {
        reference: request.reference,
        amount: request.amount,
        currency: request.currency,
        description: request.description,
        customerEmail: request.customerEmail,
        customerPhone: request.customerPhone,
      },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(String(data.error));

    return {
      transactionId: data?.transactionId ?? request.reference,
      status: (data?.status as PaymentStatus) ?? 'pending',
      redirectUrl: data?.redirectUrl ?? null,
      mode: (data?.mode as PaymentMode) ?? 'sandbox',
    };
  }

  async verify(transactionId: string): Promise<PaymentVerifyResult> {
    // Sandbox : paiement simulé considéré comme réussi.
    if (transactionId.startsWith('sandbox-')) {
      return { transactionId, status: 'succeeded', mode: 'sandbox' };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { transactionId, status: 'succeeded', mode: 'sandbox' };
    }

    const { data, error } = await supabase.functions.invoke('cinetpay-status', {
      body: { reference: transactionId },
    });
    if (error) throw new Error(error.message);
    return {
      transactionId,
      status: (data?.status as PaymentStatus) ?? 'pending',
      mode: 'live',
    };
  }
}
