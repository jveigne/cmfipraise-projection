/**
 * Modèle de la séance de régie : la setlist du culte, ce que chaque élément est devenu
 * (diapositives prêtes, en cours de chargement, en erreur), et la position en direct.
 *
 * Tout ce qui est ici est pur et testé : la régie (Regie.tsx) ne fait que l'orchestrer.
 * Règle cardinale : une erreur sur un élément ne touche jamais aux autres ni à ce qui est
 * projeté. Un élément en erreur a simplement zéro diapositive, et la navigation le saute.
 */
import type { ElementSetlist, SetlistLocale } from '@cmfi/api';
import {
  reduireProjection,
  suivantePour,
  type ActionProjection,
  type DiapositiveSuivante,
  type ElementProjete,
  type EtatProjection,
  type PositionSetlist,
} from '@cmfi/projection';

// ─── Éléments résolus ────────────────────────────────────────────────────────

export type CauseIndisponible =
  /** Réseau coupé (ou requête bloquée) et pas de copie locale. */
  | 'reseau'
  /** Le serveur ne connaît pas ce chant. */
  | 'introuvable'
  /** Référence biblique illisible. */
  | 'reference'
  /** Référence valide, mais absente de la source biblique (échantillon). */
  | 'bible-absente'
  /** Version biblique inconnue de la source. */
  | 'version';

export type ElementResolu =
  | { statut: 'chargement' }
  | {
      statut: 'pret';
      projete: ElementProjete;
      /** Données d'exemple embarquées, utilisées faute de serveur (setlist de démonstration). */
      exemple: boolean;
      /** Texte biblique tiré de l'échantillon : l'interface doit le dire. */
      echantillon: boolean;
      /** Passage biblique dont la source n'a pas tous les versets. */
      incomplet: boolean;
      /** Chant de seconde langue demandé mais pas chargé (le chant reste projetable). */
      secondeManquante: boolean;
    }
  | { statut: 'erreur'; cause: CauseIndisponible };

/** Origine de la setlist : décide où vont les modifications (réordonner, ajouter). */
export type OrigineSetlist =
  /** Setlist locale (IndexedDB) : chaque modification y est enregistrée. */
  | { type: 'locale'; id: string }
  /** Copie de travail d'une setlist du serveur : rien n'est renvoyé au serveur depuis la régie. */
  | { type: 'serveur'; id: string }
  /** Setlist de démonstration. */
  | { type: 'exemple' }
  /** Setlist commencée dans la régie, pas encore gardée. */
  | { type: 'nouvelle' };

export type Phase = 'preparation' | 'direct' | 'fin';

/** Position en direct, repérée par l'IDENTIFIANT de l'élément : elle survit au réordonnancement. */
export interface PositionDirect {
  idElement: string;
  diapositive: number;
}

// ─── Liste de navigation ─────────────────────────────────────────────────────

/** Élément de navigation vide : un élément pas (encore) prêt n'a aucune diapositive. */
function elementVide(el: ElementSetlist): ElementProjete {
  return {
    id: el.id,
    genre: el.type,
    titre: el.type === 'chant' ? el.titre : el.reference,
    meta: '',
    ordre: '',
    diapositives: [],
    tonalite: null,
    personnel: false,
  };
}

/** La setlist développée, dans son ordre, alignée index pour index sur `elements`. */
export function elementsNavigation(
  elements: readonly ElementSetlist[],
  resolus: ReadonlyMap<string, ElementResolu>
): ElementProjete[] {
  return elements.map((el) => {
    const r = resolus.get(el.id);
    return r?.statut === 'pret' ? r.projete : elementVide(el);
  });
}

/** Position d'index (pour les fonctions de @cmfi/projection) ; null si l'élément a disparu. */
export function versPositionIndex(nav: readonly ElementProjete[], pos: PositionDirect | null): PositionSetlist | null {
  if (!pos) return null;
  const element = nav.findIndex((e) => e.id === pos.idElement);
  if (element < 0) return null;
  return { element, diapositive: pos.diapositive };
}

export function versPositionDirect(nav: readonly ElementProjete[], pos: PositionSetlist | null): PositionDirect | null {
  if (!pos) return null;
  const el = nav[pos.element];
  return el ? { idElement: el.id, diapositive: pos.diapositive } : null;
}

/** Première diapositive projetable de la setlist (après « Lancer la projection »). */
export function premierePosition(nav: readonly ElementProjete[]): PositionSetlist | null {
  const i = nav.findIndex((e) => e.diapositives.length > 0);
  return i < 0 ? null : { element: i, diapositive: 0 };
}

