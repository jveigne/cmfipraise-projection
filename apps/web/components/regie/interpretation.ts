/**
 * Ce que la barre unique a compris : chaque segment de la saisie devient un passage
 * biblique, un chant (avec ses autres candidats) ou « rien trouvé ».
 *
 * Deux temps, pour que la barre réponde tout de suite même sans réseau : d'abord la Bible
 * et les recueils déjà téléchargés (interpreterSaisie), puis, si le réseau répond, la
 * recherche du serveur qui complète les chants (enrichirParServeur).
 */
import {
  listerRecueilsEnCache,
  nouvelIdentifiant,
  type ChantDTO,
  type ClientApi,
  type ElementSetlist,
  type RecueilEnCache,
} from '@cmfi/api';
import {
  analyserReference,
  formaterReference,
  type BibleSource,
  type IdVersion,
  type PassageBiblique,
  type ReferenceBiblique,
} from '@cmfi/projection';

import { chercherDansRecueils, decouperSaisie, fusionnerCandidats, lireNumero, type CandidatChant } from './rechercheBarre';

export type Interpretation =
  | {
      id: string;
      genre: 'bible';
      segment: string;
      reference: ReferenceBiblique;
      version: IdVersion;
      seconde: IdVersion | null;
      /** null : la source (échantillon) n'a aucun verset de ce passage. */
      passage: PassageBiblique | null;
      /** Le passage prolongé d'un verset, si la source a ce verset (« Étendre à 3:16-17 »). */
      extension: ReferenceBiblique | null;
    }
  | {
      id: string;
      genre: 'chant';
      segment: string;
      candidats: CandidatChant[];
      /** Index du candidat retenu. */
      choix: number;
      /** Vrai une fois la recherche du serveur faite (ou abandonnée). */
      complet: boolean;
    }
  | { id: string; genre: 'inconnu'; segment: string; complet: boolean; numero: boolean };

export interface ContexteInterpretation {
  bible: BibleSource;
  version: IdVersion;
  seconde: IdVersion | null;
  langueFavorite: string;
}

/** Identifiant stable tant que le segment ne change pas : la sélection survit à la frappe. */
function idSegment(index: number, segment: string): string {
  return `${index}:${segment.toLowerCase()}`;
}

async function lireRecueils(): Promise<RecueilEnCache[]> {
  try {
    return await listerRecueilsEnCache();
  } catch {
    return [];
  }
}

/** Le même passage prolongé d'un verset, quand c'est possible et que la source l'a. */
async function extensionPossible(ref: ReferenceBiblique, version: IdVersion, bible: BibleSource): Promise<ReferenceBiblique | null> {
  if (ref.versetFin === null || ref.chapitre !== ref.chapitreFin) return null;
  const suivant = ref.versetFin + 1;
  const verset: ReferenceBiblique = { livre: ref.livre, chapitre: ref.chapitre, versetDebut: suivant, chapitreFin: ref.chapitre, versetFin: suivant };
  try {
    return (await bible.contient(version, verset)) ? { ...ref, versetFin: suivant } : null;
  } catch {
    return null;
  }
}

export async function interpreterBible(
  id: string,
  segment: string,
  reference: ReferenceBiblique,
  version: IdVersion,
  seconde: IdVersion | null,
  bible: BibleSource
): Promise<Extract<Interpretation, { genre: 'bible' }>> {
  let passage: PassageBiblique | null = null;
  try {
    passage = await bible.lirePassage(version, reference);
  } catch {
    passage = null;
  }
  const extension = passage ? await extensionPossible(reference, version, bible) : null;
  return { id, genre: 'bible', segment, reference, version, seconde: seconde === version ? null : seconde, passage, extension };
}

/** Premier temps : Bible et recueils en cache. Ne touche pas au réseau. */
export async function interpreterSaisie(saisie: string, ctx: ContexteInterpretation): Promise<Interpretation[]> {
  const segments = decouperSaisie(saisie);
  if (segments.length === 0) return [];
  const recueils = segments.some((s) => !analyserReference(s)) ? await lireRecueils() : [];

  return Promise.all(
    segments.map(async (segment, i): Promise<Interpretation> => {
      const id = idSegment(i, segment);
      const reference = analyserReference(segment);
      if (reference) return interpreterBible(id, segment, reference, ctx.version, ctx.seconde, ctx.bible);
      const candidats = chercherDansRecueils(recueils, segment, { langueFavorite: ctx.langueFavorite });
      if (candidats.length === 0) return { id, genre: 'inconnu', segment, complet: false, numero: lireNumero(segment) !== null };
      return { id, genre: 'chant', segment, candidats, choix: 0, complet: false };
    })
  );
}

/**
 * Second temps : la recherche du serveur (titre, paroles, numéro, auteur) complète chaque
 * segment non biblique. Un échec réseau laisse simplement ce qui a été trouvé localement.
 */
export async function enrichirParServeur(interpretations: readonly Interpretation[], api: ClientApi): Promise<Interpretation[]> {
  return Promise.all(
    interpretations.map(async (i): Promise<Interpretation> => {
      if (i.genre === 'bible') return i;
      let serveur: ChantDTO[] = [];
      try {
        serveur = await api.rechercher(i.segment, 0, 8);
      } catch {
        serveur = [];
      }
      const locaux = i.genre === 'chant' ? i.candidats : [];
      const candidats = fusionnerCandidats(locaux, serveur);
      if (candidats.length === 0) return { ...i, complet: true } as Interpretation;
      return {
        id: i.id,
        genre: 'chant',
        segment: i.segment,
        candidats,
        choix: i.genre === 'chant' ? i.choix : 0,
        complet: true,
      };
    })
  );
}

/** Vrai si l'interprétation peut devenir un élément de setlist. */
export function estAjoutable(i: Interpretation): boolean {
  if (i.genre === 'bible') return i.passage !== null;
  return i.genre === 'chant' && i.candidats.length > 0;
}

/** L'élément de setlist correspondant, et le chant complet s'il est déjà connu. */
export function versElementSetlist(i: Interpretation): { element: ElementSetlist; chant?: ChantDTO } | null {
  if (i.genre === 'bible') {
    if (!i.passage) return null;
    return {
      element: {
        type: 'bible',
        id: nouvelIdentifiant(),
        // Référence normalisée en français : le parseur la relit telle quelle.
        reference: formaterReference(i.reference, 'fr'),
        version: i.version,
        secondeVersion: i.seconde,
      },
    };
  }
  if (i.genre !== 'chant') return null;
  const c = i.candidats[i.choix];
  if (!c) return null;
  return {
    element: {
      type: 'chant',
      id: nouvelIdentifiant(),
      chantId: c.id,
      titre: c.titre,
      recueil: c.recueil,
      numero: c.numero,
      langue: c.langue,
    },
    chant: c.chant,
  };
}
