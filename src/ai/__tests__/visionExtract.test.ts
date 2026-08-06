import { describe, it, expect } from 'vitest';
import { parseVisionPairs } from '../visionExtract';

describe('parseVisionPairs', () => {
  it('parse un tableau JSON de lignes tarifaires', () => {
    const p = parseVisionPairs(
      '[{"label":"Tenue de compte","value":5000,"unit":"FCFA","qualitative":null},' +
      '{"label":"Commission mouvement","value":0.25,"unit":"%","qualitative":null},' +
      '{"label":"Ouverture de compte","value":0,"unit":null,"qualitative":"gratuit"}]',
    );
    expect(p).toHaveLength(3);
    expect(p[0]).toMatchObject({ label: 'Tenue de compte', value: 5000, unit: 'FCFA' });
    expect(p[1]).toMatchObject({ value: 0.25, unit: '%' });
    expect(p[2]).toMatchObject({ value: 0, qualitative: 'gratuit' });
  });

  it('extrait le JSON même entouré de texte / fences', () => {
    const p = parseVisionPairs('Voici les lignes :\n```json\n[{"label":"RIB","value":2000,"unit":"FCFA"}]\n```\nVoilà.');
    expect(p).toHaveLength(1);
    expect(p[0].label).toBe('RIB');
    expect(p[0].value).toBe(2000);
  });

  it('nettoie une valeur textuelle et ignore les libellés vides', () => {
    const p = parseVisionPairs('[{"label":"Frais","value":"1 500 FCFA","unit":"FCFA"},{"label":"","value":10}]');
    expect(p).toHaveLength(1);
    expect(p[0].value).toBe(1500);
  });

  it('ignore le bloc <think> des modèles thinking (qwen)', () => {
    const p = parseVisionPairs('<think>Je vois un tableau [avec des crochets]. Analysons…</think>\n[{"label":"Carte Visa","value":25000,"unit":"FCFA"}]');
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ label: 'Carte Visa', value: 25000 });
  });

  it('renvoie [] sur une réponse invalide', () => {
    expect(parseVisionPairs('désolé, aucune donnée')).toEqual([]);
    expect(parseVisionPairs('')).toEqual([]);
    expect(parseVisionPairs('{"not":"an array"}')).toEqual([]);
  });
});
