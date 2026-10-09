'use client';

/**
 * Setlists de cet appareil (IndexedDB, `@cmfi/api` setlistsLocales). Ce sont elles que l'on
 * édite et que la régie projette, visiteur ou compte : elles seules mêlent chants et
 * passages bibliques. Le serveur n'en garde qu'une copie (chants seuls) quand on partage.
 *
 * Sans IndexedDB (navigation privée stricte), les setlists vivent en mémoire le temps de la
 * session : on peut quand même préparer et projeter un culte.
 */
import {
  cacheDisponible,
  enregistrerSetlistLocale,
  listerSetlistsLocales,
  supprimerSetlistLocale,
  type SetlistLocale,
} from '@cmfi/api';
import { useEffect } from 'react';

import { creerMagasin, useMagasin } from '@/components/bibliotheque/magasin';

export interface EtatSetlists {
  statut: 'chargement' | 'pret';
  setlists: SetlistLocale[];
  /** Faux si IndexedDB est indisponible : rien ne survivra à la fermeture de l'onglet. */
  persistantes: boolean;
}

const magasin = creerMagasin<EtatSetlists>({ statut: 'chargement', setlists: [], persistantes: true });
let chargement: Promise<void> | null = null;

function trier(setlists: SetlistLocale[]): SetlistLocale[] {
  return [...setlists].sort((a, b) => b.modifieLe - a.modifieLe);
}

export function chargerSetlists(): Promise<void> {
  if (!chargement) {
    chargement = (async () => {
      if (!cacheDisponible()) {
        magasin.ecrire((e) => ({ ...e, statut: 'pret', persistantes: false }));
        return;
      }
      try {
        const lues = await listerSetlistsLocales();
        magasin.ecrire((e) => ({ statut: 'pret', persistantes: true, setlists: trier([...lues, ...e.setlists.filter((s) => !lues.some((l) => l.id === s.id))]) }));
      } catch (erreur) {
        console.log('[setlists] base indisponible', erreur);
        magasin.ecrire((e) => ({ ...e, statut: 'pret', persistantes: false }));
      }
    })();
  }
  return chargement;
}

/** Enregistre (création ou modification) et renvoie la version horodatée. */
export async function sauverSetlist(setlist: SetlistLocale): Promise<SetlistLocale> {
  // Affichée tout de suite : un glisser-déposer ne doit pas revenir en arrière le temps
  // de l'écriture en base.
  const aJour: SetlistLocale = { ...setlist, modifieLe: Date.now() };
  magasin.ecrire((e) => ({ ...e, setlists: trier([aJour, ...e.setlists.filter((s) => s.id !== aJour.id)]) }));
  if (magasin.lire().persistantes && cacheDisponible()) {
    try {
      await enregistrerSetlistLocale(aJour);
    } catch (erreur) {
      console.log('[setlists] écriture refusée, copie en mémoire', erreur);
      magasin.ecrire((e) => ({ ...e, persistantes: false }));
    }
  }
  return aJour;
}

/** Suppression DÉFINITIVE de la copie de cet appareil. */
export async function effacerSetlist(id: string): Promise<void> {
  if (magasin.lire().persistantes && cacheDisponible()) {
    try {
      await supprimerSetlistLocale(id);
    } catch (erreur) {
      console.log('[setlists] suppression refusée', erreur);
      throw erreur;
    }
  }
  magasin.ecrire((e) => ({ ...e, setlists: e.setlists.filter((s) => s.id !== id) }));
}

export function lireSetlistEnMemoire(id: string): SetlistLocale | undefined {
  return magasin.lire().setlists.find((s) => s.id === id);
}

export function useSetlistsLocales(): EtatSetlists {
  const etat = useMagasin(magasin);
  useEffect(() => {
    void chargerSetlists();
  }, []);
  return etat;
}
