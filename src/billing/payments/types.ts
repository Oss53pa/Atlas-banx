// ============================================================================
// ATLASBANX — Abstraction paiement
// ============================================================================
// Interface commune aux prestataires (CinetPay, Stripe…). Permet de brancher
// un vrai prestataire plus tard sans toucher au funnel. Tant qu'aucune clé
// marchande n'est configurée, l'implémentation tourne en mode 'sandbox'
// (paiement simulé, aucun mouvement d'argent réel).
// ============================================================================

export type PaymentStatus = 'pending' | 'succeeded' | 'failed';
export type PaymentMode = 'sandbox' | 'live';

export interface PaymentRequest {
  /** Montant entier dans la plus petite unité de la devise (FCFA = pas de décimale). */
  amount: number;
  currency: 'XOF' | 'XAF' | 'EUR';
  description: string;
  /** Référence marchande unique (idempotence). */
  reference: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface PaymentInitResult {
  transactionId: string;
  status: PaymentStatus;
  /** URL de redirection du prestataire (null en sandbox). */
  redirectUrl: string | null;
  mode: PaymentMode;
}

export interface PaymentVerifyResult {
  transactionId: string;
  status: PaymentStatus;
  mode: PaymentMode;
}

export interface PaymentProvider {
  readonly name: string;
  readonly mode: PaymentMode;
  /** Démarre une transaction. En sandbox : renvoie 'pending' sans redirection. */
  initiate(request: PaymentRequest): Promise<PaymentInitResult>;
  /** Vérifie l'état. En sandbox : renvoie 'succeeded' (paiement simulé). */
  verify(transactionId: string): Promise<PaymentVerifyResult>;
}
