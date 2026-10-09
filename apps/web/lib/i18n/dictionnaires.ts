/**
 * Registre des modules de traduction. Ajouter un module = un fichier <module>.ts créé avec
 * definirModule(), puis une ligne ici.
 */
import { accueil } from './accueil';
import { appairage } from './appairage';
import { bibliotheque } from './bibliotheque';
import { commun } from './commun';
import { don } from './don';
import { etats } from './etats';
import { musiciens } from './musiciens';
import { reglages } from './reglages';
import { regie } from './regie';
import { setlist } from './setlist';
import { sortie } from './sortie';
import { telephone } from './telephone';
import type { Langue } from './outils';

export const dictionnaires = {
  commun,
  accueil,
  bibliotheque,
  setlist,
  don,
  regie,
  sortie,
  musiciens,
  appairage,
  telephone,
  reglages,
  etats,
} as const;

export type NomModule = keyof typeof dictionnaires;
export type Textes<M extends NomModule> = (typeof dictionnaires)[M]['fr'];

/** Textes d'un module dans une langue, hors React (métadonnées, tests). */
export function textes<M extends NomModule>(module: M, langue: Langue): Textes<M> {
  return dictionnaires[module][langue] as Textes<M>;
}
