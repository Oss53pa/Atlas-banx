// ============================================================================
// ATLASBANX — Prestataire de paiement CinetPay (mobile money UEMOA/CEMAC)
// ============================================================================
// Deux modes :
//   - 'live'    : clés marchandes présentes (VITE_CINETPAY_API_KEY + SITE_ID)
//                 → flux réel CinetPay (à finaliser côté webhook serveur).
//   - 'sandbox' : aucune clé → paiement SIMULÉ, aucun mouvement d'argent.
//                 Permet de valider le funnel de bout en bout dès maintenant.
//
// Le contrat public (PaymentProvider) est identique dans les deux modes, donc
// passer en réel reviendra à poser les secrets + implémenter l'appel HTTP.
// ============================================================================

import type {
  PaymentProvider,
  PaymentRequest,
  PaymentInitResult,
  PaymentVerifyResult,
  PaymentMode,
} from './types';

interface CinetPayConfig {
  apiKey?: string;
  siteId?: string;
  /** Endpoint API (défaut : production CinetPay). */
  baseUrl?: string;
  /** URL de notification serveur (webhook) — requise en live. */
  notifyUrl?: string;
}

function envConfig(): CinetPayConfig {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  return {
    apiKey: env.VITE_CINETPAY_API_KEY,
    siteId: env.VITE_CINETPAY_SITE_ID,
    baseUrl: env.VITE_CINETPAY_BASE_URL || 'https://api-checkout.cinetpay.com/v2',
    notifyUrl: env.VITE_CINETPAY_NOTIFY_URL,
  };
}

export class CinetPayProvider implements PaymentProvider {
  readonly name = 'CinetPay';
  readonly mode: PaymentMode;
  private config: CinetPayConfig;

  constructor(config?: CinetPayConfig) {
    this.config = config ?? envConfig();
    this.mode = this.config.apiKey && this.config.siteId ? 'live' : 'sandbox';
  }

  async initiate(request: PaymentRequest): Promise<PaymentInitResult> {
    if (this.mode === 'sandbox') {
      // Paiement simulé : on renvoie une transaction 'pending' sans redirection.
      return {
        transactionId: `sandbox-${request.reference}`,
        status: 'pending',
        redirectUrl: null,
        mode: 'sandbox',
      };
    }

    // Mode live — flux CinetPay réel.
    const res = await fetch(`${this.config.baseUrl}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: this.config.apiKey,
        site_id: this.config.siteId,
        transaction_id: request.reference,
        amount: request.amount,
        currency: request.currency,
        description: request.description,
        notify_url: this.config.notifyUrl,
        customer_email: request.customerEmail,
        customer_phone_number: request.customerPhone,
        channels: 'ALL',
      }),
    });
    const data = await res.json();
    if (data?.code !== '201' || !data?.data?.payment_url) {
      throw new Error(`CinetPay: ${data?.message ?? 'échec de création du paiement'}`);
    }
    return {
      transactionId: request.reference,
      status: 'pending',
      redirectUrl: data.data.payment_url as string,
      mode: 'live',
    };
  }

  async verify(transactionId: string): Promise<PaymentVerifyResult> {
    if (this.mode === 'sandbox') {
      // Paiement simulé considéré comme réussi.
      return { transactionId, status: 'succeeded', mode: 'sandbox' };
    }

    const res = await fetch(`${this.config.baseUrl}/payment/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: this.config.apiKey,
        site_id: this.config.siteId,
        transaction_id: transactionId,
      }),
    });
    const data = await res.json();
    const status =
      data?.data?.status === 'ACCEPTED'
        ? 'succeeded'
        : data?.data?.status === 'REFUSED'
          ? 'failed'
          : 'pending';
    return { transactionId, status, mode: 'live' };
  }
}
