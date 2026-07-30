import { describe, it, expect } from 'vitest';
// jsdom's File/Blob ne conservent pas les octets de façon lisible ; on utilise
// l'implémentation native de Node (identique au File réel du navigateur).
import { File } from 'node:buffer';
import { sha256HexOfFile } from '../crypto';

// SHA-256 hex empreinte — socle de la détection des doublons d'import.
describe('sha256HexOfFile', () => {
  it('retourne le SHA-256 connu du contenu (vecteur "abc")', async () => {
    const file = new File([new TextEncoder().encode('abc')], 'a.pdf', { type: 'application/pdf' });
    const hash = await sha256HexOfFile(file);
    // Empreinte SHA-256 canonique de "abc".
    expect(hash).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('deux fichiers au contenu identique (même octets) produisent la même empreinte', async () => {
    const bytes = new TextEncoder().encode('conditions-tarifaires-2026');
    const a = new File([bytes], 'bareme.pdf', { type: 'application/pdf' });
    // Nom différent, contenu identique → doit être détecté comme doublon.
    const b = new File([bytes], 'bareme-copie.pdf', { type: 'application/pdf' });
    expect(await sha256HexOfFile(a)).toBe(await sha256HexOfFile(b));
  });

  it('un contenu différent produit une empreinte différente', async () => {
    const a = new File([new TextEncoder().encode('v1')], 'a.pdf', { type: 'application/pdf' });
    const b = new File([new TextEncoder().encode('v2')], 'b.pdf', { type: 'application/pdf' });
    expect(await sha256HexOfFile(a)).not.toBe(await sha256HexOfFile(b));
  });
});
