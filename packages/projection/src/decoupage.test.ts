import type { ChantDTO } from '@cmfi/api';
import { describe, expect, it } from 'vitest';

import { sourceEchantillon } from './bible/echantillon';
import { analyserReference } from './bible/references';
import { decouperChant, elementDepuisChant, elementDepuisPassage } from './decoupage';

const lignes = (...l: string[]) => l.map((line) => ({ line }));

/** Chant d'exemple : structure de « Grâce infinie » (1 R 2 R 3 R), paroles factices. */
const chant: ChantDTO = {
  id: 'c112',
  title: 'Grâce infinie',
  position: 112,
  keyRootIndex: 7,
  parts: [
    { position: 2, type: 'CHORUS', partId: 90, lines: lignes('r1', 'r2') },
    { position: 1, type: 'VERSE', partId: 1, lines: lignes('a1', 'a2', 'a3', 'a4') },
    { position: 3, type: 'VERSE', partId: 2, lines: lignes('b1', 'b2') },
    { position: 4, type: 'CHORUS', partId: 90, lines: lignes('r1', 'r2') },
    { position: 5, type: 'VERSE', partId: 3, lines: lignes('c1', '  ', 'c2') },
    { position: 6, type: 'CHORUS', partId: 90, lines: lignes('r1', 'r2') },
  ],
};

describe('decouperChant', () => {
  it('suit l’ordre d’enchaînement et répète le refrain', () => {
    const { diapositives, ordre } = decouperChant(chant);
    expect(ordre).toBe('1 R 2 R 3 R');
    expect(diapositives.map((d) => d.libelle)).toEqual(['1.', 'R.', '2.', 'R.', '3.', 'R.']);
    expect(diapositives[1]?.genre).toBe('refrain');
    expect(diapositives[1]?.partId).toBe(diapositives[3]?.partId);
    expect(diapositives[4]?.lignes.map((l) => l.texte)).toEqual(['c1', 'c2']);
    expect(diapositives.map((d) => d.id)).toEqual(['c112:0', 'c112:1', 'c112:2', 'c112:3', 'c112:4', 'c112:5']);
  });

  it('numérote les refrains quand il y en a plusieurs', () => {
    const deux: ChantDTO = {
      ...chant,
      parts: [
        { position: 1, type: 'VERSE', partId: 1, lines: lignes('a') },
        { position: 2, type: 'CHORUS', partId: 10, lines: lignes('r') },
        { position: 3, type: 'CHORUS', partId: 11, lines: lignes('s') },
      ],
    };
    const { diapositives, ordre } = decouperChant(deux);
    expect(ordre).toBe('1 R1 R2');
    expect(diapositives.map((d) => d.libelle)).toEqual(['1.', 'R1.', 'R2.']);
  });

  it('coupe une partie trop longue en morceaux équilibrés', () => {
    const long: ChantDTO = { ...chant, parts: [{ position: 1, type: 'VERSE', partId: 1, lines: lignes('1', '2', '3', '4', '5', '6', '7') }] };
    const { diapositives } = decouperChant(long, { lignesMax: 6 });
    expect(diapositives.map((d) => d.lignes.length)).toEqual([4, 3]);
    expect(diapositives.map((d) => d.morceau)).toEqual([{ index: 1, total: 2 }, { index: 2, total: 2 }]);
    expect(decouperChant(long, { lignesMax: 0 }).diapositives).toHaveLength(1);
  });

  it('apparie la seconde langue par rang', () => {
    const en: ChantDTO = {
      id: 'e1',
      title: 'Amazing Grace',
      position: 1,
      parts: chant.parts!.map((p) => ({ ...p, lines: p.lines.map((l) => ({ line: `EN ${l.line}` })) })),
    };
    const { diapositives } = decouperChant(chant, { chantSecond: en });
    expect(diapositives[0]?.lignesSecondes?.map((l) => l.texte)).toEqual(['EN a1', 'EN a2', 'EN a3', 'EN a4']);
  });

  it('retombe sur l’ancien format couplets / refrains', () => {
    const ancien: ChantDTO = {
      id: 'x',
      title: 'Ancien',
      position: 1,
      verses: [{ lines: lignes('a') }, { lines: lignes('b') }],
      choruses: [{ lines: lignes('r') }],
    };
    expect(decouperChant(ancien).ordre).toBe('1 R 2 R');
  });

  it('élément projetable avec tonalité', () => {
    const e = elementDepuisChant(chant, { idElement: 'el-1', meta: 'Recueil CMFI · n° 112 · Sol' });
    expect(e.id).toBe('el-1');
    expect(e.tonalite).toEqual({ racine: 7, mineur: false });
    expect(e.diapositives[0]?.id).toBe('el-1:0');
  });
});

describe('elementDepuisPassage', () => {
  it('une diapositive par verset, seconde version appariée', async () => {
    const r = analyserReference('Ps 23')!;
    const lsg = (await sourceEchantillon.lirePassage('LSG', r))!;
    const kjv = (await sourceEchantillon.lirePassage('KJV', r))!;
    const e = elementDepuisPassage(lsg, kjv);
    expect(e.titre).toBe('Psaume 23');
    expect(e.ordre).toBe('1–6');
    expect(e.meta).toBe('LSG + KJV');
    expect(e.diapositives[0]?.reference).toBe('Psaume 23:1 · LSG');
    expect(e.diapositives[0]?.referenceSeconde).toBe('Psalm 23:1 · KJV');
    expect(e.diapositives[3]?.lignesSecondes?.[0]?.texte).toMatch(/^Yea, though I walk/);
  });
});
