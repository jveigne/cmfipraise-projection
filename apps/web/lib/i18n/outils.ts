/**
 * Outils des dictionnaires. Fichier à part de index.ts pour que chaque module puisse
 * l'importer sans cycle (index.ts importe tous les modules).
 */

export type Langue = 'fr' | 'en';

export const LANGUES: readonly Langue[] = ['fr', 'en'];
export const LANGUE_PAR_DEFAUT: Langue = 'fr';

/** Un dictionnaire : des chaînes, éventuellement avec des marqueurs « {nom} ». */
export type Dictionnaire = Record<string, string>;

/** L'anglais doit avoir exactement les clés du français : le compilateur le vérifie. */
export type Traduction<F extends Dictionnaire> = { [K in keyof F]: string };

export interface ModuleI18n<F extends Dictionnaire> {
  fr: F;
  en: Traduction<F>;
}

/**
 * Déclare un module de traductions. Le français fait foi ; une clé ajoutée en français et
 * oubliée en anglais (ou l'inverse) est une erreur de compilation.
 *
 *   export const regie = definirModule(
 *     { suivant: 'Suivant', enDirect: 'En direct · {titre}' },
 *     { suivant: 'Next slide', enDirect: 'Live · {titre}' },
 *   );
 */
export function definirModule<F extends Dictionnaire>(fr: F, en: Traduction<F>): ModuleI18n<F> {
  return { fr, en };
}

/** Remplace les marqueurs « {nom} » : formater('{n} éléments', { n: 5 }) → « 5 éléments ». */
export function formater(modele: string, valeurs: Record<string, string | number>): string {
  return modele.replace(/\{(\w+)\}/g, (tout, cle: string) => (cle in valeurs ? String(valeurs[cle]) : tout));
}

/**
 * Choisit entre singulier et pluriel (règle française : 0 et 1 au singulier).
 *   pluriel(n, t.element, t.elements)
 */
export function pluriel(n: number, singulier: string, plurielForme: string, langue: Langue = 'fr'): string {
  const unSeul = langue === 'fr' ? Math.abs(n) < 2 : Math.abs(n) === 1;
  return formater(unSeul ? singulier : plurielForme, { n });
}
