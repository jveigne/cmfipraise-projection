/**
 * Configuration du processus principal : où trouver la web app, quelle origine elle a,
 * quel backend elle appelle.
 *
 * Deux modes seulement :
 *  - dev : `CMFI_URL_DEV` (posée par scripts/dev.mjs) → la régie charge `next dev`, pour garder
 *    le rechargement à chaud ;
 *  - export : la web app exportée (`apps/web/out`, copiée dans les ressources) servie par le
 *    protocole `app://cmfi`, comme une fois l'app installée.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';

import { app } from 'electron';

/** Injectées par esbuild au build (scripts/construire.mjs). */
declare const __API_RACINE__: string;
declare const __MISES_A_JOUR__: boolean;

export const SCHEMA = 'app';
export const HOTE = 'cmfi';
/** Origine de la web app embarquée : stable, donc IndexedDB et localStorage survivent aux mises à jour. */
export const ORIGINE_APP = `${SCHEMA}://${HOTE}`;

/** URL de `next dev`, ou null en mode export. N'est lue qu'hors paquet : l'app installée ignore la variable. */
export const URL_DEV: string | null = !app.isPackaged && process.env.CMFI_URL_DEV ? process.env.CMFI_URL_DEV.replace(/\/+$/, '') : null;

/**
 * Origine « schéma://hôte[:port] » d'une URL. Pas `URL.origin` : pour Node, un schéma non
 * spécial comme app: a une origine opaque (« null »), alors que Chromium, qui l'a déclaré
 * standard, lui donne bien « app://cmfi ». Comparer `.origin` refuserait toute la web app.
 */
export function origineDe(url: string | URL): string | null {
  try {
    const u = typeof url === 'string' ? new URL(url) : url;
    return u.host ? `${u.protocol}//${u.host}` : null;
  } catch {
    return null;
  }
}

/** Origine que les fenêtres ont réellement : celle de `next dev`, ou app://cmfi. */
export const ORIGINE_FENETRES = URL_DEV ? (origineDe(URL_DEV) ?? ORIGINE_APP) : ORIGINE_APP;

/** Racine du backend, la même que celle compilée dans la web app (NEXT_PUBLIC_API_RACINE). */
export const API_RACINE = (typeof __API_RACINE__ === 'string' ? __API_RACINE__ : 'https://cmfipraise-prod-production.up.railway.app').replace(/\/+$/, '');
export const ORIGINE_API = origineDe(API_RACINE) ?? API_RACINE;

/** Mises à jour automatiques : activées seulement dans un build signé (CMFI_MISES_A_JOUR=1 au build). */
export const MISES_A_JOUR_ACTIVES = typeof __MISES_A_JOUR__ === 'boolean' ? __MISES_A_JOUR__ : false;

/**
 * Relais du backend par le processus principal (voir relaisApi.ts). Actif par défaut tant que
 * le backend refuse l'origine app://cmfi ; `CMFI_RELAIS_API=0` le coupe pour vérifier le CORS.
 */
export const RELAIS_API_ACTIF = process.env.CMFI_RELAIS_API !== '0';

function premierExistant(...chemins: string[]): string {
  return chemins.find((c) => existsSync(c)) ?? chemins[0]!;
}

/**
 * Dossier de l'export statique. Installée : `resources/web`. Hors paquet : la copie faite par
 * construire.mjs (dist/web), sinon directement apps/web/out.
 */
export function dossierWeb(): string {
  if (app.isPackaged) return path.join(process.resourcesPath, 'web');
  return premierExistant(path.join(__dirname, 'web'), path.resolve(__dirname, '../../web/out'));
}

/** Instantané des données embarquées (recueils officiels, Bibles du domaine public). */
export function dossierDonnees(): string {
  if (app.isPackaged) return path.join(process.resourcesPath, 'donnees');
  return path.join(__dirname, 'donnees');
}

/** Résout une route de la web app (« /sortie/?x=1 ») vers l'URL que les fenêtres chargent. */
export function urlRoute(route: string): string {
  return `${ORIGINE_FENETRES}${route}`;
}
