/**
 * Découpe une ligne de paroles en segments « accord au-dessus, texte en dessous » pour
 * l'écran des musiciens : chaque accord est ancré sur un caractère (`charIndex`) et
 * couvre le texte jusqu'à l'accord suivant. Pure, testée.
 */
import type { AccordDTO } from '@cmfi/api';
import type { LigneDiapositive } from '@cmfi/projection';

export interface Segment {
  /** Nom affiché de l'accord, '' pour le texte qui précède le premier accord. */
  accord: string;
  texte: string;
}

/** Index du premier caractère du mot n (ancien format `wordIndex`). */
function debutDuMot(ligne: string, mot: number): number {
  const re = /\S+/g;
  let n = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(ligne))) {
    if (n === mot) return m.index;
    n += 1;
  }
  return ligne.length;
}

function position(ligne: string, a: AccordDTO): number | null {
  if (a.charIndex != null) return Math.max(0, a.charIndex);
  if (a.wordIndex != null) return debutDuMot(ligne, a.wordIndex);
  return null;
}

export function segmenterLigne(ligne: LigneDiapositive, nommer: (a: AccordDTO) => string): Segment[] {
  const texte = ligne.texte;
  const ancres = (ligne.accords ?? [])
    .map((a) => ({ pos: position(texte, a), nom: nommer(a) }))
    .filter((a): a is { pos: number; nom: string } => a.pos !== null && a.nom !== '')
    .sort((a, b) => a.pos - b.pos);

  if (ancres.length === 0) return [{ accord: '', texte }];

  const segments: Segment[] = [];
  const premier = ancres[0]!.pos;
  if (premier > 0) segments.push({ accord: '', texte: texte.slice(0, Math.min(premier, texte.length)) });
  ancres.forEach((a, i) => {
    const debut = Math.min(a.pos, texte.length);
    const fin = i + 1 < ancres.length ? Math.min(ancres[i + 1]!.pos, texte.length) : texte.length;
    // Un accord après la fin du texte (fin de vers instrumentale) garde un espace sous lui.
    const morceau = texte.slice(debut, fin);
    segments.push({ accord: a.nom, texte: morceau === '' && i === ancres.length - 1 ? ' ' : morceau });
  });
  return segments;
}

/** Vrai si au moins une ligne porte un accord : sinon on n'affiche pas la rangée d'accords. */
export function aDesAccords(lignes: readonly LigneDiapositive[]): boolean {
  return lignes.some((l) => (l.accords?.length ?? 0) > 0);
}

/** « Sib » → « Si♭ », « F#m » → « F♯m » : l'écriture musicale, pour les tonalités. */
export function joliNomMusical(nom: string): string {
  return nom.replace(/^(Do|Ré|Mi|Fa|Sol|La|Si|[A-G])b/, '$1♭').replace(/^(Do|Ré|Mi|Fa|Sol|La|Si|[A-G])#/, '$1♯');
}
