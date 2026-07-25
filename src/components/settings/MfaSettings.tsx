/**
 * @module AtlasBanx
 * @file src/components/settings/MfaSettings.tsx
 * @description Section "Sécurité / MFA" — enrôlement d'un facteur TOTP,
 *              vérification du code à 6 chiffres, liste des facteurs vérifiés
 *              et désenrôlement. S'appuie sur le hook `useMfa` (wrapper
 *              `supabase.auth.mfa.*`). Interface en français, composants ui/.
 */

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Shield, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Input,
} from '../ui';
import { useMfa, type MfaEnrollResult, type MfaTotpFactor } from '../../hooks/useMfa';

interface MfaSettingsProps {
  /** Appelé après tout changement de facteur (vérification / désenrôlement). */
  onFactorsChange?: () => void;
}

export function MfaSettings({ onFactorsChange }: MfaSettingsProps) {
  const { isAvailable, listFactors, enrollTotp, verifyEnrollment, unenroll } = useMfa();

  const [factors, setFactors] = useState<MfaTotpFactor[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [enrollment, setEnrollment] = useState<MfaEnrollResult | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setFactors(await listFactors());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement des facteurs MFA.');
    } finally {
      setLoading(false);
    }
  }, [listFactors]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const hasVerifiedFactor = factors.some((f) => f.status === 'verified');

  const handleEnroll = async () => {
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      setEnrollment(await enrollTotp());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrôlement impossible.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    if (!enrollment || code.length !== 6) return;
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      await verifyEnrollment(enrollment.factorId, code.trim());
      setSuccess('Authentification à deux facteurs activée avec succès.');
      setEnrollment(null);
      setCode('');
      await refresh();
      onFactorsChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code invalide.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancelEnroll = () => {
    setEnrollment(null);
    setCode('');
    setError(null);
  };

  const handleUnenroll = async (factorId: string) => {
    if (!window.confirm("Désactiver l'authentification à deux facteurs ?")) return;
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      await unenroll(factorId);
      setSuccess('Facteur MFA désactivé.');
      await refresh();
      onFactorsChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Désenrôlement impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Authentification à deux facteurs (MFA)
        </CardTitle>
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          <p className="text-sm text-primary-600">
            Ajoutez une couche de sécurité en exigeant un code à usage unique
            généré par votre application d'authentification. Obligatoire pour les
            comptes de cabinet.
          </p>

          {!isAvailable && (
            <Alert variant="warning" title="Service indisponible">
              Le backend d'authentification n'est pas configuré. La MFA ne peut
              pas être activée pour le moment.
            </Alert>
          )}
          {error && <Alert variant="error" title="Erreur">{error}</Alert>}
          {success && <Alert variant="success" title="Succès">{success}</Alert>}

          {/* Statut courant */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-primary-50 border border-primary-200">
            <div className="flex items-center gap-2">
              {hasVerifiedFactor ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                  <span className="font-medium">MFA activé</span>
                  <Badge variant="success">Vérifié</Badge>
                </>
              ) : (
                <>
                  <ShieldOff className="w-5 h-5 text-primary-500" />
                  <span className="font-medium">MFA non activé</span>
                </>
              )}
            </div>
            <Button variant="secondary" size="sm" onClick={refresh} disabled={loading || busy}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Facteurs enregistrés */}
          {factors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-primary-800">Facteurs enregistrés</h4>
              {factors.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-primary-200"
                >
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-4 h-4 text-primary-500" />
                    <div>
                      <div className="text-sm font-medium">{f.friendlyName}</div>
                      <div className="text-xs text-primary-500">
                        Créé le {new Date(f.createdAt).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={f.status === 'verified' ? 'success' : 'warning'}>
                      {f.status === 'verified' ? 'Vérifié' : 'En attente'}
                    </Badge>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleUnenroll(f.id)}
                      disabled={busy}
                    >
                      Retirer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Flow d'enrôlement */}
          {enrollment ? (
            <div className="space-y-4 p-4 border border-primary-300 rounded-lg bg-white">
              <h4 className="text-sm font-semibold text-primary-900">
                Étape 1 — Scannez le QR code
              </h4>
              <p className="text-xs text-primary-500">
                Ouvrez votre application d'authentification (Google Authenticator,
                Authy, 1Password…) et scannez le code ci-dessous.
              </p>
              <div
                className="flex justify-center bg-white p-4 rounded border border-primary-200 [&_svg]:h-48 [&_svg]:w-48"
                // Supabase renvoie le QR code sous forme de SVG — rendu direct.
                dangerouslySetInnerHTML={{ __html: enrollment.qrCodeSvg }}
              />
              <div className="text-xs text-primary-500">
                Ou saisissez manuellement ce secret :
                <code className="block mt-1 p-2 bg-primary-50 rounded font-mono break-all">
                  {enrollment.secret}
                </code>
              </div>

              <h4 className="text-sm font-semibold text-primary-900 pt-2">
                Étape 2 — Entrez le code à 6 chiffres
              </h4>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="tracking-widest text-center text-lg font-mono"
              />
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={handleVerify}
                  disabled={code.length !== 6 || busy}
                >
                  Vérifier et activer
                </Button>
                <Button variant="secondary" onClick={handleCancelEnroll} disabled={busy}>
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            !hasVerifiedFactor && (
              <Button variant="primary" onClick={handleEnroll} disabled={!isAvailable || busy}>
                <Shield className="w-4 h-4 mr-2" />
                Activer l'authentification à deux facteurs
              </Button>
            )
          )}
        </div>
      </CardBody>
    </Card>
  );
}
