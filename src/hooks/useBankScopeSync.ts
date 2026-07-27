import { useEffect } from 'react';
import { useBankStore } from '../store/bankStore';
import { useClientStore } from '../store/clientStore';
import { useAccountType } from './useAccountType';

/**
 * Aligne le périmètre des conditions particulières (bankStore) sur le contexte :
 *   - compte entreprise → périmètre 'self' (une seule entité) ;
 *   - compte cabinet    → id du client sélectionné, pour que les conditions
 *     négociées d'un client ne se mélangent pas avec celles des autres.
 *     Tant qu'aucun client n'est sélectionné : 'self' (bucket par défaut).
 */
export function useBankScopeSync(): void {
  const { isEnterprise } = useAccountType();
  const selectedClientId = useClientStore((s) => s.selectedClientId);
  const setActiveScope = useBankStore((s) => s.setActiveScope);

  useEffect(() => {
    const scope = isEnterprise ? 'self' : (selectedClientId ?? 'self');
    setActiveScope(scope);
  }, [isEnterprise, selectedClientId, setActiveScope]);
}
