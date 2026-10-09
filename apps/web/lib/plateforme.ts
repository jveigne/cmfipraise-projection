'use client';

/**
 * Accès React à la plateforme (web ou bureau). Le choix dépend de `window` : il se fait
 * après l'hydratation, d'où `type` à « web » pendant le rendu statique puis la vraie valeur.
 */
import { obtenirPlateforme, type Plateforme } from '@cmfi/plateforme';
import { useSyncExternalStore } from 'react';

const rien = () => () => {};

/** La plateforme courante (implémentation web inerte pendant le rendu statique). */
export function usePlateforme(): Plateforme {
  return useSyncExternalStore(rien, obtenirPlateforme, obtenirPlateforme);
}

/** Vrai dans l'app de bureau, une fois hydraté. */
export function useEstBureau(): boolean {
  return useSyncExternalStore(
    rien,
    () => obtenirPlateforme().estBureau(),
    () => false
  );
}
