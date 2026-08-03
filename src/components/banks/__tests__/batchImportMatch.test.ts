import { describe, it, expect } from 'vitest';
import { matchBankByFilename } from '../batchImportMatch';
import type { Bank } from '../../../types';

const bank = (id: string, code: string, name: string, country: string): Bank =>
  ({ id, code, name, country, isActive: true } as unknown as Bank);

const BANKS: Bank[] = [
  bank('b1', 'UBACICIX', "UBA Côte d'Ivoire", 'CI'),
  bank('b2', 'ECABCICI', "Ecobank Côte d'Ivoire", 'CI'),
  bank('b3', 'ECABSNDA', 'Ecobank Sénégal', 'SN'),
  bank('b4', 'SGBCCICI', "SGBCI - Société Générale Côte d'Ivoire", 'CI'),
  bank('b5', 'NSIACICI', "NSIA Banque Côte d'Ivoire", 'CI'),
  bank('b6', 'BOACICIX', "BOA Côte d'Ivoire - Bank of Africa", 'CI'),
];

const idOf = (fn: string) => matchBankByFilename(fn, BANKS).bankId;

describe('matchBankByFilename', () => {
  it('reconnaît par token distinctif du nom', () => {
    expect(idOf('UBA_CI_2024.pdf')).toBe('b1');
    expect(idOf('conditions nsia 2023.pdf')).toBe('b5');
    expect(idOf('SGBCI-tarifs.pdf')).toBe('b4'); // code banque dans le nom
    expect(idOf('boa cote ivoire.pdf')).toBe('b6');
  });

  it('reconnaît par code banque exact dans le nom', () => {
    expect(idOf('ECABSNDA_grille.pdf')).toBe('b3');
  });

  it('lève un drapeau ambigu quand deux banques partagent le token', () => {
    const m = matchBankByFilename('ecobank_conditions.pdf', BANKS);
    expect(m.bankId).not.toBeNull();       // suggère quand même
    expect(m.ambiguous).toBe(true);        // Ecobank CI vs SN → à vérifier
  });

  it('retourne null quand rien de plausible', () => {
    expect(idOf('document_sans_nom.pdf')).toBeNull();
    expect(idOf('scan001.pdf')).toBeNull();
  });
});
