'use client';

/**
 * Accès aux données de la bibliothèque : recueils, catégories, chant ouvert, chants
 * personnels. Toujours la copie hors-ligne d'abord (IndexedDB), le réseau ensuite :
 * on lit tout de suite ce qu'on a, et un échec réseau n'efface jamais ce qui est affiché.
 *
 * Les recueils sont téléchargés complets (paroles et accords) par `synchroniserRecueils`,
 * comme le mobile : quelques Mo, une fois, puis seulement ce qui a changé.
 */
import {
  cacheDisponible,
  enregistrerCategories,
  enregistrerChant,
  lireCategories,
  lireChant,
  listerRecueilsEnCache,
  synchroniserRecueils,
  type CategorieDTO,
  type ChantDTO,
  type LangueContenu,
  type ProgresSynchronisation,
  type RecueilEnCache,
} from '@cmfi/api';
import { useEffect, useState } from 'react';

import { obtenirClientApi } from '@/lib/api';
import { useSession } from '@/lib/session';

import { creerMagasin, useMagasin } from './magasin';

export type Statut = 'chargement' | 'pret' | 'erreur';

const LANGUES: LangueContenu[] = ['fr', 'en'];

// ─── Recueils ────────────────────────────────────────────────────────────────

export interface EtatRecueils {
  statut: Statut;
  recueils: RecueilEnCache[];
  /** Téléchargement en cours (null sinon). */
  progres: ProgresSynchronisation | null;
  /** Vrai si la dernière vérification a échoué alors qu'une copie locale est affichée. */
  copieLocaleSeulement: boolean;
  erreur: unknown;
}

const magasinRecueils = creerMagasin<EtatRecueils>({
  statut: 'chargement',
  recueils: [],
  progres: null,
  copieLocaleSeulement: false,
  erreur: null,
});

let synchronisation: Promise<void> | null = null;

function trierRecueils(recueils: RecueilEnCache[]): RecueilEnCache[] {
  return [...recueils].sort((a, b) => a.langue.localeCompare(b.langue) || a.titre.localeCompare(b.titre));
}

/** Sans IndexedDB : on télécharge en mémoire, pour la session. */
async function chargerSansCache(): Promise<RecueilEnCache[]> {
  const api = obtenirClientApi();
  const resultat: RecueilEnCache[] = [];
  for (const langue of LANGUES) {
    for (const v of await api.listerVersionsRecueils(langue)) {
      const chants = await api.chantsDuRecueil(v.title, true);
      resultat.push({ langue, titre: v.title, version: v.version, chants, enregistreLe: Date.now() });
    }
  }
  return resultat;
}

async function lireCopieLocale(): Promise<RecueilEnCache[]> {
  if (!cacheDisponible()) return [];
  try {
    return await listerRecueilsEnCache();
  } catch {
    return [];
  }
}

function chargerRecueils(forcer = false): Promise<void> {
  if (synchronisation && !forcer) return synchronisation;
  synchronisation = (async () => {
    const locale = await lireCopieLocale();
    magasinRecueils.ecrire((e) => ({
      ...e,
      recueils: locale.length > 0 ? trierRecueils(locale) : e.recueils,
      statut: locale.length > 0 || e.recueils.length > 0 ? 'pret' : 'chargement',
      erreur: null,
    }));

    try {
      let recueils: RecueilEnCache[];
      if (cacheDisponible()) {
        const bilan = await synchroniserRecueils(obtenirClientApi(), LANGUES, (progres) =>
          magasinRecueils.ecrire((e) => ({ ...e, progres: progres.etape === 'termine' ? null : progres }))
        );
        recueils = await lireCopieLocale();
        // Écriture refusée (quota, base bloquée) : on garde au moins la session.
        if (recueils.length === 0 && bilan.echecs.length > 0) recueils = await chargerSansCache();
      } else {
        recueils = await chargerSansCache();
      }
      magasinRecueils.ecrire((e) => ({
        ...e,
        statut: 'pret',
        recueils: trierRecueils(recueils),
        progres: null,
        copieLocaleSeulement: false,
      }));
    } catch (erreur) {
      console.log('[bibliotheque] recueils indisponibles', erreur);
      magasinRecueils.ecrire((e) => ({
        ...e,
        progres: null,
        statut: e.recueils.length > 0 ? 'pret' : 'erreur',
        copieLocaleSeulement: e.recueils.length > 0,
        erreur,
      }));
    }
  })();
  return synchronisation;
}

export function useRecueils() {
  const etat = useMagasin(magasinRecueils);
  useEffect(() => {
    void chargerRecueils();
  }, []);
  return { ...etat, reessayer: () => void chargerRecueils(true) };
}

/** Chant et titre de son recueil, s'il est dans un recueil déjà chargé. */
export function trouverDansRecueils(id: string): { chant: ChantDTO; recueil: RecueilEnCache } | null {
  for (const recueil of magasinRecueils.lire().recueils) {
    const chant = recueil.chants.find((c) => c.id === id);
    if (chant) return { chant, recueil };
  }
  return null;
}

// ─── Catégories ──────────────────────────────────────────────────────────────

interface EtatCategories {
  statut: Statut;
  categories: CategorieDTO[];
}

const magasinCategories = creerMagasin<Record<LangueContenu, EtatCategories>>({
  fr: { statut: 'chargement', categories: [] },
  en: { statut: 'chargement', categories: [] },
});
const categoriesDemandees = new Map<LangueContenu, Promise<void>>();

