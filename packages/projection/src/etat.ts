/**
 * État de projection : ce qui est en direct, ce qui suit, et les bascules de la régie.
 *
 * La régie en est la seule propriétaire ; elle le diffuse à chaque changement sur le canal
 * (canal.ts), et chaque sortie l'affiche tel quel. Un réducteur pur, pour que les règles
 * d'exclusion (projeter rétablit l'écran, Masquer et Logo s'excluent) vivent à un seul
 * endroit et soient testées.
 */
import type { Diapositive, ElementProjete } from './diapositive';
import type { ProgrammeCulte } from './programme';

/** Fond de la sortie. « noir » : thème des salles très lumineuses. */
export type FondSortie = 'nuit' | 'noir' | 'image';

export interface ThemeSortie {
  fond: FondSortie;
  /** Id du média (magasin `medias` de @cmfi/api) quand fond = « image ». */
  imageId: string | null;
  /** Assombrissement de l'image de fond, 0 à 1, pour garder le texte lisible. */
  voile: number;
  /** Multiplicateur de l'échelle de projection (1 = 72 px à 1080). */
  echelleTexte: number;
  /** Référence biblique en bas de l'écran. */
  afficherReference: boolean;
  /** Petit QR « suivre les paroles » dans le coin. */
  afficherQr: boolean;
  /** Graisse des paroles projetées (Réglages · Police) ; « normale » si absente. */
  graisse?: 'normale' | 'grasse';
}

export const THEME_PAR_DEFAUT: ThemeSortie = {
  fond: 'nuit',
  imageId: null,
  voile: 0.45,
  echelleTexte: 1,
  afficherReference: true,
  afficherQr: true,
};

export interface DiapositiveSuivante {
  /** Titre de l'élément qui la porte (« Grâce infinie »). */
  titreElement: string;
  /** Vrai si elle appartient à l'élément suivant de la setlist. */
  changeElement: boolean;
  diapositive: Diapositive;
}

export interface EtatProjection {
  /** Élément en direct, toutes ses diapositives (l'écran des musiciens les montre toutes). */
  element: ElementProjete | null;
  /** Index de la diapositive en direct dans `element.diapositives`. */
  index: number;
  suivante: DiapositiveSuivante | null;
  ecranNoir: boolean;
  texteMasque: boolean;
  logo: boolean;
  bilingue: boolean;
  theme: ThemeSortie;
  /** Horodatage de la dernière modification (ms), pour ignorer un état périmé. */
  misAJourLe: number;
  /**
   * Ordre du culte (musiciens, téléphones). Facultatif : la régie le joint quand elle
   * projette depuis une setlist (`resumerProgramme`), une sortie s'en passe.
   */
  programme?: ProgrammeCulte | null;
  /**
   * Code de la salle ouverte pour les téléphones (lib/reseau de la web app). La sortie
   * l'ajoute à l'adresse de son QR : un téléphone qui le lit arrive directement dans le culte.
   */
  codeSalle?: string | null;
}

export function etatInitial(maintenant = Date.now()): EtatProjection {
  return {
    element: null,
    index: 0,
    suivante: null,
    ecranNoir: false,
    texteMasque: false,
    logo: false,
    bilingue: false,
    theme: THEME_PAR_DEFAUT,
    misAJourLe: maintenant,
  };
}

export type ActionProjection =
  | { type: 'projeter'; element: ElementProjete; index: number; suivante?: DiapositiveSuivante | null }
  | { type: 'definirSuivante'; suivante: DiapositiveSuivante | null }
  | { type: 'basculerEcranNoir' }
  | { type: 'basculerMasquerTexte' }
  | { type: 'basculerLogo' }
  | { type: 'basculerBilingue' }
  | { type: 'appliquerTheme'; theme: Partial<ThemeSortie> }
  | { type: 'effacer' }
  /** Joint (ou retire) l'ordre du culte : à chaque changement de setlist ou d'élément en direct. */
  | { type: 'definirProgramme'; programme: ProgrammeCulte | null }
  /** Joint (ou retire) le code de la salle des téléphones. */
  | { type: 'definirSalle'; codeSalle: string | null };

