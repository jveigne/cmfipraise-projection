'use client';

/**
 * État du réseau vu par l'interface : en ligne, hors-ligne, ou en erreur.
 *
 * `navigator.onLine` ne sait dire qu'une chose de façon fiable : la machine n'a plus de
 * réseau. Il ne sait pas que le serveur ne répond pas (panne, CORS, Wi-Fi captif). Les
 * écrans qui appellent l'API signalent donc leurs échecs et leurs réussites ici
 * (`signalerEchecApi`, `signalerReussiteApi`) ; un échec réseau alors que le navigateur se
 * croit en ligne devient l'état « erreur ».
 *
 * Aucun de ces états n'est une alerte : la projection, elle, ne dépend jamais du réseau.
 */
import { estErreurApi } from '@cmfi/api';
import { useSyncExternalStore } from 'react';

export type EtatReseau = 'en-ligne' | 'hors-ligne' | 'erreur';

export interface ErreurReseau {
  message: string;
  /** Chemin de l'API qui a échoué, pour le journal. */
  chemin?: string;
  /** Horodatage (ms). */
  a: number;
}

export interface InstantaneReseau {
  etat: EtatReseau;
  /** Vrai si le navigateur se croit en ligne. */
  enLigne: boolean;
  /** Début de la coupure en cours (ms), null en ligne. */
  coupureA: number | null;
  /** Dernier échec signalé tant qu'aucune réussite ne l'a effacé. */
  erreur: ErreurReseau | null;
}

const EN_LIGNE: InstantaneReseau = { etat: 'en-ligne', enLigne: true, coupureA: null, erreur: null };

let instantane: InstantaneReseau = EN_LIGNE;
let erreurCourante: ErreurReseau | null = null;
let coupureA: number | null = null;
let ecouteNavigateur = false;
const abonnes = new Set<() => void>();

function navigateurEnLigne(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

function recalculer() {
  const enLigne = navigateurEnLigne();
  if (!enLigne && coupureA === null) coupureA = Date.now();
  if (enLigne) coupureA = null;
  const etat: EtatReseau = !enLigne ? 'hors-ligne' : erreurCourante ? 'erreur' : 'en-ligne';
  // Nouvel objet seulement si quelque chose change : useSyncExternalStore compare par identité.
  if (
    instantane.etat !== etat ||
    instantane.enLigne !== enLigne ||
    instantane.coupureA !== coupureA ||
    instantane.erreur !== erreurCourante
  ) {
    instantane = { etat, enLigne, coupureA, erreur: erreurCourante };
    abonnes.forEach((a) => a());
  }
}

function auChangementNavigateur() {
  // Le retour du réseau ne prouve pas que le serveur répond, mais l'erreur d'avant la
  // coupure n'a plus de sens : on repart propre, le prochain appel tranchera.
  if (navigateurEnLigne()) erreurCourante = null;
  recalculer();
}

function sAbonner(rappel: () => void): () => void {
  abonnes.add(rappel);
  if (!ecouteNavigateur && typeof window !== 'undefined') {
    ecouteNavigateur = true;
    window.addEventListener('online', auChangementNavigateur);
    window.addEventListener('offline', auChangementNavigateur);
    recalculer();
  }
  return () => {
    abonnes.delete(rappel);
    if (abonnes.size === 0 && ecouteNavigateur) {
      ecouteNavigateur = false;
      window.removeEventListener('online', auChangementNavigateur);
      window.removeEventListener('offline', auChangementNavigateur);
    }
  };
}

/**
 * À appeler dans le `catch` d'un appel à l'API. Seuls les échecs qui disent quelque chose du
 * réseau comptent : réseau injoignable, ou serveur en panne (5xx). Un refus (401/403) ou un
 * 404 est une réponse, pas une panne.
 */
export function signalerEchecApi(erreur: unknown): void {
  if (estErreurApi(erreur)) {
    const panne = erreur.reseau || (erreur.status !== undefined && erreur.status >= 500);
    if (!panne) return;
    erreurCourante = { message: erreur.message, chemin: erreur.chemin, a: Date.now() };
  } else if (erreur instanceof TypeError) {
    // fetch rejette un TypeError quand la requête n'a pas pu partir.
    erreurCourante = { message: erreur.message, a: Date.now() };
  } else {
    return;
  }
  recalculer();
}

/** À appeler après un appel réussi : efface l'état « erreur ». */
export function signalerReussiteApi(): void {
  if (!erreurCourante) return;
  erreurCourante = null;
  recalculer();
}

/** Lecture hors React (journal, tests). */
export function lireEtatReseau(): InstantaneReseau {
  recalculer();
  return instantane;
}

/** État du réseau ; « en ligne » pendant le rendu statique. */
export function useReseau(): InstantaneReseau {
  return useSyncExternalStore(
    sAbonner,
    () => instantane,
    () => EN_LIGNE
  );
}

/** Pour les tests : revenir à l'état initial. */
export function reinitialiserEtatReseau(): void {
  erreurCourante = null;
  coupureA = null;
  instantane = EN_LIGNE;
  recalculer();
}

/**
 * Vrai si le navigateur se croit en ligne (vrai pendant le rendu statique). Pour les écrans
 * qui n'ont besoin que de savoir s'il est utile de tenter le serveur.
 */
export function useEnLigne(): boolean {
  return useReseau().enLigne;
}
