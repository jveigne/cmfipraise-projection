/**
 * Outils de texte de la bibliothèque : recherche tolérante (accents, casse, apostrophes),
 * premier vers d'un chant, découpage d'une ligne de paroles selon ses accords.
 *
 * Fonctions pures, sans React : testées dans texte.test.ts.
 */
import type { AccordDTO, ChantDTO } from '@cmfi/api';
import { partiesDuChant } from '@cmfi/projection';

/** Minuscules, sans accents ni ponctuation typographique : « Grâce » trouve « grace ». */
export function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Premier vers non vide, dans l'ordre d'enchaînement (ce que l'on reconnaît d'un chant). */
export function premierVers(chant: ChantDTO): string {
  const premiere = partiesDuChant(chant)[0]?.lignes[0]?.texte;
  return premiere?.trim() ?? '';
}

/** Vrai si le chant porte au moins un accord. `hasChord` n'est pas toujours renseigné. */
export function aDesAccords(chant: ChantDTO): boolean {
  if (chant.hasChord) return true;
  return partiesDuChant(chant).some((p) => p.lignes.some((l) => (l.accords?.length ?? 0) > 0));
}

export interface CandidatRecherche {
  chant: ChantDTO;
  recueil: string;
}

export interface ResultatRecherche extends CandidatRecherche {
  /** 0 = numéro exact, 1 = titre qui commence par, 2 = titre qui contient, 3 = premier vers. */
  rang: number;
}

/**
 * Recherche locale : titre, numéro ou premier vers, comme l'annonce le design. Le numéro
 * exact passe devant tout : « 112 » doit ouvrir le 112, pas le 1120.
 */
export function rechercherLocalement(requete: string, candidats: readonly CandidatRecherche[], limite = 80): ResultatRecherche[] {
  const q = normaliser(requete);
  if (!q) return [];
  const estNumero = /^\d+$/.test(q);
  const resultats: ResultatRecherche[] = [];
  for (const c of candidats) {
    let rang: number | null = null;
    if (estNumero && String(c.chant.position) === q) rang = 0;
    else {
      const titre = normaliser(c.chant.title);
      if (titre.startsWith(q)) rang = 1;
      else if (titre.includes(q)) rang = 2;
      else if (normaliser(premierVers(c.chant)).includes(q)) rang = 3;
      else if (estNumero && String(c.chant.position).startsWith(q)) rang = 4;
    }
    if (rang !== null) resultats.push({ ...c, rang });
  }
  resultats.sort((a, b) => a.rang - b.rang || a.chant.position - b.chant.position || a.chant.title.localeCompare(b.chant.title));
  return resultats.slice(0, limite);
}

/** Un morceau de ligne : le texte qui suit un accord, jusqu'à l'accord suivant. */
export interface SegmentParoles {
  accord: AccordDTO | null;
  texte: string;
}

/**
 * Découpe une ligne aux positions de ses accords (`charIndex`, sinon début du mot
 * `wordIndex`, comme le mobile — utils/praise/chordPlacement.ts). Chaque segment pose son
 * accord au-dessus de son premier caractère : la position vient de la mise en page réelle,
 * jamais d'une largeur de caractère devinée.
 */
export function segmenterLigne(ligne: string, accords: readonly AccordDTO[] | undefined): SegmentParoles[] {
  if (!accords || accords.length === 0) return [{ accord: null, texte: ligne }];

  const debutsMots: number[] = [];
  for (const m of ligne.matchAll(/\S+/g)) debutsMots.push(m.index ?? 0);

  const places = accords
    .map((accord) => {
      let index = 0;
      if (accord.charIndex != null && accord.charIndex >= 0) index = accord.charIndex;
      else if (accord.wordIndex != null && accord.wordIndex >= 0) index = debutsMots[accord.wordIndex] ?? 0;
      return { accord, index: Math.min(index, ligne.length) };
    })
    .sort((a, b) => a.index - b.index);

  const segments: SegmentParoles[] = [];
  const premier = places[0];
  if (premier && premier.index > 0) segments.push({ accord: null, texte: ligne.slice(0, premier.index) });
  places.forEach((p, i) => {
    const fin = places[i + 1]?.index ?? ligne.length;
    segments.push({ accord: p.accord, texte: ligne.slice(p.index, fin) });
  });
  return segments;
}