export function reduireProjection(etat: EtatProjection, action: ActionProjection, maintenant = Date.now()): EtatProjection {
  const suite = (modif: Partial<EtatProjection>): EtatProjection => ({ ...etat, ...modif, misAJourLe: maintenant });
  switch (action.type) {
    case 'projeter': {
      const index = Math.max(0, Math.min(action.index, action.element.diapositives.length - 1));
      // Projeter une diapositive rétablit l'écran : un bénévole qui clique veut voir le texte.
      return suite({
        element: action.element,
        index,
        suivante: action.suivante ?? null,
        ecranNoir: false,
        texteMasque: false,
        logo: false,
      });
    }
    case 'definirSuivante':
      return suite({ suivante: action.suivante });
    case 'basculerEcranNoir':
      return suite({ ecranNoir: !etat.ecranNoir });
    case 'basculerMasquerTexte':
      return suite({ texteMasque: !etat.texteMasque, logo: false });
    case 'basculerLogo':
      return suite({ logo: !etat.logo, texteMasque: false });
    case 'basculerBilingue':
      return suite({ bilingue: !etat.bilingue });
    case 'appliquerTheme':
      return suite({ theme: { ...etat.theme, ...action.theme } });
    case 'effacer':
      return suite({ element: null, index: 0, suivante: null });
    case 'definirProgramme':
      return suite({ programme: action.programme });
    case 'definirSalle':
      return suite({ codeSalle: action.codeSalle });
  }
}

/** Diapositive en direct, ou null. */
export function diapositiveEnDirect(etat: EtatProjection): Diapositive | null {
  return etat.element?.diapositives[etat.index] ?? null;
}

/** Ce que la sortie doit montrer, par ordre de priorité. */
export type ContenuSortie = 'noir' | 'logo' | 'fond' | 'texte';

export function contenuSortie(etat: EtatProjection): ContenuSortie {
  if (etat.ecranNoir) return 'noir';
  if (etat.logo) return 'logo';
  if (etat.texteMasque || !diapositiveEnDirect(etat)) return 'fond';
  return 'texte';
}

// ─── Navigation dans une setlist ─────────────────────────────────────────────

/** Position dans une setlist développée : élément, puis diapositive dans l'élément. */
export interface PositionSetlist {
  element: number;
  diapositive: number;
}

interface AvecDiapositives {
  diapositives: readonly unknown[];
}

/** Diapositive suivante, en passant à l'élément suivant au bout ; null en fin de setlist. */
export function positionSuivante(elements: readonly AvecDiapositives[], pos: PositionSetlist): PositionSetlist | null {
  const courant = elements[pos.element];
  if (courant && pos.diapositive < courant.diapositives.length - 1) {
    return { element: pos.element, diapositive: pos.diapositive + 1 };
  }
  for (let i = pos.element + 1; i < elements.length; i++) {
    if ((elements[i]?.diapositives.length ?? 0) > 0) return { element: i, diapositive: 0 };
  }
  return null;
}

/** Diapositive précédente, en revenant à la dernière de l'élément précédent ; null au début. */
export function positionPrecedente(elements: readonly AvecDiapositives[], pos: PositionSetlist): PositionSetlist | null {
  if (pos.diapositive > 0) return { element: pos.element, diapositive: pos.diapositive - 1 };
  for (let i = pos.element - 1; i >= 0; i--) {
    const n = elements[i]?.diapositives.length ?? 0;
    if (n > 0) return { element: i, diapositive: n - 1 };
  }
  return null;
}

/** La « suivante » à afficher pour une position donnée. */
export function suivantePour(elements: readonly ElementProjete[], pos: PositionSetlist): DiapositiveSuivante | null {
  const p = positionSuivante(elements, pos);
  if (!p) return null;
  const element = elements[p.element];
  const diapositive = element?.diapositives[p.diapositive];
  if (!element || !diapositive) return null;
  return { titreElement: element.titre, changeElement: p.element !== pos.element, diapositive };
}
