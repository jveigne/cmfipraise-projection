/**
 * Résumé de la setlist en cours (« ordre du culte »), joint à l'état de projection.
 *
 * L'écran des musiciens et les téléphones montrent où l'on en est (« 2 / 5 ») et ce qui
 * vient ensuite ; ils ne reçoivent pourtant que l'état diffusé par la régie. Ce résumé
 * voyage donc avec lui, sans les diapositives des autres éléments (inutiles et lourdes).
 * Champ facultatif de `EtatProjection` : une sortie qui ne le reçoit pas s'en passe.
 */
import type { ElementProjete } from './diapositive';

export interface ElementProgramme {
  id: string;
  genre: ElementProjete['genre'];
  titre: string;
  meta: string;
  /** Tonalité jouée (transposition comprise), null pour une lecture biblique. */
  tonalite: { racine: number; mineur: boolean } | null;
  personnel: boolean;
}

export interface ProgrammeCulte {
  /** Nom de la setlist (« Culte du dimanche »). */
  nom: string;
  elements: ElementProgramme[];
  /** Index de l'élément en direct, -1 si rien n'est projeté depuis la setlist. */
  position: number;
}

/** Tonalité réellement jouée : l'originale décalée de la transposition de l'élément. */
export function tonaliteJouee(element: Pick<ElementProjete, 'tonalite' | 'transposition'>): { racine: number; mineur: boolean } | null {
  if (!element.tonalite) return null;
  const decalage = element.transposition ?? 0;
  return { racine: (((element.tonalite.racine + decalage) % 12) + 12) % 12, mineur: element.tonalite.mineur };
}

/** Construit le résumé à joindre à l'état, à partir des éléments développés de la setlist. */
export function resumerProgramme(nom: string, elements: readonly ElementProjete[], position: number): ProgrammeCulte {
  return {
    nom,
    position: position >= 0 && position < elements.length ? position : -1,
    elements: elements.map((e) => ({
      id: e.id,
      genre: e.genre,
      titre: e.titre,
      meta: e.meta,
      tonalite: tonaliteJouee(e),
      personnel: e.personnel,
    })),
  };
}
