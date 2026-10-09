'use client';

/**
 * Réglages de projection, persistés sur l'appareil (localStorage `app_reglages`).
 *
 * localStorage plutôt qu'IndexedDB : quelques centaines d'octets, lus de façon synchrone au
 * premier rendu de la régie, et l'évènement `storage` prévient les AUTRES fenêtres (sortie,
 * musiciens) d'un changement sans rien ajouter au canal de projection. La photo de fond,
 * elle, est un Blob : elle va dans le magasin `medias` d'IndexedDB (@cmfi/api), et seul son
 * id est retenu ici.
 *
 * Pour la régie : `themeSortieDepuisReglages(r)` donne le `Partial<ThemeSortie>` à passer à
 * l'action `appliquerTheme`. La régie s'abonne à `useReglages()` : un réglage changé dans
 * une autre fenêtre lui parvient par l'évènement `storage`, puis à la sortie par le canal.
 */
import type { IdVersion, Notation, ThemeSortie } from '@cmfi/projection';
import { useCallback, useSyncExternalStore } from 'react';

export type ThemeReglage = 'nuit' | 'fond' | 'noir';
export type TailleReglage = 'normale' | 'grande' | 'tres-grande';

export interface ReglagesProjection {
  theme: ThemeReglage;
  /** Id du média (IndexedDB `medias`) pour le thème « fond ». */
  imageFondId: string | null;
  /** Assombrissement de la photo, 0 à 1. */
  voile: number;
  police: 'normale' | 'grasse';
  taille: TailleReglage;
  langueParoles: 'fr' | 'en';
  versionBible: IdVersion;
  /** Seconde version côte à côte, ou null. */
  versionSeconde: IdVersion | null;
  bilingue: boolean;
  /** Écriture des accords sur l'écran des musiciens. */
  notationAccords: Notation;
}

export const REGLAGES_PAR_DEFAUT: ReglagesProjection = {
  theme: 'nuit',
  imageFondId: null,
  voile: 0.45,
  police: 'normale',
  taille: 'normale',
  langueParoles: 'fr',
  versionBible: 'LSG',
  versionSeconde: 'KJV',
  bilingue: false,
  // Les musiciens lisent les accords en lettres, même en français (maquette 05).
  notationAccords: 'en',
};

/**
 * Multiplicateur de l'échelle de projection. Les rapports reprennent l'aperçu de la
 * maquette (15 / 18 / 22 px) : 72 px à 1080 devient 86 puis 106 px.
 */
export const ECHELLE_TAILLE: Record<TailleReglage, number> = {
  normale: 1,
  grande: 1.2,
  'tres-grande': 1.47,
};

const CLE = 'app_reglages';

const VERSIONS: readonly IdVersion[] = ['LSG', 'KJV'];

/** Ne garde que des valeurs connues : un réglage d'une version future ne casse rien. */
function valider(brut: unknown): ReglagesProjection {
  const r = (brut && typeof brut === 'object' ? brut : {}) as Partial<Record<keyof ReglagesProjection, unknown>>;
  const d = REGLAGES_PAR_DEFAUT;
  const parmi = <T,>(v: unknown, valeurs: readonly T[], defaut: T): T => (valeurs.includes(v as T) ? (v as T) : defaut);
  return {
    theme: parmi(r.theme, ['nuit', 'fond', 'noir'] as const, d.theme),
    imageFondId: typeof r.imageFondId === 'string' ? r.imageFondId : null,
    voile: typeof r.voile === 'number' && r.voile >= 0 && r.voile <= 0.9 ? r.voile : d.voile,
    police: parmi(r.police, ['normale', 'grasse'] as const, d.police),
    taille: parmi(r.taille, ['normale', 'grande', 'tres-grande'] as const, d.taille),
    langueParoles: parmi(r.langueParoles, ['fr', 'en'] as const, d.langueParoles),
    versionBible: parmi(r.versionBible, VERSIONS, d.versionBible),
    versionSeconde: r.versionSeconde === null ? null : parmi(r.versionSeconde, VERSIONS, d.versionSeconde),
    bilingue: typeof r.bilingue === 'boolean' ? r.bilingue : d.bilingue,
    notationAccords: parmi(r.notationAccords, ['en', 'fr', 'nns'] as const, d.notationAccords),
  };
}

let memoire: ReglagesProjection | null = null;
let brutMemoire: string | null = null;
const abonnes = new Set<() => void>();

