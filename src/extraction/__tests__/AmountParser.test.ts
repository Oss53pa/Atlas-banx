// ============================================================================
// Tests — AmountParser (parseAmount / findAmounts / looksLikeAmount)
// ============================================================================
// Verrouille le parsing des montants monétaires UEMOA/CEMAC + formats
// internationaux : séparateurs FR/EN/mixtes, signes (parenthèses, suffixe,
// préfixe), devises, et la détection des clusters de montants en texte libre.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { parseAmount, findAmounts, looksLikeAmount } from '../bank-statement/AmountParser';

describe('parseAmount — séparateurs', () => {
  it('parse un entier avec espace milliers ("5 000")', () => {
    const r = parseAmount('5 000');
    expect(r).not.toBeNull();
    expect(r!.value).toBe(5000);
    expect(r!.isDebit).toBe(false);
  });

  it('parse décimale virgule FR ("14,5")', () => {
    expect(parseAmount('14,5')!.value).toBe(14.5);
  });

  it('parse décimale qui commence par 0 ("0,025")', () => {
    expect(parseAmount('0,025')!.value).toBe(0.025);
  });

  it('traite "5,000" (3 décimales, début non-zéro) comme milliers EN', () => {
    expect(parseAmount('5,000')!.value).toBe(5000);
  });

  it('traite "5.000" (3 décimales) comme milliers', () => {
    expect(parseAmount('5.000')!.value).toBe(5000);
  });

  it('parse format FR complet "5.000,50" (point milliers + virgule décimale)', () => {
    expect(parseAmount('5.000,50')!.value).toBe(5000.5);
  });

  it('parse format EN complet "5,000.50" (virgule milliers + point décimale)', () => {
    expect(parseAmount('5,000.50')!.value).toBe(5000.5);
  });

  it('parse format mixte "5 000.50" (espace milliers + point décimale)', () => {
    expect(parseAmount('5 000.50')!.value).toBe(5000.5);
  });

  it('parse un grand montant "74 158 089"', () => {
    expect(parseAmount('74 158 089')!.value).toBe(74158089);
  });
});

describe('parseAmount — signes', () => {
  it('détecte les parenthèses comme débit ("(1 250,00)")', () => {
    const r = parseAmount('(1 250,00)');
    expect(r!.value).toBe(-1250);
    expect(r!.isDebit).toBe(true);
    expect(r!.hasExplicitSign).toBe(true);
  });

  it('détecte le signe suffixe ("1 250-")', () => {
    const r = parseAmount('1 250-');
    expect(r!.value).toBe(-1250);
    expect(r!.isDebit).toBe(true);
  });

  it('détecte le signe préfixe négatif ("-1 250")', () => {
    const r = parseAmount('-1 250');
    expect(r!.value).toBe(-1250);
    expect(r!.isDebit).toBe(true);
  });

  it('parse le préfixe positif "+1 250" sans le marquer débit', () => {
    const r = parseAmount('+1 250');
    expect(r!.value).toBe(1250);
    expect(r!.isDebit).toBe(false);
    // QUIRK CONNU : seul le préfixe "-" positionne hasExplicitSign ; un "+"
    // explicite ne le fait PAS (cf. branche LEADING_SIGN_PATTERN dans
    // AmountParser). Conséquence possible : dans un layout "montant + colonne
    // type", un "+1 250" avec une colonne type "D" serait flippé en négatif.
    // Test verrouillé sur le comportement actuel — à revoir si on corrige.
    expect(r!.hasExplicitSign).toBe(false);
  });
});

describe('parseAmount — devises', () => {
  it('strip "FCFA" et normalise en XOF', () => {
    const r = parseAmount('FCFA 5 000');
    expect(r!.value).toBe(5000);
    expect(r!.currency).toBe('XOF');
  });

  it('détecte XAF en suffixe', () => {
    expect(parseAmount('5 000 XAF')!.currency).toBe('XAF');
  });

  it('détecte XOF en suffixe', () => {
    expect(parseAmount('5 000 XOF')!.currency).toBe('XOF');
  });
});

describe('parseAmount — rejets et confiance', () => {
  it('rejette null / vide / texte pur', () => {
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
  });

  it('confiance abaissée pour la valeur 0', () => {
    const r = parseAmount('0');
    expect(r!.value).toBe(0);
    expect(r!.confidence).toBeLessThan(0.95);
  });

  it('confiance haute pour un montant bien formé', () => {
    expect(parseAmount('125 000')!.confidence).toBeGreaterThanOrEqual(0.9);
  });
});

describe('findAmounts', () => {
  it('trouve plusieurs clusters de montants dans du texte libre', () => {
    const hits = findAmounts('VIREMENT RECU 500 293 NOUVEAU SOLDE 74 158 089');
    expect(hits.length).toBe(2);
    expect(hits[0].raw).toBe('500 293');
    expect(hits[1].raw).toBe('74 158 089');
  });

  it('retourne les montants dans l\'ordre gauche-droite', () => {
    const hits = findAmounts('A 1 000 B 2 500,50');
    expect(hits.map((h) => h.raw)).toEqual(['1 000', '2 500,50']);
  });

  it('retourne un tableau vide quand il n\'y a aucun montant', () => {
    expect(findAmounts('LIBELLE SANS CHIFFRE')).toEqual([]);
  });
});

describe('looksLikeAmount', () => {
  it('vrai pour 2+ chiffres ou motif décimal', () => {
    expect(looksLikeAmount('5000')).toBe(true);
    expect(looksLikeAmount('5,00')).toBe(true);
  });

  it('faux pour un chiffre seul ou du texte', () => {
    expect(looksLikeAmount('5')).toBe(false);
    expect(looksLikeAmount('abc')).toBe(false);
    expect(looksLikeAmount('')).toBe(false);
  });
});
