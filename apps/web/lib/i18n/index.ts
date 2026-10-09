/**
 * Dictionnaires FR/EN, un fichier par module. FR par défaut.
 *
 *   const t = useT('regie');      // dans un composant client
 *   <span>{t.suivant}</span>
 *
 * Chaque module appartient à l'écran qui porte son nom ; `commun` et `etats` servent à tous.
 */
export { dictionnaires, textes } from './dictionnaires';
export type { NomModule, Textes } from './dictionnaires';
export { formater, pluriel, LANGUES, LANGUE_PAR_DEFAUT } from './outils';
export type { Langue } from './outils';
export { FournisseurLangue, useLangue, useT } from './contexte';
