import { describe, it, expect } from 'vitest';
import { toTaxonomyCode, REGISTRY_TO_TAXONOMY } from '../registryToTaxonomy';
import { RUBRICS_TAXONOMY } from '../../../cdc/taxonomy/rubrics';

const TAXONOMY_CODES = new Set(RUBRICS_TAXONOMY.map((r) => r.code));

describe('toTaxonomyCode', () => {
  it('traduit les postes structurés par l\'audit (compte / découverts)', () => {
    expect(toTaxonomyCode('accountFees.tenueCompte.particulier')).toBe('compte.tenue_mensuelle');
    expect(toTaxonomyCode('accountFees.fraisOuverture')).toBe('compte.ouverture');
    expect(toTaxonomyCode('creditFees.tauxDecouvertAutorise')).toBe('decouverts.taux_autorise');
    expect(toTaxonomyCode('creditFees.tauxDecouvertNonAutorise')).toBe('decouverts.taux_non_autorise');
  });

  it('dérive un code depuis une clé custom (custom:cat:slug → cat.slug)', () => {
    expect(toTaxonomyCode('custom:compte:frais-speciaux')).toBe('compte.frais_speciaux');
  });

  it('laisse passer une clé inconnue telle quelle (ligne de frais générique)', () => {
    expect(toTaxonomyCode('accountFees.tenueCompte.compteEpargne'))
      .toBe('accountFees.tenueCompte.compteEpargne');
  });

  it('toutes les cibles du mapping sont de VRAIS codes taxonomie (anti-typo)', () => {
    for (const [key, code] of Object.entries(REGISTRY_TO_TAXONOMY)) {
      expect(TAXONOMY_CODES.has(code), `${key} → ${code} inexistant dans la taxonomie`).toBe(true);
    }
  });

  it('aucune collision : deux clés ne pointent pas sur le même code taxonomie', () => {
    const values = Object.values(REGISTRY_TO_TAXONOMY);
    expect(new Set(values).size).toBe(values.length);
  });
});
