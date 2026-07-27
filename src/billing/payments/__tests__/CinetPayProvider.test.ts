import { describe, it, expect, vi } from 'vitest';

// Force le repli sandbox local (pas de serveur) pour des tests déterministes.
vi.mock('../../../lib/supabase', () => ({ getSupabaseClient: () => null }));

import { CinetPayProvider } from '../CinetPayProvider';
import type { PaymentRequest } from '../types';

const req: PaymentRequest = {
  amount: 15000,
  currency: 'XOF',
  description: 'Audit express 3 mois',
  reference: 'ref-abc-123',
};

describe('CinetPayProvider (repli sandbox, sans serveur)', () => {
  const provider = new CinetPayProvider({});

  it('indice de mode sandbox sans clé', () => {
    expect(provider.mode).toBe('sandbox');
    expect(provider.name).toBe('CinetPay');
  });

  it('initie une transaction sandbox pending sans redirection', async () => {
    const res = await provider.initiate(req);
    expect(res.mode).toBe('sandbox');
    expect(res.status).toBe('pending');
    expect(res.redirectUrl).toBeNull();
    expect(res.transactionId).toBe('sandbox-ref-abc-123');
  });

  it('vérifie un paiement simulé comme réussi', async () => {
    const init = await provider.initiate(req);
    const check = await provider.verify(init.transactionId);
    expect(check.status).toBe('succeeded');
    expect(check.mode).toBe('sandbox');
  });
});

describe('CinetPayProvider (indice de mode)', () => {
  it('indice live quand des clés sont fournies au constructeur', () => {
    const provider = new CinetPayProvider({ apiKey: 'k', siteId: 's' });
    expect(provider.mode).toBe('live');
  });
});
