'use client';

/**
 * Setlists du compte (créées dans l'app mobile ou publiées d'ici) et setlists partagées
 * avec moi. Chargées seulement si l'on est connecté ; un échec n'empêche rien d'autre.
 */
import { enregistrerSetlistServeur, cacheDisponible, depuisSetlistServeur, type SetlistDTO, type SetlistLocale } from '@cmfi/api';
import { useEffect } from 'react';

import { creerMagasin, useMagasin } from '@/components/bibliotheque/magasin';
import { obtenirClientApi } from '@/lib/api';
import { useSession } from '@/lib/session';

import { sauverSetlist } from './magasinSetlists';

interface EtatCompte {
  statut: 'inactif' | 'chargement' | 'pret' | 'erreur';
  miennes: SetlistDTO[];
  partagees: SetlistDTO[];
}

const magasin = creerMagasin<EtatCompte>({ statut: 'inactif', miennes: [], partagees: [] });
let demande: Promise<void> | null = null;

export function chargerSetlistsCompte(forcer = false): Promise<void> {
  if (demande && !forcer) return demande;
  magasin.ecrire((e) => ({ ...e, statut: e.statut === 'pret' ? 'pret' : 'chargement' }));
  const api = obtenirClientApi();
  demande = Promise.all([api.mesSetlists(), api.setlistsPartageesAvecMoi()]).then(
    ([miennes, partagees]) => magasin.ecrire({ statut: 'pret', miennes, partagees }),
    (erreur) => {
      console.log('[setlists] compte indisponible', erreur);
      magasin.ecrire((e) => ({ ...e, statut: e.statut === 'pret' ? 'pret' : 'erreur' }));
    }
  );
  return demande;
}

export function useSetlistsCompte() {
  const { estConnecte } = useSession();
  const etat = useMagasin(magasin);
  useEffect(() => {
    if (estConnecte) void chargerSetlistsCompte();
    else {
      demande = null;
      magasin.ecrire({ statut: 'inactif', miennes: [], partagees: [] });
    }
  }, [estConnecte]);
  return { ...etat, estConnecte, recharger: () => void chargerSetlistsCompte(true) };
}

/**
 * Ouvre une setlist du compte dans l'éditeur : on en fait la copie de travail locale (avec
 * son `idServeur`), car c'est la setlist locale que l'on édite et que la régie projette.
 */
export async function importerSetlistCompte(idServeur: string): Promise<SetlistLocale> {
  const detail = await obtenirClientApi().setlistParId(idServeur);
  if (cacheDisponible()) void enregistrerSetlistServeur(detail).catch(() => undefined);
  return sauverSetlist(depuisSetlistServeur(detail));
}

/** Copie d'une setlist partagée, sans lien avec l'original (on n'en est pas propriétaire). */
export async function copierSetlistPartagee(dto: SetlistDTO, suffixe: string): Promise<SetlistLocale> {
  const copie = depuisSetlistServeur(dto);
  return sauverSetlist({ ...copie, nom: `${dto.name}${suffixe}`, idServeur: null });
}
