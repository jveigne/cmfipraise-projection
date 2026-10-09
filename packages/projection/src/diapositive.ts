/**
 * Modèle de diapositive : ce que la sortie affiche, ce que la régie montre en vignette, ce
 * que l'écran des musiciens et les téléphones reçoivent. Sérialisable tel quel (aucune
 * fonction, aucune classe) : il traverse le BroadcastChannel.
 */
import type { AccordDTO } from '@cmfi/api';

export type GenreDiapositive = 'couplet' | 'refrain' | 'verset';

export interface LigneDiapositive {
  texte: string;
  /** Accords ancrés par `charIndex` : écran des musiciens seulement, jamais sur la sortie. */
  accords?: AccordDTO[];
}

export interface Diapositive {
  /** Stable pour un élément donné : `${idElement}:${index}`. */
  id: string;
  genre: GenreDiapositive;
  /** « 1. », « R. », « R2. », « v. 16 ». */
  libelle: string;
  /** Numéro de couplet, de refrain distinct ou de verset ; null pour un refrain unique. */
  numero: number | null;
  lignes: LigneDiapositive[];
  /** Seconde langue (chant bilingue) ou seconde version (Bible) ; null si aucune. */
  lignesSecondes: LigneDiapositive[] | null;
  /** « Jean 3:16 · LSG » pour un verset. */
  reference: string | null;
  referenceSeconde: string | null;
  /** Titre de psaume, projeté discrètement au-dessus du verset 1. */
  suscription?: string | null;
  /** Partie trop longue coupée en plusieurs diapositives : morceau `index` sur `total` (1-based). */
  morceau: { index: number; total: number } | null;
  /** Id du couplet/refrain d'origine : deux diapositives de même partId sont une répétition. */
  partId: number | null;
}

/** Un élément de setlist développé en diapositives, prêt à projeter. */
export interface ElementProjete {
  /** Id de l'élément de setlist. */
  id: string;
  genre: 'chant' | 'bible';
  titre: string;
  /** « Recueil CMFI · n° 112 · Sol », « LSG + KJV · 4 versets ». */
  meta: string;
  /** Ordre d'enchaînement lisible : « 1 R 2 R 3 R », « 1–4 ». */
  ordre: string;
  diapositives: Diapositive[];
  /** Tonalité du chant (0–11) pour l'écran des musiciens. */
  tonalite: { racine: number; mineur: boolean } | null;
  /**
   * Transposition choisie pour ce culte, en demi-tons (0 ou absent = tonalité originale).
   * Les accords restent ancrés dans la tonalité originale ; l'écran des musiciens les décale.
   */
  transposition?: number;
  /** Vrai si c'est un chant ou un arrangement de l'utilisateur (couleur violet). */
  personnel: boolean;
}

/** Texte brut d'une diapositive, lignes séparées par des retours à la ligne. */
export function texteDiapositive(d: Pick<Diapositive, 'lignes'>): string {
  return d.lignes.map((l) => l.texte).join('\n');
}
