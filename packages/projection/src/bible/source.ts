/**
 * Dépôt de textes bibliques.
 *
 * Seules des versions du DOMAINE PUBLIC sont admises (Louis Segond 1910, King James) : une
 * version sous droits ne peut pas être projetée sans licence, et l'app ne doit jamais
 * mettre une église dans cette situation. Aucun texte n'est jamais généré ni reconstitué :
 * un verset absent de la source est absent, l'interface le dit.
 *
 * Aujourd'hui seule existe la source d'ÉCHANTILLON (echantillon.ts). L'import complet
 * implémentera la même interface, adossée au magasin IndexedDB `bibles` de @cmfi/api.
 */
import type { CodeLivre } from './livres';
import type { ReferenceBiblique } from './references';

export type IdVersion = 'LSG' | 'KJV';

export interface VersionBible {
  id: IdVersion;
  nom: string;
  /** Abréviation affichée après la référence : « Jean 3:16 · LSG ». */
  abrege: string;
  langue: 'fr' | 'en';
  domainePublic: true;
  /** Vrai tant que seule une poignée de passages est disponible. L'interface l'affiche. */
  echantillon: boolean;
}

export interface VersetBiblique {
  livre: CodeLivre;
  chapitre: number;
  numero: number;
  texte: string;
  /**
   * Titre de psaume (« Cantique de David. »). Dans la LSG il fait partie du verset 1 ; on
   * le sépare pour pouvoir le projeter plus discrètement, sans rien en retrancher.
   */
  suscription?: string;
}

export interface PassageBiblique {
  reference: ReferenceBiblique;
  version: VersionBible;
  versets: VersetBiblique[];
  /** Vrai si la source n'a pas tous les versets demandés. */
  incomplet: boolean;
}

export interface BibleSource {
  versions(): VersionBible[];
  /** Le passage, ou null si la source n'en a aucun verset. */
  lirePassage(version: IdVersion, reference: ReferenceBiblique): Promise<PassageBiblique | null>;
  /** Vrai si la source a au moins un verset du passage (pour l'état hors-ligne). */
  contient(version: IdVersion, reference: ReferenceBiblique): Promise<boolean>;
}
