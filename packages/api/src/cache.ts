/**
 * Cache hors-ligne en IndexedDB (lib idb).
 *
 * Pourquoi IndexedDB et pas localStorage : les quatre recueils pèsent ~2,7 Mo de JSON, et le
 * mobile a appris à ses dépens qu'un stockage clé-valeur plafonné finit par refuser
 * d'écrire SANS le dire (SQLITE_FULL sur Android). IndexedDB tient des centaines de Mo, et
 * stocke des objets structurés (et des Blob pour les fonds) sans sérialisation JSON.
 *
 * Le SCHÉMA ENTIER est déclaré ici, une fois, y compris les magasins que d'autres modules
 * rempliront plus tard (médias, bibles) : une montée de version IndexedDB concurrente entre
 * deux onglets bloque l'ouverture, on l'évite en ne changeant le schéma qu'ici.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

import type { CategorieDTO, ChantDTO, LangueContenu, SetlistDTO } from './types';
import type { SetlistLocale } from './setlistsLocales';

export const NOM_BASE = 'cmfi-projection';
export const VERSION_BASE = 1;

export interface RecueilEnCache {
  langue: LangueContenu;
  titre: string;
  /** Version serveur au moment du téléchargement. */
  version: number;
  chants: ChantDTO[];
  enregistreLe: number;
}

export interface ChantEnCache {
  id: string;
  chant: ChantDTO;
  enregistreLe: number;
}

export interface CategoriesEnCache {
  langue: LangueContenu;
  categories: CategorieDTO[];
  enregistreLe: number;
}

export interface SetlistServeurEnCache {
  id: string;
  setlist: SetlistDTO;
  enregistreLe: number;
}

/** Fichier ajouté par l'utilisateur (fond de projection, logo). */
export interface MediaEnCache {
  id: string;
  nom: string;
  type: string;
  blob: Blob;
  ajouteLe: number;
}

/** Un chapitre d'une version biblique importée (réservé à l'import complet). */
export interface ChapitreBibleEnCache {
  version: string;
  livre: string;
  chapitre: number;
  /** Versets dans l'ordre, index 0 = verset 1. */
  versets: string[];
}

export interface SchemaCache extends DBSchema {
  recueils: { key: [LangueContenu, string]; value: RecueilEnCache };
  chants: { key: string; value: ChantEnCache };
  categories: { key: LangueContenu; value: CategoriesEnCache };
  setlistsLocales: { key: string; value: SetlistLocale; indexes: { parModification: number } };
  setlistsServeur: { key: string; value: SetlistServeurEnCache };
  /** Réglages, favoris, écran de sortie retenu… : petites valeurs par clé. */
  preferences: { key: string; value: unknown };
  medias: { key: string; value: MediaEnCache };
  bibles: { key: [string, string, number]; value: ChapitreBibleEnCache };
}

export type BaseCache = IDBPDatabase<SchemaCache>;

let ouverture: Promise<BaseCache> | null = null;

/** Vrai si IndexedDB existe ici (faux pendant le rendu statique et dans Node sans polyfill). */
export function cacheDisponible(): boolean {
  return typeof indexedDB !== 'undefined';
}

/** Ouvre (une seule fois) la base du cache. */
export function ouvrirCache(): Promise<BaseCache> {
  if (!cacheDisponible()) {
    return Promise.reject(new Error('IndexedDB indisponible dans cet environnement'));
  }
  if (!ouverture) {
    ouverture = openDB<SchemaCache>(NOM_BASE, VERSION_BASE, {
      upgrade(db) {
        // Version 1 : tout le schéma. Une version suivante ajoutera ses magasins sous un
        // `if (ancienneVersion < 2)`, sans toucher à ceux-ci.
        db.createObjectStore('recueils', { keyPath: ['langue', 'titre'] });
        db.createObjectStore('chants', { keyPath: 'id' });
        db.createObjectStore('categories', { keyPath: 'langue' });
        const locales = db.createObjectStore('setlistsLocales', { keyPath: 'id' });
        locales.createIndex('parModification', 'modifieLe');
        db.createObjectStore('setlistsServeur', { keyPath: 'id' });
        db.createObjectStore('preferences');
        db.createObjectStore('medias', { keyPath: 'id' });
        db.createObjectStore('bibles', { keyPath: ['version', 'livre', 'chapitre'] });
      },
      blocking() {
        // Un autre onglet ouvre une version plus récente : on lui cède la place.
        void ouverture?.then((db) => db.close());
        ouverture = null;
      },
    });
    ouverture.catch(() => {
      ouverture = null;
    });
  }
  return ouverture;
}

