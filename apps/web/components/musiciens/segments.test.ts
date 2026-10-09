import type { AccordDTO } from '@cmfi/api';
import { describe, expect, it } from 'vitest';

import { aDesAccords, joliNomMusical, segmenterLigne } from './segments';

const accord = (nom: string, charIndex: number | null, wordIndex?: number): AccordDTO => ({ id: nom + charIndex, name: nom, charIndex, wordIndex });
const nommer = (a: AccordDTO) => a.name ?? '';

describe('segmenterLigne', () => {
  it('ancre chaque accord sur son caractère, texte de tête sans accord', () => {
    const ligne = { texte: 'Ô grâce précieuse', accords: [accord('G', 2), accord('G7', 8)] };
    expect(segmenterLigne(ligne, nommer)).toEqual([
      { accord: '', texte: 'Ô ' },
      { accord: 'G', texte: 'grâce ' },
      { accord: 'G7', texte: 'précieuse' },
    ]);
  });

  it('trie les accords et garde un espace sous un accord placé après la fin', () => {
    const ligne = { texte: 'toi.', accords: [accord('D', 10), accord('G', 0)] };
    expect(segmenterLigne(ligne, nommer)).toEqual([
      { accord: 'G', texte: 'toi.' },
      { accord: 'D', texte: ' ' },
    ]);
  });

  it('se replie sur wordIndex (ancien format)', () => {
    const ligne = { texte: 'Gloire à Dieu', accords: [accord('C', null, 2)] };
    expect(segmenterLigne(ligne, nommer)).toEqual([
      { accord: '', texte: 'Gloire à ' },
      { accord: 'C', texte: 'Dieu' },
    ]);
  });

  it('rend la ligne entière sans accord', () => {
    expect(segmenterLigne({ texte: 'Amen' }, nommer)).toEqual([{ accord: '', texte: 'Amen' }]);
    expect(aDesAccords([{ texte: 'Amen' }])).toBe(false);
  });
});

describe('joliNomMusical', () => {
  it('écrit bémols et dièses', () => {
    expect(joliNomMusical('Sib')).toBe('Si♭');
    expect(joliNomMusical('Bbm')).toBe('B♭m');
    expect(joliNomMusical('F#')).toBe('F♯');
    expect(joliNomMusical('Sol')).toBe('Sol');
  });
});
