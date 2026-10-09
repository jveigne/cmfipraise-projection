'use client';

/**
 * Favoris, gardés sur cet appareil (IndexedDB, magasin `preferences`), pour les visiteurs
 * comme pour les comptes : le backend n'a pas encore de favoris. Chaque favori garde de
 * quoi s'afficher dans la liste sans relire le chant (titre, recueil, numéro).
 */
import { cacheDisponible, ecrirePreference, lirePreference } from '@cmfi/api';
import { useCallback, useEffect } from 'react';

import { creerMagasin, useMagasin } from './magasin';

export interface Favori {
  id: string;
  titre: string;
  recueil?: string | null;
  numero?: number | null;
  langue?: string | null;
  /** Chant personnel (violet dans la liste). */
  personnel?: boolean;
  ajouteLe: number;
}

const CLE = 'bibliotheque_favoris';

const magasin = creerMagasin<Favori[]>([]);
let chargement: Promise<void> | null = null;

function charger(): Promise<void> {
  if (!chargement) {
    chargement = (async () => {
      if (!cacheDisponible()) return;
      try {
        const lus = await lirePreference<Favori[]>(CLE);
        if (Array.isArray(lus)) magasin.ecrire(lus);
      } catch {
        // Base indisponible (navigation privée stricte) : favoris de la session seulement.
      }
    })();
  }
  return chargement;
}

async function enregistrer(favoris: Favori[]): Promise<void> {
  magasin.ecrire(favoris);
  if (!cacheDisponible()) return;
  try {
    await ecrirePreference(CLE, favoris);
  } catch {
    // Même repli : la liste reste juste en mémoire.
  }
}

export function useFavoris() {
  const favoris = useMagasin(magasin);

  useEffect(() => {
    void charger();
  }, []);

  const estFavori = useCallback((id: string) => favoris.some((f) => f.id === id), [favoris]);

  const basculer = useCallback(async (favori: Omit<Favori, 'ajouteLe'>) => {
    await charger();
    const actuels = magasin.lire();
    const suivants = actuels.some((f) => f.id === favori.id)
      ? actuels.filter((f) => f.id !== favori.id)
      : [{ ...favori, ajouteLe: Date.now() }, ...actuels];
    await enregistrer(suivants);
  }, []);

  return { favoris, estFavori, basculer };
}
