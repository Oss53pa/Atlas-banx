import { describe, it, expect } from 'vitest';
import { CinetPayProvider } from '../CinetPayProvider';
import type { PaymentRequest } from '../types';

const req: PaymentRequest = {
  amount: 15000,
  currency: 'XOF',
  description: 'Audit express 3 mois',
  reference: 'ref-abc-123',
};

describe('CinetPayProvider (sandbox)', () => {
  const provider = new CinetPayProvider({}); // pas de clé → sandbox

  it('démarre en mode sandbox sans clé', () => {
    expect(provider.mode).toBe('sandbox');
    expect(provider.name).toBe('CinetPay');
  });

  it('initie une transaction pending sans redirection', async () => {
    const res = await provider.initiate(req);
    expect(res.mode).toBe('sandbox');
    expect(res.status).toBe('pending');
    expect(res.redirectUrl).toBeNull();
    expect(res.transactionId).toContain('ref-abc-123');
  });

  it('vérifie un paiement simulé comme réussi', async () => {
    const init = await provider.initiate(req);
    const check = await provider.verify(init.transactionId);
    expect(check.status).toBe('succeeded');
    expect(check.mode).toBe('sandbox');
  });
});

describe('CinetPayProvider (live)', () => {
  it('passe en mode live quand les clés sont fournies', () => {
    const provider = new CinetPayProvider({ apiKey: 'k', siteId: 's' });
    expect(provider.mode).toBe('live');
  });
});
