'use client';

/**
 * Où en est ce téléphone : salle connue (adresse du QR ou saisie), prénom, tentative.
 * Une télécommande déjà acceptée qui recharge sa page rejoint seule la même salle.
 */
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useTelephone, type Telephone } from '@/lib/reseau/distant';
import { normaliserCodeSalle, type RoleDistant } from '@/lib/reseau/transport';

import { ecrireLocal, lireLocal } from './communs';

const CLE_NOM = 'app_telephone_nom';
const cleRejoint = (role: RoleDistant, salle: string) => `app_distant_rejoint_${role}_${salle}`;

function lireSession(cle: string): string | null {
  try {
    return window.sessionStorage.getItem(cle);
  } catch {
    return null;
  }
}

function ecrireSession(cle: string, valeur: string | null) {
  try {
    if (valeur === null) window.sessionStorage.removeItem(cle);
    else window.sessionStorage.setItem(cle, valeur);
  } catch {
    // Sans stockage de session, un rechargement redemande simplement à rejoindre.
  }
}

export interface SessionTelephone extends Telephone {
  /** Code lu dans l'adresse (?salle=), normalisé, ou null. */
  codeAdresse: string | null;
  /** Vrai une fois la demande de liaison faite. */
  rejoint: boolean;
  nomInitial: string;
  rejoindre(codeSalle: string, nom: string): void;
  redemander(): void;
  changerSalle(): void;
}

export function useSessionTelephone(role: RoleDistant): SessionTelephone {
  const parametres = useSearchParams();
  const router = useRouter();
  // Barre finale (trailingSlash) : l'export statique ne sert que /telecommande/.
  const chemin = usePathname().replace(/\/?$/, '/');
  const codeAdresse = normaliserCodeSalle(parametres.get('salle') ?? '');

  const [demande, setDemande] = useState<{ codeSalle: string; nom: string } | null>(null);
  const [tentative, setTentative] = useState(0);
  const [nomInitial, setNomInitial] = useState('');

  // Après hydratation : prénom retenu, et reprise d'une liaison déjà établie.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture du stockage après hydratation, voulue
    setNomInitial(lireLocal(CLE_NOM) ?? '');
    if (!codeAdresse) return;
    const deja = lireSession(cleRejoint(role, codeAdresse));
    // L'assemblée n'a rien à demander : l'adresse du QR suffit.
    if (deja !== null || role === 'assemblee') setDemande({ codeSalle: codeAdresse, nom: deja ?? '' });
  }, [codeAdresse, role]);

  const telephone = useTelephone(demande ? { ...demande, role, tentative } : null);

  const rejoindre = useCallback(
    (codeSalle: string, nom: string) => {
      if (nom) ecrireLocal(CLE_NOM, nom);
      ecrireSession(cleRejoint(role, codeSalle), nom);
      setDemande({ codeSalle, nom });
      if (codeSalle !== codeAdresse) router.replace(`${chemin}?salle=${codeSalle}`);
    },
    [role, codeAdresse, router, chemin]
  );

  const redemander = useCallback(() => setTentative((n) => n + 1), []);

  const changerSalle = useCallback(() => {
    if (demande) ecrireSession(cleRejoint(role, demande.codeSalle), null);
    setDemande(null);
    router.replace(chemin);
  }, [demande, role, router, chemin]);

  return { ...telephone, codeAdresse, rejoint: demande !== null, nomInitial, rejoindre, redemander, changerSalle };
}
