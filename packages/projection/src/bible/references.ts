/**
 * Parseur de références bibliques, pour la barre unique de la régie et l'éditeur de setlist.
 *
 * Accepte ce qu'un bénévole tape réellement, en français comme en anglais :
 *   « Jn 3:16 », « Jean 3.16 », « Jean 3,16 », « Jn 3:16-18 », « Jn 3:16–4:2 »,
 *   « Ps 23 », « Psaume 23 », « Psalm 23:1-4 », « 1 Co 13 », « 1Jn 4:8 »,
 *   « I Corinthians 13:4-7 », « 1re Pierre 2:9 », « Jude 3 » (livre d'un seul chapitre).
 *
 * Tout ce qui n'est pas une référence certaine renvoie `null` : la barre unique cherche
 * alors un chant. Mieux vaut ne rien reconnaître que projeter le mauvais passage.
 */
import { LIVRES, livreParCode, nomLivre, type CodeLivre, type LivreBible } from './livres';

/**
 * Un passage continu. Chapitre entier : versetDebut = versetFin = null. Un verset :
 * versetDebut = versetFin. Peut franchir un chapitre (Jn 3:16–4:2).
 */
export interface ReferenceBiblique {
  livre: CodeLivre;
  chapitre: number;
  versetDebut: number | null;
  chapitreFin: number;
  versetFin: number | null;
}

/** Minuscules, sans accents, tirets typographiques ramenés à « - ». */
function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/** « 1re », « premier », « I », « first »… ramenés au chiffre, collé au nom du livre. */
function normaliserOrdinal(livre: string): string {
  return livre
    .replace(/^(premiere|premier|first|1st|1ere|1re|1er|1e)\s*/, '1')
    .replace(/^(deuxieme|second|seconde|2nd|2eme|2e)\s*/, '2')
    .replace(/^(troisieme|third|3rd|3eme|3e)\s*/, '3')
    .replace(/^(iii)\s+/, '3')
    .replace(/^(ii)\s+/, '2')
    .replace(/^(i)\s+/, '1')
    .replace(/[\s.]/g, '');
}

/** Index des formes acceptées → livre. Construit une fois. */
const INDEX_ALIAS: Map<string, CodeLivre> = (() => {
  const index = new Map<string, CodeLivre>();
  const cle = (s: string) => normaliserOrdinal(normaliser(s));
  for (const l of LIVRES) {
    const formes = [l.nomFr, l.nomEn, l.abregeFr, l.abregeEn, l.nomFrSingulier, l.nomEnSingulier, ...l.alias];
    for (const f of formes) if (f) index.set(cle(f), l.code);
  }
  return index;
})();

/** Noms complets normalisés, pour la reconnaissance par préfixe (« Philip », « Deuteron »). */
const NOMS_COMPLETS: { cle: string; code: CodeLivre }[] = LIVRES.flatMap((l) =>
  [l.nomFr, l.nomEn].map((n) => ({ cle: normaliserOrdinal(normaliser(n)), code: l.code }))
);

/** Livre désigné par un texte, ou null s'il est inconnu ou ambigu (« Jo » : Job, Jonas, Josué…). */
export function trouverLivre(texte: string): LivreBible | null {
  const cle = normaliserOrdinal(normaliser(texte));
  if (!cle) return null;
  const exact = INDEX_ALIAS.get(cle);
  if (exact) return livreParCode(exact);
  if (cle.replace(/^\d/, '').length < 3) return null;
  const candidats = new Set(NOMS_COMPLETS.filter((n) => n.cle.startsWith(cle)).map((n) => n.code));
  if (candidats.size !== 1) return null;
  const [code] = candidats;
  return code ? livreParCode(code) : null;
}

const MOTIF = new RegExp(
  '^' +
    // Livre : ordinal facultatif, puis lettres (espaces et points permis : « Cantique des cantiques », « 1 Co. »)
    '(?<livre>(?:[1-3](?:\\s*(?:er|re|ere|e|eme|st|nd|rd))?\\s*|(?:i{1,3})\\s+|(?:premier|premiere|deuxieme|troisieme|first|second|third)\\s+)?[a-z][a-z.\\s]*?)' +
    '\\s*(?<c1>\\d{1,3})' +
    '(?:\\s*[:.,]\\s*(?<v1>\\d{1,3}))?' +
    '(?:\\s*-\\s*(?:(?<c2>\\d{1,3})\\s*[:.,]\\s*)?(?<v2>\\d{1,3}))?' +
    '\\s*$'
);