/**
 * Ce qui suit une position. Avant la première diapositive (position nulle, juste après le
 * lancement), c'est la première diapositive de la setlist.
 */
export function suivanteDepuis(nav: readonly ElementProjete[], pos: PositionSetlist | null): DiapositiveSuivante | null {
  if (pos) return suivantePour(nav as ElementProjete[], pos);
  const p = premierePosition(nav);
  const el = p ? nav[p.element] : undefined;
  const d = el?.diapositives[0];
  return el && d ? { titreElement: el.titre, changeElement: true, diapositive: d } : null;
}

/** Deux « suivantes » désignent-elles la même diapositive, au même contenu ? */
export function memeSuivante(a: DiapositiveSuivante | null, b: DiapositiveSuivante | null): boolean {
  if (!a || !b) return a === b;
  return (
    a.diapositive === b.diapositive ||
    (a.diapositive.id === b.diapositive.id &&
      a.titreElement === b.titreElement &&
      a.changeElement === b.changeElement &&
      a.diapositive.lignes === b.diapositive.lignes)
  );
}

// ─── État de projection côté régie ───────────────────────────────────────────

/**
 * Actions propres à la régie, en plus de celles du réducteur partagé. Elles ne changent
 * jamais une bascule (écran noir, masquer) à l'insu du bénévole.
 */
export type ActionRegie =
  | ActionProjection
  /** Le contenu de l'élément en direct a changé (seconde langue arrivée…) : même position. */
  | { type: 'actualiserElement'; element: ElementProjete; index: number }
  /** Rien de projeté, la sortie montre le logo : préparation, lancement, fin du culte. */
  | { type: 'logoSeul' };

export function reduireRegie(etat: EtatProjection, action: ActionRegie, maintenant = Date.now()): EtatProjection {
  switch (action.type) {
    case 'actualiserElement': {
      const index = Math.max(0, Math.min(action.index, action.element.diapositives.length - 1));
      return { ...etat, element: action.element, index, misAJourLe: maintenant };
    }
    case 'logoSeul':
      return {
        ...etat,
        element: null,
        index: 0,
        suivante: null,
        ecranNoir: false,
        texteMasque: false,
        logo: true,
        misAJourLe: maintenant,
      };
    default:
      return reduireProjection(etat, action, maintenant);
  }
}

// ─── Persistance de la séance ────────────────────────────────────────────────

/** Clé du magasin `preferences` : la séance en cours survit à un rechargement de la régie. */
export const CLE_SEANCE = 'regie.seance';
/** Au-delà, une séance enregistrée est celle d'un autre culte : on ne la reprend pas. */
export const DUREE_REPRISE_MS = 12 * 60 * 60 * 1000;

export interface SeanceEnregistree {
  v: 1;
  setlist: SetlistLocale;
  origine: OrigineSetlist;
  phase: Phase;
  direct: PositionDirect | null;
  bilingue: boolean;
  enregistreeLe: number;
}

/** Vrai si une séance enregistrée mérite d'être reprise à l'ouverture de /regie/. */
export function seanceReprenable(s: unknown, maintenant = Date.now()): s is SeanceEnregistree {
  if (!s || typeof s !== 'object') return false;
  const seance = s as Partial<SeanceEnregistree>;
  return (
    seance.v === 1 &&
    !!seance.setlist &&
    Array.isArray(seance.setlist.elements) &&
    seance.phase !== 'fin' &&
    typeof seance.enregistreeLe === 'number' &&
    maintenant - seance.enregistreeLe < DUREE_REPRISE_MS
  );
}

// ─── Setlist ─────────────────────────────────────────────────────────────────

/** Déplace un élément (glisser-déposer). Renvoie la même liste si rien ne change. */
export function deplacerElement<T extends { id: string }>(liste: readonly T[], idActif: string, idCible: string): T[] {
  const de = liste.findIndex((e) => e.id === idActif);
  const vers = liste.findIndex((e) => e.id === idCible);
  if (de < 0 || vers < 0 || de === vers) return liste as T[];
  const copie = [...liste];
  const [deplace] = copie.splice(de, 1);
  if (deplace) copie.splice(vers, 0, deplace);
  return copie;
}

/** Nombre total de diapositives prêtes. */
export function totalDiapositives(nav: readonly ElementProjete[]): number {
  return nav.reduce((n, e) => n + e.diapositives.length, 0);
}
