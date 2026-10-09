/**
 * Adresses de l'API. Mêmes valeurs que le mobile (cmfipraise-app/app.json, expo.extra) :
 * un seul backend Railway, partagé avec Shephr.
 *
 * Le paquet ne lit aucune variable d'environnement : c'est l'application qui passe sa
 * configuration au client (voir apps/web/lib/api.ts). Ainsi le même code tourne sous
 * Next, sous Electron et dans les tests sans dépendre de `process`.
 */
export interface ConfigApi {
  /** Racine des routes de l'app (contient déjà `/api/cmfipraise`). */
  urlApi: string;
  /** Racine du serveur : sert au jeton visiteur (`/private/generate-token`). */
  urlRacine: string;
}

export const CONFIG_PRODUCTION: ConfigApi = {
  // urlApi: 'https://cmfipraise-prod-production.up.railway.app/api/cmfipraise',
  // urlRacine: 'https://cmfipraise-prod-production.up.railway.app',
  urlApi: 'https://cmfipraise-prod-production.up.railway.app/api/cmfipraise',
  urlRacine: 'https://cmfipraise-prod-production.up.railway.app',
};

/** Construit une configuration à partir de la seule racine du serveur. */
export function configDepuisRacine(urlRacine: string): ConfigApi {
  const racine = urlRacine.replace(/\/+$/, '');
  return { urlRacine: racine, urlApi: `${racine}/api/cmfipraise` };
}
