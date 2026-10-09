import type { ChantDTO } from '@cmfi/api';
import { describe, expect, it } from 'vitest';

import { normaliser, premierVers, rechercherLocalement, segmenterLigne } from './texte';

function chant(id: string, position: number, title: string, premiere: string): ChantDTO {
  return {
    id,
    position,
    title,
    parts: [{ position: 1, type: 'VERSE', partId: 1, lines: [{ line: premiere }] }],
  };
}

const candidats = [
  { chant: chant('a', 112, 'Grâce infinie', 'Grâce infinie, ô son si doux,'), recueil: 'Recueil CMFI' },
  { chant: chant('b', 1120, 'Louange', 'Que tout ce qui respire'), recueil: 'Recueil CMFI' },
  { chant: chant('c', 58, 'Par grâce, je suis sauvé', 'Par grâce je suis sauvé'), recueil: 'Recueil CMFI' },
  { chant: chant('d', 3, 'Amazing Grace', 'Amazing grace, how sweet the sound'), recueil: 'Hymns' },
];

describe('normaliser', () => {
  it('ignore accents, casse et apostrophes typographiques', () => {
    expect(normaliser('  Grâce   INFINIE ')).toBe('grace infinie');
    expect(normaliser('L’Éternel')).toBe("l'eternel");
  });
});

describe('rechercherLocalement', () => {
  it('le numéro exact passe devant les numéros qui commencent pareil', () => {
    const r = rechercherLocalement('112', candidats);
    expect(r.map((x) => x.chant.id)).toEqual(['a', 'b']);
  });

  it('trouve par titre sans accents, le début du titre avant le milieu', () => {
    const r = rechercherLocalement('grace', candidats);
    // « Grâce infinie » commence par la requête ; les deux autres la contiennent (par numéro).
    expect(r.map((x) => x.chant.id)).toEqual(['a', 'd', 'c']);
  });

  it('trouve par premier vers', () => {
    expect(rechercherLocalement('tout ce qui respire', candidats).map((x) => x.chant.id)).toEqual(['b']);
  });

  it('ne renvoie rien pour une requête vide', () => {
    expect(rechercherLocalement('   ', candidats)).toEqual([]);
  });
});

describe('premierVers', () => {
  it('prend la première ligne non vide de l’arrangement', () => {
    expect(premierVers(candidats[0]!.chant)).toBe('Grâce infinie, ô son si doux,');
  });
});

describe('segmenterLigne', () => {
  it('coupe aux positions des accords, texte avant le premier accord compris', () => {
    const s = segmenterLigne('Qui vint me relever ;', [{ id: '1', rootNoteIndex: 2, charIndex: 15 }]);
    expect(s.map((x) => x.texte)).toEqual(['Qui vint me rel', 'ever ;']);
    expect(s[0]?.accord).toBeNull();
    expect(s[1]?.accord?.rootNoteIndex).toBe(2);
  });

  it('trie les accords et se replie sur wordIndex', () => {
    const s = segmenterLigne('Gloire à Jésus', [
      { id: '2', rootNoteIndex: 0, wordIndex: 2 },
      { id: '1', rootNoteIndex: 7, charIndex: 0 },
    ]);
    expect(s.map((x) => x.texte)).toEqual(['Gloire à ', 'Jésus']);
  });

  it('une ligne sans accord reste entière', () => {
    expect(segmenterLigne('Amen', [])).toEqual([{ accord: null, texte: 'Amen' }]);
  });
});
