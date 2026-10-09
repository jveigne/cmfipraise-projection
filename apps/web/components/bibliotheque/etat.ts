'use client';

/**
 * Filtres de la bibliothèque (vue, onglet, langue, recueil, catégorie, recherche).
 *
 * Partagés entre /chants/ et /chants/lecture/ par un magasin de module, et recopiés en
 * sessionStorage : un rechargement de la page garde la liste où on l'avait laissée.
 */
import type { LangueContenu } from '@cmfi/api';
import { useEffect } from 'react';

import { creerMagasin, useMagasin } from './magasin';

/** Ce que montre la colonne du milieu. */
export type VueBibliotheque = 'recueils' | 'mes-chants' | 'bible';
export type OngletBibliotheque = 'langue' | 'categorie' | 'favoris';

export interface FiltresBibliotheque {
  vue: VueBibliotheque;
  onglet: OngletBibliotheque;
  langue: LangueContenu;
  /** Titre du recueil choisi ; null = tous les recueils de la langue. */
  recueil: string | null;
  categorie: string | null;
  recherche: string;
}

const CLE = 'app_bibliotheque_filtres';

const INITIAUX: FiltresBibliotheque = {
  vue: 'recueils',
  onglet: 'langue',
  langue: 'fr',
  recueil: null,
  categorie: null,
  recherche: '',
};

const magasin = creerMagasin<FiltresBibliotheque>(INITIAUX);
let restaure = false;

function restaurer() {
  if (restaure) return;
  restaure = true;
  try {
    const brut = window.sessionStorage.getItem(CLE);
    if (brut) magasin.ecrire({ ...INITIAUX, ...(JSON.parse(brut) as Partial<FiltresBibliotheque>) });
  } catch {
    // Stockage refusé : on repart des filtres par défaut.
  }
}

export function changerFiltres(changement: Partial<FiltresBibliotheque>): void {
  magasin.ecrire((f) => {
    const suivants = { ...f, ...changement };
    try {
      window.sessionStorage.setItem(CLE, JSON.stringify(suivants));
    } catch {
      // Idem : les filtres valent pour la page ouverte.
    }
    return suivants;
  });
}

export function useFiltres(): FiltresBibliotheque {
  const filtres = useMagasin(magasin);
  useEffect(restaurer, []);
  return filtres;
}

// ─── Préférences de lecture (par appareil) ───────────────────────────────────

export interface PreferencesLecture {
  accords: boolean;
  /** Taille des paroles en px : 15 à 31, par pas de 2 (design : 19). */
  taille: number;
}

export const TAILLE_LECTURE = { min: 15, max: 31, pas: 2, defaut: 19 } as const;

const CLE_LECTURE = 'app_lecture';
const magasinLecture = creerMagasin<PreferencesLecture>({ accords: true, taille: TAILLE_LECTURE.defaut });
let lectureRestauree = false;

function restaurerLecture() {
  if (lectureRestauree) return;
  lectureRestauree = true;
  try {
    const brut = window.localStorage.getItem(CLE_LECTURE);
    if (brut) magasinLecture.ecrire((p) => ({ ...p, ...(JSON.parse(brut) as Partial<PreferencesLecture>) }));
  } catch {
    // Valeurs par défaut.
  }
}

export function changerLecture(changement: Partial<PreferencesLecture>): void {
  magasinLecture.ecrire((p) => {
    const suivantes = { ...p, ...changement };
    suivantes.taille = Math.min(TAILLE_LECTURE.max, Math.max(TAILLE_LECTURE.min, suivantes.taille));
    try {
      window.localStorage.setItem(CLE_LECTURE, JSON.stringify(suivantes));
    } catch {
      // Préférence de la session seulement.
    }
    return suivantes;
  });
}

export function usePreferencesLecture(): PreferencesLecture {
  const preferences = useMagasin(magasinLecture);
  useEffect(restaurerLecture, []);
  return preferences;
}
