/**
 * @module AtlasBanx
 * @file src/pages/legal/LegalPage.tsx
 * @description Page publique affichant les documents légaux d'AtlasBanx
 *              (CGU, Politique de confidentialité, Mentions légales, Cookies).
 *              Tirés dynamiquement depuis `atlasbanx.policy_versions`.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody, TabNav } from '../../components/ui';
import type { Tab } from '../../components/ui';
import { ConsentService, type PolicyVersion, type PolicyType } from '../../security';
import { CGV_PARTICULIER_VERSION, CGV_PARTICULIER_SECTIONS } from '../../billing/express/cgvParticulier';

// Onglet supplémentaire 'cgv' rendu depuis le texte embarqué (source unique
// partagée avec la barrière d'acceptation du parcours express particulier).
type LegalTab = PolicyType | 'cgv';

const POLICY_LABELS: Record<LegalTab, string> = {
  cgv: 'CGV (Particulier)',
  cgu: 'CGU',
  privacy: 'Confidentialité',
  legal: 'Mentions légales',
  cookies: 'Cookies',
};

export default function LegalPage() {
  const [policies, setPolicies] = useState<PolicyVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LegalTab>('cgv');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await ConsentService.getCurrentPolicies();
        if (cancelled) return;
        setPolicies(list);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tabs: Tab[] = (Object.keys(POLICY_LABELS) as LegalTab[]).map((key) => ({
    id: key,
    label: POLICY_LABELS[key],
  }));

  const current = policies.find((p) => p.policyType === activeTab);

  return (
    <div className="min-h-screen bg-primary-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'application
          </Link>
          <h1 className="font-display text-4xl text-primary-900 mt-4">Documents légaux</h1>
          <p className="text-sm text-primary-600 mt-2">
            AtlasBanx — Atlas Studio. Ces documents sont versionnés et horodatés.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Politiques en vigueur
            </CardTitle>
          </CardHeader>
          <CardBody>
            <TabNav
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={(id) => setActiveTab(id as LegalTab)}
            />

            <div className="mt-4">
              {activeTab === 'cgv' ? (
                <div>
                  <div className="text-xs text-primary-500 mb-4">
                    Version {CGV_PARTICULIER_VERSION} — Conditions Générales de Vente, Audit express (particuliers)
                  </div>
                  <div className="space-y-5">
                    {CGV_PARTICULIER_SECTIONS.map((s) => (
                      <div key={s.title}>
                        <h2 className="text-sm font-semibold text-primary-900">{s.title}</h2>
                        <div className="mt-1 space-y-1.5">
                          {s.body.map((p, i) => (
                            <p key={i} className="text-[13px] leading-relaxed text-primary-700">{p}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-primary-900 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : current ? (
                <div>
                  <div className="text-xs text-primary-500 mb-4">
                    Version {current.version} — publiée le{' '}
                    {current.publishedAt.toLocaleDateString('fr-FR')}
                  </div>
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap text-primary-800 leading-relaxed">
                    {current.content}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-primary-500">
                  Aucun document disponible pour cette section.
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
