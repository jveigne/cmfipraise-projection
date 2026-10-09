'use client';

/**
 * Petit magasin observable, lu par useSyncExternalStore.
 *
 * Pourquoi un magasin de module plutôt qu'un état React : /chants/ et /chants/lecture/ sont
 * deux routes, donc deux arbres React. Les recueils (quelques Mo) et les filtres choisis
 * doivent survivre au passage de l'une à l'autre sans être relus ni réinitialisés.
 */
import { useSyncExternalStore } from 'react';

export interface Magasin<T> {
  lire(): T;
  ecrire(valeur: T | ((precedente: T) => T)): void;
  abonner(ecouteur: () => void): () => void;
  /** Valeur du rendu statique : toujours l'initiale, pour une hydratation sans écart. */
  initiale: T;
}

export function creerMagasin<T>(initiale: T): Magasin<T> {
  let valeur = initiale;
  const ecouteurs = new Set<() => void>();
  return {
    initiale,
    lire: () => valeur,
    ecrire(nouvelle) {
      const suivante = typeof nouvelle === 'function' ? (nouvelle as (p: T) => T)(valeur) : nouvelle;
      if (Object.is(suivante, valeur)) return;
      valeur = suivante;
      ecouteurs.forEach((e) => e());
    },
    abonner(ecouteur) {
      ecouteurs.add(ecouteur);
      return () => ecouteurs.delete(ecouteur);
    },
  };
}

export function useMagasin<T>(magasin: Magasin<T>): T {
  return useSyncExternalStore(magasin.abonner, magasin.lire, () => magasin.initiale);
}