/** Analyse une saisie ; null si ce n'est pas une référence valide. */
export function analyserReference(saisie: string): ReferenceBiblique | null {
  const texte = normaliser(saisie);
  const m = MOTIF.exec(texte);
  if (!m?.groups) return null;
  const { livre: nomSaisi, c1, v1, c2, v2 } = m.groups;
  if (!nomSaisi || !c1) return null;

  const livre = trouverLivre(nomSaisi);
  if (!livre) return null;

  let chapitre = Number(c1);
  let versetDebut: number | null = v1 ? Number(v1) : null;
  let chapitreFin = chapitre;
  let versetFin: number | null = versetDebut;

  if (versetDebut === null && livre.chapitres === 1) {
    // « Jude 3 », « Abdias 4 » : un livre d'un seul chapitre se cite par verset.
    versetDebut = chapitre;
    versetFin = chapitre;
    chapitre = 1;
    chapitreFin = 1;
    if (v2 && !c2) versetFin = Number(v2);
    else if (v2) return null;
  } else if (v2) {
    if (c2) {
      // Jn 3:16-4:2 — impossible sans verset de départ.
      if (versetDebut === null) return null;
      chapitreFin = Number(c2);
      versetFin = Number(v2);
    } else if (versetDebut === null) {
      // Ps 23-24 : plage de chapitres entiers.
      chapitreFin = Number(v2);
    } else {
      versetFin = Number(v2);
    }
  }

  if (chapitre < 1 || chapitre > livre.chapitres) return null;
  if (chapitreFin < chapitre || chapitreFin > livre.chapitres) return null;
  if (versetDebut !== null && versetDebut < 1) return null;
  if (versetFin !== null && versetDebut !== null && chapitreFin === chapitre && versetFin < versetDebut) return null;

  return { livre: livre.code, chapitre, versetDebut, chapitreFin, versetFin };
}

/** Vrai si la saisie est une référence biblique valide. */
export function estReferenceBiblique(saisie: string): boolean {
  return analyserReference(saisie) !== null;
}

export interface OptionsFormat {
  /** Abréviation du livre (« Jn 3:16 ») au lieu du nom complet (« Jean 3:16 »). */
  abrege?: boolean;
}

/** « Jean 3:16-18 », « Psaume 23 », « John 3:16–4:2 ». */
export function formaterReference(ref: ReferenceBiblique, langue: 'fr' | 'en', options: OptionsFormat = {}): string {
  const l = livreParCode(ref.livre);
  const unChapitre = ref.chapitre === ref.chapitreFin;
  const nom = options.abrege ? (langue === 'fr' ? l.abregeFr : l.abregeEn) : nomLivre(ref.livre, langue, unChapitre);

  // Livre d'un seul chapitre : « Jude 3 », pas « Jude 1:3 ».
  if (l.chapitres === 1 && ref.versetDebut !== null) {
    return ref.versetFin !== null && ref.versetFin !== ref.versetDebut
      ? `${nom} ${ref.versetDebut}-${ref.versetFin}`
      : `${nom} ${ref.versetDebut}`;
  }
  if (ref.versetDebut === null) {
    return unChapitre ? `${nom} ${ref.chapitre}` : `${nom} ${ref.chapitre}-${ref.chapitreFin}`;
  }
  if (!unChapitre) return `${nom} ${ref.chapitre}:${ref.versetDebut}–${ref.chapitreFin}:${ref.versetFin}`;
  if (ref.versetFin === null || ref.versetFin === ref.versetDebut) return `${nom} ${ref.chapitre}:${ref.versetDebut}`;
  return `${nom} ${ref.chapitre}:${ref.versetDebut}-${ref.versetFin}`;
}

/**
 * Livres dont le nom commence par la saisie, pour l'autocomplétion de la barre unique.
 * « jea » → Jean, « 1 co » → 1 Corinthiens. Au plus `limite` résultats, ordre du canon.
 */
export function suggererLivres(saisie: string, limite = 5): LivreBible[] {
  const cle = normaliserOrdinal(normaliser(saisie));
  if (!cle) return [];
  const exact = INDEX_ALIAS.get(cle);
  const codes = new Set<CodeLivre>(exact ? [exact] : []);
  for (const n of NOMS_COMPLETS) if (n.cle.startsWith(cle)) codes.add(n.code);
  return LIVRES.filter((l) => codes.has(l.code)).slice(0, limite);
}
