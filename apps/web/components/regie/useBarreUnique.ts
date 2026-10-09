'use client';

/**
 * État de la barre unique : la saisie, ce qu'elle a compris, et les ajustements du
 * bénévole (exclure un élément, choisir un autre chant, ajouter la seconde version,
 * étendre un passage). Les ajustements sont rangés par segment : ils survivent à la frappe
 * des segments suivants.
 */
import { type ChantDTO, type ElementSetlist } from '@cmfi/api';
import { sourceEchantillon, type IdVersion, type ReferenceBiblique } from '@cmfi/projection';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { obtenirClientApi } from '@/lib/api';
import { useEnLigne } from '@/lib/reseau';

import {
  enrichirParServeur,
  estAjoutable,
  interpreterBible,
  interpreterSaisie,
  versElementSetlist,
  type Interpretation,
} from './interpretation';

const DELAI_FRAPPE_MS = 220;
const VIDE: Interpretation[] = [];

export interface OptionsBarreUnique {
  version: IdVersion;
  seconde: IdVersion | null;
  langueFavorite: string;
}

export function useBarreUnique({ version, seconde, langueFavorite }: OptionsBarreUnique) {
  const enLigne = useEnLigne();
  const [saisie, setSaisie] = useState('');
  /** Dernier résultat, et la saisie à laquelle il répond (gardé pendant la frappe : pas de clignotement). */
  const [resultat, setResultat] = useState<{ saisie: string; interpretations: Interpretation[]; complet: boolean }>({
    saisie: '',
    interpretations: [],
    complet: true,
  });
  const [exclus, setExclus] = useState<ReadonlySet<string>>(new Set());
  const [choixChant, setChoixChant] = useState<ReadonlyMap<string, string>>(new Map());
  const [secondes, setSecondes] = useState<ReadonlyMap<string, IdVersion | null>>(new Map());
  const [etendues, setEtendues] = useState<ReadonlyMap<string, Interpretation>>(new Map());
  const [chantsCharges, setChantsCharges] = useState<ReadonlyMap<string, ChantDTO>>(new Map());
  const [actif, setActif] = useState(0);
  const sequence = useRef(0);

  // ─── Interprétation, à chaque pause de frappe ──────────────────────────────
  useEffect(() => {
    const numero = ++sequence.current;
    if (!saisie.trim()) return;
    const minuterie = window.setTimeout(async () => {
      const ctx = { bible: sourceEchantillon, version, seconde, langueFavorite };
      const locales = await interpreterSaisie(saisie, ctx);
      if (numero !== sequence.current) return;
      const serveurUtile = enLigne && locales.some((i) => i.genre !== 'bible');
      setResultat({ saisie, interpretations: locales, complet: !serveurUtile });
      if (!serveurUtile) return;
      const completes = await enrichirParServeur(locales, obtenirClientApi());
      if (numero !== sequence.current) return;
      setResultat({ saisie, interpretations: completes, complet: true });
    }, DELAI_FRAPPE_MS);
    return () => window.clearTimeout(minuterie);
  }, [saisie, version, seconde, langueFavorite, enLigne]);

  const ouverte = saisie.trim().length > 0;
  const brutes = ouverte ? resultat.interpretations : VIDE;
  const enCours = ouverte && (resultat.saisie !== saisie || !resultat.complet);

  // ─── Ce qui est affiché : interprétations + ajustements du bénévole ────────
  const interpretations = useMemo<Interpretation[]>(
    () =>
      brutes.map((i) => {
        const etendue = etendues.get(i.id);
        const base = etendue ?? i;
        if (base.genre === 'bible') {
          return secondes.has(base.id) ? { ...base, seconde: secondes.get(base.id) ?? null } : base;
        }
        if (base.genre === 'chant') {
          const voulu = choixChant.get(base.id);
          const index = voulu ? base.candidats.findIndex((c) => c.id === voulu) : -1;
          const candidats = base.candidats.map((c) => (c.chant ? c : { ...c, chant: chantsCharges.get(c.id) }));
          return { ...base, candidats, choix: index >= 0 ? index : 0 };
        }
        return base;
      }),
    [brutes, etendues, secondes, choixChant, chantsCharges]
  );

  // Les candidats venus du serveur n'ont pas leurs paroles : on charge celles du chant retenu.
  useEffect(() => {
    const manquants = interpretations
      .map((i) => (i.genre === 'chant' ? i.candidats[i.choix] : undefined))
      .filter((c): c is NonNullable<typeof c> => !!c && !c.chant && !chantsCharges.has(c.id));
    if (manquants.length === 0 || !enLigne) return;
    let annule = false;
    const api = obtenirClientApi();
    for (const c of manquants) {
      api
        .chantParId(c.id)
        .then((chant) => {
          if (!annule && chant?.parts?.length) setChantsCharges((m) => new Map(m).set(c.id, chant));
        })
        .catch(() => {
          // Paroles indisponibles : le chant reste ajoutable, la régie réessaiera.
        });
    }
    return () => {
      annule = true;
    };
  }, [interpretations, chantsCharges, enLigne]);

  const ajoutables = useMemo(() => interpretations.filter((i) => estAjoutable(i) && !exclus.has(i.id)), [interpretations, exclus]);

  // ─── Actions ───────────────────────────────────────────────────────────────
  const changerSaisie = useCallback((valeur: string) => {
    setSaisie(valeur);
    setActif(0);
  }, []);

  const vider = useCallback(() => {
    sequence.current++;
    setSaisie('');
    setResultat({ saisie: '', interpretations: [], complet: true });
    setExclus(new Set());
    setChoixChant(new Map());
    setSecondes(new Map());
    setEtendues(new Map());
    setActif(0);
  }, []);

  const basculerInclusion = useCallback((id: string) => {
    setExclus((avant) => {
      const apres = new Set(avant);
      if (apres.has(id)) apres.delete(id);
      else apres.add(id);
      return apres;
    });
  }, []);

  const choisirCandidat = useCallback((id: string, idChant: string) => {
    setChoixChant((m) => new Map(m).set(id, idChant));
  }, []);

  const basculerSeconde = useCallback(
    (id: string) => {
      const i = interpretations.find((x) => x.id === id);
      if (i?.genre !== 'bible') return;
      const autre: IdVersion = i.version === 'LSG' ? 'KJV' : 'LSG';
      setSecondes((m) => new Map(m).set(id, i.seconde ? null : autre));
    },
    [interpretations]
  );

  const etendre = useCallback(
    async (id: string) => {
      const i = interpretations.find((x) => x.id === id);
      if (i?.genre !== 'bible' || !i.extension) return;
      const reference: ReferenceBiblique = i.extension;
      const nouvelle = await interpreterBible(id, i.segment, reference, i.version, i.seconde, sourceEchantillon);
      setEtendues((m) => new Map(m).set(id, nouvelle));
    },
    [interpretations]
  );

  /** Les éléments à ajouter (dans l'ordre de la saisie), avec leur chant complet s'il est connu. */
  const elementsAAjouter = useCallback((): { element: ElementSetlist; chant?: ChantDTO }[] => {
    return ajoutables.map(versElementSetlist).filter((x): x is NonNullable<typeof x> => x !== null);
  }, [ajoutables]);

  return {
    saisie,
    changerSaisie,
    vider,
    interpretations,
    enCours,
    exclus,
    basculerInclusion,
    choisirCandidat,
    basculerSeconde,
    etendre,
    ajoutables,
    elementsAAjouter,
    actif: Math.min(actif, Math.max(0, interpretations.length - 1)),
    setActif,
    ouverte,
  };
}

export type BarreUnique = ReturnType<typeof useBarreUnique>;
