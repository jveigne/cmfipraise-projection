'use client';

/**
 * Langue de l'interface. Le rendu statique est en français ; la langue mémorisée est
 * appliquée après l'hydratation (lire localStorage pendant le rendu casserait
 * l'hydratation : le HTML exporté est le même pour tous).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { dictionnaires, type NomModule, type Textes } from './dictionnaires';
import { LANGUE_PAR_DEFAUT, LANGUES, type Langue } from './outils';

const CLE_STOCKAGE = 'app_langue';

interface ValeurLangue {
  langue: Langue;
  changerLangue: (langue: Langue) => void;
}

const ContexteLangue = createContext<ValeurLangue>({ langue: LANGUE_PAR_DEFAUT, changerLangue: () => {} });

export function FournisseurLangue({ children }: { children: ReactNode }) {
  const [langue, setLangue] = useState<Langue>(LANGUE_PAR_DEFAUT);

  useEffect(() => {
    try {
      const memorisee = window.localStorage.getItem(CLE_STOCKAGE);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique après hydratation, voulue
      if (memorisee && (LANGUES as readonly string[]).includes(memorisee)) setLangue(memorisee as Langue);
    } catch {
      // Stockage refusé : on reste en français.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = langue;
  }, [langue]);

  const changerLangue = useCallback((nouvelle: Langue) => {
    setLangue(nouvelle);
    try {
      window.localStorage.setItem(CLE_STOCKAGE, nouvelle);
    } catch {
      // Sans stockage, le choix vaut pour la session.
    }
  }, []);

  const valeur = useMemo(() => ({ langue, changerLangue }), [langue, changerLangue]);
  return <ContexteLangue.Provider value={valeur}>{children}</ContexteLangue.Provider>;
}

export function useLangue(): ValeurLangue {
  return useContext(ContexteLangue);
}

/** Textes d'un module dans la langue courante. */
export function useT<M extends NomModule>(module: M): Textes<M> {
  const { langue } = useLangue();
  return dictionnaires[module][langue] as Textes<M>;
}
