/**
 * Point d'entrée : `obtenirPlateforme()` choisit l'implémentation une fois pour toutes.
 * La web app n'importe que d'ici ; elle ne lit jamais `window.cmfi` elle-même.
 */
import { creerPlateformeBureau } from './bureau';
import { VERSION_CONTRAT } from './contrat';
import type { Plateforme } from './types';
import { creerPlateformeWeb } from './web';

export * from './types';
export { VERSION_CONTRAT, CANAUX_IPC } from './contrat';
export type { ApiBureau, EcranBureau, OptionsOuvertureBureau, CanalIpc } from './contrat';
export { creerPlateformeWeb } from './web';
export { creerPlateformeBureau } from './bureau';

let instance: Plateforme | null = null;

/** Vrai si la page tourne dans l'app de bureau. Sûr pendant le rendu statique (faux). */
export function estBureau(): boolean {
  return typeof window !== 'undefined' && !!window.cmfi;
}

/**
 * La plateforme courante. Pendant le rendu statique (pas de window), renvoie une
 * implémentation web inerte, NON mémorisée : le vrai choix se fait côté client.
 */
export function obtenirPlateforme(): Plateforme {
  if (typeof window === 'undefined') return creerPlateformeWeb();
  if (!instance) {
    const cmfi = window.cmfi;
    if (cmfi && cmfi.versionContrat !== VERSION_CONTRAT) {
      console.warn(`[plateforme] contrat bureau v${cmfi.versionContrat}, attendu v${VERSION_CONTRAT}`);
    }
    instance = cmfi ? creerPlateformeBureau(cmfi) : creerPlateformeWeb();
  }
  return instance;
}
