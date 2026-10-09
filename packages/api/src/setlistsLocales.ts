/**
 * Setlists locales : celles d'un visiteur sans compte, et le brouillon de culte en cours.
 *
 * Une setlist de projection mêle chants ET passages bibliques ; celles du serveur ne
 * contiennent que des chants. Le modèle local est donc le plus riche des deux, et c'est lui
 * que la régie projette ; une setlist du serveur s'y convertit (voir depuisSetlistServeur).
 */
import { ouvrirCache } from './cache';
import type { SetlistDTO } from './types';

export interface ElementChant {
  type: 'chant';
  /** Identifiant de l'ÉLÉMENT (un même chant peut figurer deux fois). */
  id: string;
  chantId: string;
  titre: string;
  /** Titre du recueil d'origine, s'il est connu. */
  recueil?: string;
  numero?: number;
  langue?: string;
  /** Chant de l'autre langue projeté en dessous en mode bilingue. */
  chantSecondId?: string;
  /** Tonalité choisie pour ce culte (0–11), pour l'écran des musiciens. */
  tonalite?: number | null;
}

export interface ElementBible {
  type: 'bible';
  id: string;
  /** Référence telle que saisie puis normalisée, ex. « Jean 3:16-18 ». */
  reference: string;
  /** Identifiant de version, ex. « LSG ». */
  version: string;
  /** Seconde version côte à côte, ex. « KJV », ou null. */
  secondeVersion?: string | null;
}

export type ElementSetlist = ElementChant | ElementBible;

export interface SetlistLocale {
  id: string;
  nom: string;
  elements: ElementSetlist[];
  creeLe: number;
  modifieLe: number;
  /** Setlist du serveur dont celle-ci est la copie de travail, s'il y en a une. */
  idServeur?: string | null;
}

/** Identifiant aléatoire (crypto.randomUUID existe partout où l'app tourne). */
export function nouvelIdentifiant(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nouvelleSetlist(nom: string, elements: ElementSetlist[] = []): SetlistLocale {
  const maintenant = Date.now();
  return { id: nouvelIdentifiant(), nom, elements, creeLe: maintenant, modifieLe: maintenant, idServeur: null };
}

/** Convertit une setlist du serveur (chants seuls, ordonnés par position). */
export function depuisSetlistServeur(dto: SetlistDTO): SetlistLocale {
  const chants = [...(dto.songs ?? [])].sort((a, b) => a.position - b.position);
  const maintenant = Date.now();
  return {
    id: nouvelIdentifiant(),
    nom: dto.name,
    idServeur: dto.id,
    creeLe: maintenant,
    modifieLe: maintenant,
    elements: chants.map((c) => ({
      type: 'chant',
      id: nouvelIdentifiant(),
      chantId: c.id,
      titre: c.title,
      langue: c.language,
      tonalite: c.keyRootIndex ?? null,
    })),
  };
}

/** Setlists locales, la plus récemment modifiée d'abord. */
export async function listerSetlistsLocales(): Promise<SetlistLocale[]> {
  const db = await ouvrirCache();
  const toutes = await db.getAllFromIndex('setlistsLocales', 'parModification');
  return toutes.reverse();
}

export async function lireSetlistLocale(id: string): Promise<SetlistLocale | undefined> {
  return (await ouvrirCache()).get('setlistsLocales', id);
}

/** Enregistre (création ou mise à jour) et horodate la modification. */
export async function enregistrerSetlistLocale(setlist: SetlistLocale): Promise<SetlistLocale> {
  const aJour = { ...setlist, modifieLe: Date.now() };
  await (await ouvrirCache()).put('setlistsLocales', aJour);
  return aJour;
}

/** Suppression DÉFINITIVE d'une setlist locale. */
export async function supprimerSetlistLocale(id: string): Promise<void> {
  await (await ouvrirCache()).delete('setlistsLocales', id);
}