/** Ferme la base (tests, changement de compte). */
export async function fermerCache(): Promise<void> {
  if (!ouverture) return;
  const db = await ouverture.catch(() => null);
  db?.close();
  ouverture = null;
}

// ─── Recueils ────────────────────────────────────────────────────────────────

export async function lireRecueil(langue: LangueContenu, titre: string): Promise<RecueilEnCache | undefined> {
  return (await ouvrirCache()).get('recueils', [langue, titre]);
}

export async function listerRecueilsEnCache(langue?: LangueContenu): Promise<RecueilEnCache[]> {
  const tous = await (await ouvrirCache()).getAll('recueils');
  return langue ? tous.filter((r) => r.langue === langue) : tous;
}

export async function enregistrerRecueil(recueil: Omit<RecueilEnCache, 'enregistreLe'>): Promise<void> {
  await (await ouvrirCache()).put('recueils', { ...recueil, enregistreLe: Date.now() });
}

// ─── Chants isolés ───────────────────────────────────────────────────────────

/**
 * Cherche un chant par identifiant : d'abord parmi les chants ouverts isolément, puis dans
 * les recueils téléchargés (un chant de catégorie est souvent aussi dans un recueil).
 */
export async function lireChant(id: string): Promise<ChantDTO | undefined> {
  const db = await ouvrirCache();
  const isole = await db.get('chants', id);
  if (isole) return isole.chant;
  for (const recueil of await db.getAll('recueils')) {
    const trouve = recueil.chants.find((c) => c.id === id);
    if (trouve) return trouve;
  }
  return undefined;
}

export async function enregistrerChant(chant: ChantDTO): Promise<void> {
  await (await ouvrirCache()).put('chants', { id: chant.id, chant, enregistreLe: Date.now() });
}

// ─── Catégories ──────────────────────────────────────────────────────────────

export async function lireCategories(langue: LangueContenu): Promise<CategorieDTO[] | undefined> {
  return (await (await ouvrirCache()).get('categories', langue))?.categories;
}

export async function enregistrerCategories(langue: LangueContenu, categories: CategorieDTO[]): Promise<void> {
  await (await ouvrirCache()).put('categories', { langue, categories, enregistreLe: Date.now() });
}

// ─── Setlists du serveur (copie hors-ligne) ──────────────────────────────────

export async function lireSetlistServeur(id: string): Promise<SetlistDTO | undefined> {
  return (await (await ouvrirCache()).get('setlistsServeur', id))?.setlist;
}

export async function enregistrerSetlistServeur(setlist: SetlistDTO): Promise<void> {
  await (await ouvrirCache()).put('setlistsServeur', { id: setlist.id, setlist, enregistreLe: Date.now() });
}

// ─── Préférences ─────────────────────────────────────────────────────────────

export async function lirePreference<T>(cle: string): Promise<T | undefined> {
  return (await (await ouvrirCache()).get('preferences', cle)) as T | undefined;
}

export async function ecrirePreference<T>(cle: string, valeur: T): Promise<void> {
  await (await ouvrirCache()).put('preferences', valeur, cle);
}

export async function effacerPreference(cle: string): Promise<void> {
  await (await ouvrirCache()).delete('preferences', cle);
}

// ─── Médias ──────────────────────────────────────────────────────────────────

export async function lireMedia(id: string): Promise<MediaEnCache | undefined> {
  return (await ouvrirCache()).get('medias', id);
}

export async function enregistrerMedia(media: MediaEnCache): Promise<void> {
  await (await ouvrirCache()).put('medias', media);
}

export async function supprimerMedia(id: string): Promise<void> {
  await (await ouvrirCache()).delete('medias', id);
}

export async function listerMedias(): Promise<MediaEnCache[]> {
  return (await ouvrirCache()).getAll('medias');
}
