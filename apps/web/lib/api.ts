/**
 * Client de l'API partagé par toute l'app (un seul, pour une seule demande de jeton
 * visiteur à la fois). La racine du serveur peut être changée au build par
 * NEXT_PUBLIC_API_RACINE (ex. un backend local) ; production par défaut.
 *
 * Chaque requête renseigne l'état du réseau (lib/reseau/etat) : c'est ici, et non dans
 * chaque écran, qu'on sait si le serveur répond. Le bandeau `IndicateurReseau` en découle.
 */
import { CONFIG_PRODUCTION, ClientApi, ErreurApi, configDepuisRacine, stockageNavigateur } from '@cmfi/api';

import { signalerEchecApi, signalerReussiteApi } from './reseau/etat';

const racine = process.env.NEXT_PUBLIC_API_RACINE;
const config = racine ? configDepuisRacine(racine) : CONFIG_PRODUCTION;

const ecouteursExpiration = new Set<() => void>();

let client: ClientApi | null = null;

function cheminDe(entree: Parameters<typeof fetch>[0]): string {
  const url = typeof entree === 'string' ? entree : entree instanceof URL ? entree.href : entree.url;
  return url.replace(config.urlRacine, '');
}

/** `fetch` qui note au passage si le serveur répond (une réponse 4xx est une réponse). */
const fetchObserve: typeof fetch = async (entree, init) => {
  try {
    const reponse = await globalThis.fetch(entree, init);
    if (reponse.status >= 500) {
      signalerEchecApi(new ErreurApi(`HTTP ${reponse.status}`, { status: reponse.status, chemin: cheminDe(entree) }));
    } else {
      signalerReussiteApi();
    }
    return reponse;
  } catch (e) {
    if (!(e instanceof DOMException && e.name === 'AbortError')) {
      signalerEchecApi(new ErreurApi('Réseau indisponible', { chemin: cheminDe(entree), reseau: true, cause: e }));
    }
    throw e;
  }
};

export function obtenirClientApi(): ClientApi {
  if (!client) {
    client = new ClientApi(config, {
      stockage: stockageNavigateur(),
      fetch: fetchObserve,
      surSessionExpiree: () => ecouteursExpiration.forEach((e) => e()),
    });
  }
  return client;
}

/** Prévenu quand le JWT du compte est refusé par le serveur. */
export function surExpirationSession(ecouteur: () => void): () => void {
  ecouteursExpiration.add(ecouteur);
  return () => ecouteursExpiration.delete(ecouteur);
}