/** Les réglages courants (valeurs par défaut hors navigateur ou sans stockage). */
export function lireReglages(): ReglagesProjection {
  if (typeof window === 'undefined') return REGLAGES_PAR_DEFAUT;
  let brut: string | null = null;
  try {
    brut = window.localStorage.getItem(CLE);
  } catch {
    // Stockage refusé : on garde ce qu'on a en mémoire.
    return memoire ?? REGLAGES_PAR_DEFAUT;
  }
  // Même chaîne → même objet : useSyncExternalStore compare par identité.
  if (memoire && brut === brutMemoire) return memoire;
  try {
    memoire = valider(brut ? JSON.parse(brut) : {});
  } catch {
    memoire = REGLAGES_PAR_DEFAUT;
  }
  brutMemoire = brut;
  return memoire;
}

export function ecrireReglages(modif: Partial<ReglagesProjection>): ReglagesProjection {
  const suivant = valider({ ...lireReglages(), ...modif });
  // Une seconde version identique à la principale n'a pas de sens : on la retire.
  if (suivant.versionSeconde === suivant.versionBible) suivant.versionSeconde = null;
  const brut = JSON.stringify(suivant);
  memoire = suivant;
  brutMemoire = brut;
  try {
    window.localStorage.setItem(CLE, brut);
  } catch {
    // Sans stockage, le réglage vaut pour la session.
  }
  abonnes.forEach((a) => a());
  return suivant;
}

function sAbonner(rappel: () => void): () => void {
  abonnes.add(rappel);
  // Changement fait dans une AUTRE fenêtre (la régie modifie, la sortie suit).
  const auStockage = (e: StorageEvent) => {
    if (e.key === CLE || e.key === null) rappel();
  };
  window.addEventListener('storage', auStockage);
  return () => {
    abonnes.delete(rappel);
    window.removeEventListener('storage', auStockage);
  };
}

/** Réglages + fonction de modification. Valeurs par défaut pendant le rendu statique. */
export function useReglages(): [ReglagesProjection, (modif: Partial<ReglagesProjection>) => void] {
  const reglages = useSyncExternalStore(sAbonner, lireReglages, () => REGLAGES_PAR_DEFAUT);
  const modifier = useCallback((modif: Partial<ReglagesProjection>) => {
    ecrireReglages(modif);
  }, []);
  return [reglages, modifier];
}

/** Ce que la régie applique à l'état de projection (`appliquerTheme`). */
export function themeSortieDepuisReglages(r: ReglagesProjection): Partial<ThemeSortie> {
  const avecPhoto = r.theme === 'fond' && r.imageFondId !== null;
  return {
    // Fond choisi sans photo : on reste en Nuit plutôt que de projeter un fond vide.
    fond: r.theme === 'noir' ? 'noir' : avecPhoto ? 'image' : 'nuit',
    imageId: avecPhoto ? r.imageFondId : null,
    voile: r.voile,
    echelleTexte: ECHELLE_TAILLE[r.taille],
    graisse: r.police,
  };
}

// ─── Écrans (affectation retenue par la plateforme) ──────────────────────────

export type AffectationEcran = 'sortie' | 'musiciens' | 'rien';

/** Clé de préférence plateforme : { [idEcran]: affectation }. */
export const CLE_AFFECTATIONS_ECRANS = 'affectationsEcrans';

/** Affectations retenues ; {} si rien n'a encore été choisi. */
export async function lireAffectationsEcrans(plateforme: {
  lirePreference<T>(cle: string): Promise<T | undefined>;
}): Promise<Record<string, AffectationEcran>> {
  return (await plateforme.lirePreference<Record<string, AffectationEcran>>(CLE_AFFECTATIONS_ECRANS)) ?? {};
}

/** Id de l'écran qui doit afficher la sortie (ou les musiciens), s'il a été choisi. */
export async function ecranAffecte(
  plateforme: { lirePreference<T>(cle: string): Promise<T | undefined> },
  role: Exclude<AffectationEcran, 'rien'>
): Promise<string | null> {
  const affectations = await lireAffectationsEcrans(plateforme);
  return Object.entries(affectations).find(([, a]) => a === role)?.[0] ?? null;
}

/**
 * Affectations après le choix d'un écran pour un rôle (choix fait dans la régie) ; `null`
 * oublie l'écran de ce rôle. Un seul écran par rôle : l'ancien titulaire n'affiche plus rien.
 */
export function reaffecterEcran(
  affectations: Readonly<Record<string, AffectationEcran>>,
  id: string | null,
  role: Exclude<AffectationEcran, 'rien'>
): Record<string, AffectationEcran> {
  const suivant = { ...affectations };
  for (const [autre, a] of Object.entries(suivant)) if (a === role && autre !== id) suivant[autre] = 'rien';
  if (id) suivant[id] = role;
  return suivant;
}
