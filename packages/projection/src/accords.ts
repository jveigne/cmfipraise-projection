/**
 * Noms d'accords et transposition — portage de cmfipraise-app/utils/praise/chordUtils.ts.
 *
 * Les accords arrivent du backend en indices de note (0 = Do) : transposer, c'est décaler
 * un entier modulo 12, sans jamais analyser une chaîne. `name` ne sert que de repli.
 */
import type { AccordDTO } from '@cmfi/api';

/** fr : Do Ré Mi ; en : C D E ; nns : degrés (Nashville Number System). */
export type Notation = 'fr' | 'en' | 'nns';

const DIESES_EN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BEMOLS_EN = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const DIESES_FR = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
const BEMOLS_FR = ['Do', 'Réb', 'Ré', 'Mib', 'Mi', 'Fa', 'Solb', 'Sol', 'Lab', 'La', 'Sib', 'Si'];

/** Noms usuels des tonalités pour un sélecteur (dièses et bémols selon l'usage). */
const TONALITES_EN = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const TONALITES_FR = ['Do', 'Do#', 'Ré', 'Mib', 'Mi', 'Fa', 'Fa#', 'Sol', 'Lab', 'La', 'Sib', 'Si'];

/** Tonalités qui s'écrivent en bémols : Fa, Si♭, Mi♭, La♭, Ré♭, Sol♭. */
const TONALITES_BEMOLS = new Set([5, 10, 3, 8, 1, 6]);

/**
 * Degrés NNS par intervalle depuis la tonique. Le mobile tenait deux tables, majeure et
 * mineure, mais elles donnent le même nom à chaque intervalle : une seule suffit.
 */
const DEGRES: Record<number, string> = { 0: '1', 1: 'b2', 2: '2', 3: 'b3', 4: '3', 5: '4', 6: '#4', 7: '5', 8: 'b6', 9: '6', 10: 'b7', 11: '7' };

/** Ramène un entier quelconque dans 0–11. */
export function modulo12(n: number): number {
  return ((n % 12) + 12) % 12;
}

export function nomNote(index: number, tonalite: number, notation: Exclude<Notation, 'nns'>): string {
  const bemols = TONALITES_BEMOLS.has(modulo12(tonalite));
  const table = notation === 'fr' ? (bemols ? BEMOLS_FR : DIESES_FR) : bemols ? BEMOLS_EN : DIESES_EN;
  return table[modulo12(index)] ?? '';
}

/** « Sol », « Mib », « G », « Eb » — avec « m » pour une tonalité mineure. */
export function nomTonalite(tonalite: number, mineur: boolean, notation: Exclude<Notation, 'nns'>): string {
  const nom = (notation === 'fr' ? TONALITES_FR : TONALITES_EN)[modulo12(tonalite)] ?? '';
  return mineur ? `${nom}m` : nom;
}

export interface OptionsAccord {
  /** Tonalité originale du chant (0–11). */
  tonalite: number;
  /** Demi-tons de transposition (négatif = plus bas). */
  transposition?: number;
  notation: Notation;
}

/** Nom affiché d'un accord, transposé si demandé. */
export function nomAccord(accord: Pick<AccordDTO, 'rootNoteIndex' | 'quality' | 'bassNoteIndex' | 'name'>, options: OptionsAccord): string {
  if (accord.rootNoteIndex == null) return accord.name ?? '';
  const qualite = accord.quality ?? '';

  if (options.notation === 'nns') {
    // Les degrés ne dépendent pas de la transposition : c'est tout leur intérêt.
    const degre = (i: number) => DEGRES[modulo12(i - options.tonalite)] ?? '?';
    const base = `${degre(accord.rootNoteIndex)}${qualite}`;
    return accord.bassNoteIndex != null ? `${base}/${degre(accord.bassNoteIndex)}` : base;
  }

  const decalage = options.transposition ?? 0;
  const tonalite = modulo12(options.tonalite + decalage);
  const racine = nomNote(accord.rootNoteIndex + decalage, tonalite, options.notation);
  const base = `${racine}${qualite}`;
  if (accord.bassNoteIndex == null) return base;
  return `${base}/${nomNote(accord.bassNoteIndex + decalage, tonalite, options.notation)}`;
}