function chargerCategories(langue: LangueContenu, forcer = false): Promise<void> {
  const enCours = categoriesDemandees.get(langue);
  if (enCours && !forcer) return enCours;
  const ecrire = (e: EtatCategories) => magasinCategories.ecrire((tout) => ({ ...tout, [langue]: e }));
  const promesse = (async () => {
    let locales: CategorieDTO[] | undefined;
    if (cacheDisponible()) {
      try {
        locales = await lireCategories(langue);
      } catch {
        locales = undefined;
      }
    }
    if (locales) ecrire({ statut: 'pret', categories: locales });
    try {
      const fraiches = await obtenirClientApi().listerCategories(langue);
      ecrire({ statut: 'pret', categories: fraiches });
      if (cacheDisponible()) await enregistrerCategories(langue, fraiches).catch(() => undefined);
    } catch (erreur) {
      console.log('[bibliotheque] catégories indisponibles', erreur);
      if (!locales) ecrire({ statut: 'erreur', categories: [] });
    }
  })();
  categoriesDemandees.set(langue, promesse);
  return promesse;
}

export function useCategories(langue: LangueContenu, actif: boolean) {
  const etat = useMagasin(magasinCategories)[langue];
  useEffect(() => {
    if (actif) void chargerCategories(langue);
  }, [langue, actif]);
  return { ...etat, reessayer: () => void chargerCategories(langue, true) };
}

// ─── Chant ouvert ────────────────────────────────────────────────────────────

const chantsEnMemoire = new Map<string, ChantDTO>();

export interface ChantOuvert {
  chant: ChantDTO;
  /** Titre du recueil, s'il est connu. */
  recueil: string | null;
}

/** Cherche un chant : recueils chargés, mémoire, copie hors-ligne, puis serveur. */
export async function obtenirChant(id: string): Promise<ChantOuvert> {
  const dansRecueil = trouverDansRecueils(id);
  if (dansRecueil) return { chant: dansRecueil.chant, recueil: dansRecueil.recueil.titre };
  const memoire = chantsEnMemoire.get(id);
  if (memoire) return { chant: memoire, recueil: null };
  if (cacheDisponible()) {
    try {
      const local = await lireChant(id);
      if (local) {
        chantsEnMemoire.set(id, local);
        const recueil = trouverDansRecueils(id)?.recueil.titre ?? null;
        return { chant: local, recueil };
      }
    } catch {
      // On passe au réseau.
    }
  }
  const chant = await obtenirClientApi().chantParId(id);
  chantsEnMemoire.set(id, chant);
  if (cacheDisponible()) void enregistrerChant(chant).catch(() => undefined);
  return { chant, recueil: null };
}

/** Garde en mémoire des chants déjà complets (chants personnels). */
export function memoriserChants(chants: readonly ChantDTO[]): void {
  for (const c of chants) if (c.parts || c.verses) chantsEnMemoire.set(c.id, c);
}

interface EtatChant {
  id: string | null;
  statut: Statut;
  ouvert: ChantOuvert | null;
  erreur: unknown;
}

export function useChant(id: string | null) {
  const { recueils } = useMagasin(magasinRecueils);
  const [etat, setEtat] = useState<EtatChant>({ id: null, statut: 'chargement', ouvert: null, erreur: null });
  const [essai, setEssai] = useState(0);

  useEffect(() => {
    if (!id) return;
    let actif = true;
    obtenirChant(id).then(
      (ouvert) => actif && setEtat({ id, statut: 'pret', ouvert, erreur: null }),
      (erreur) => actif && setEtat({ id, statut: 'erreur', ouvert: null, erreur })
    );
    return () => {
      actif = false;
    };
    // `recueils` : un chant ouvert avant la fin du téléchargement retrouve son recueil après.
  }, [id, essai, recueils]);

  const aJour = etat.id === id;
  return {
    statut: !id ? ('pret' as Statut) : aJour ? etat.statut : ('chargement' as Statut),
    ouvert: aJour ? etat.ouvert : null,
    erreur: aJour ? etat.erreur : null,
    reessayer: () => setEssai((n) => n + 1),
  };
}

// ─── Chants personnels (compte requis) ───────────────────────────────────────

interface EtatMesChants {
  statut: Statut;
  chants: ChantDTO[];
}

const magasinMesChants = creerMagasin<EtatMesChants>({ statut: 'chargement', chants: [] });
let mesChantsDemandes: Promise<void> | null = null;

function chargerMesChants(forcer = false): Promise<void> {
  if (mesChantsDemandes && !forcer) return mesChantsDemandes;
  mesChantsDemandes = obtenirClientApi()
    .mesChants()
    .then(
      (chants) => {
        memoriserChants(chants);
        magasinMesChants.ecrire({ statut: 'pret', chants: [...chants].sort((a, b) => a.title.localeCompare(b.title)) });
      },
      (erreur) => {
        console.log('[bibliotheque] chants personnels indisponibles', erreur);
        magasinMesChants.ecrire((e) => ({ ...e, statut: e.chants.length > 0 ? 'pret' : 'erreur' }));
      }
    );
  return mesChantsDemandes;
}

export function useMesChants(actif: boolean) {
  const { estConnecte } = useSession();
  const etat = useMagasin(magasinMesChants);
  useEffect(() => {
    if (actif && estConnecte) void chargerMesChants();
  }, [actif, estConnecte]);
  return { ...etat, estConnecte, reessayer: () => void chargerMesChants(true) };
}
