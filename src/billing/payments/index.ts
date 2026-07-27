import { CinetPayProvider } from './CinetPayProvider';
import type { PaymentProvider } from './types';

export type {
  PaymentProvider,
  PaymentRequest,
  PaymentInitResult,
  PaymentVerifyResult,
  PaymentStatus,
  PaymentMode,
} from './types';
export { CinetPayProvider } from './CinetPayProvider';

/** Prestataire de paiement actif. CinetPay (mobile money) par défaut. */
export function getPaymentProvider(): PaymentProvider {
  return new CinetPayProvider();
}
