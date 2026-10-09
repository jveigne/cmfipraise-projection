'use client';

/**
 * Session : visiteur (par défaut, sans rien demander) ou compte.
 *
 * Le visiteur n'est pas anonyme pour le serveur : il porte un jeton visiteur, obtenu à la
 * première requête par le client d'API. Le compte n'est demandé que pour ce que
 * l'utilisateur crée ou partage (setlists du serveur) : `exigerCompte()` le dit.
 */
import type { UtilisateurDTO } from '@cmfi/api';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { obtenirClientApi, surExpirationSession } from '@/lib/api';

export type StatutSession = 'chargement' | 'visiteur' | 'compte';

export interface ValeurSession {
  statut: StatutSession;
  utilisateur: UtilisateurDTO | null;
  estConnecte: boolean;
  /** Vrai après un JWT refusé, jusqu'à la prochaine connexion : l'interface peut le dire. */
  sessionExpiree: boolean;
  seConnecter: (email: string, motDePasse: string) => Promise<void>;
  seDeconnecter: () => void;
}

const ContexteSession = createContext<ValeurSession | null>(null);

export function FournisseurSession({ children }: { children: ReactNode }) {
  const [statut, setStatut] = useState<StatutSession>('chargement');
  const [utilisateur, setUtilisateur] = useState<UtilisateurDTO | null>(null);
  const [sessionExpiree, setSessionExpiree] = useState(false);

  useEffect(() => {
    const api = obtenirClientApi();
    // Lecture du stockage après hydratation : le HTML exporté ne connaît aucune session.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronisation unique avec localStorage
    setUtilisateur(api.utilisateur);
    setStatut(api.estConnecte ? 'compte' : 'visiteur');
    return surExpirationSession(() => {
      setUtilisateur(null);
      setStatut('visiteur');
      setSessionExpiree(true);
    });
  }, []);

  const seConnecter = useCallback(async (email: string, motDePasse: string) => {
    const reponse = await obtenirClientApi().connexion(email, motDePasse);
    setUtilisateur(reponse.user);
    setStatut('compte');
    setSessionExpiree(false);
  }, []);

  const seDeconnecter = useCallback(() => {
    obtenirClientApi().deconnexion();
    setUtilisateur(null);
    setStatut('visiteur');
  }, []);

  const valeur = useMemo<ValeurSession>(
    () => ({ statut, utilisateur, estConnecte: statut === 'compte', sessionExpiree, seConnecter, seDeconnecter }),
    [statut, utilisateur, sessionExpiree, seConnecter, seDeconnecter]
  );

  return <ContexteSession.Provider value={valeur}>{children}</ContexteSession.Provider>;
}

export function useSession(): ValeurSession {
  const valeur = useContext(ContexteSession);
  if (!valeur) throw new Error('useSession() hors de <FournisseurSession>');
  return valeur;
}
