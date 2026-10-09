import { describe, expect, it } from 'vitest';

import type { ElementProjete } from './diapositive';
import { resumerProgramme, tonaliteJouee } from './programme';

const element = (id: string, modif: Partial<ElementProjete> = {}): ElementProjete => ({
  id,
  genre: 'chant',
  titre: id,
  meta: '',
  ordre: '',
  diapositives: [],
  tonalite: { racine: 5, mineur: false },
  personnel: false,
  ...modif,
});

describe('tonaliteJouee', () => {
  it('décale la tonalité originale de la transposition, modulo 12', () => {
    expect(tonaliteJouee(element('a', { transposition: 2 }))).toEqual({ racine: 7, mineur: false });
    expect(tonaliteJouee(element('a', { transposition: -7 }))).toEqual({ racine: 10, mineur: false });
  });

  it('renvoie null pour une lecture', () => {
    expect(tonaliteJouee(element('a', { genre: 'bible', tonalite: null }))).toBeNull();
  });
});

describe('resumerProgramme', () => {
  it('résume sans les diapositives et borne la position', () => {
    const r = resumerProgramme('Culte', [element('a'), element('b')], 1);
    expect(r.position).toBe(1);
    expect(r.elements).toHaveLength(2);
    expect(r.elements[0]).not.toHaveProperty('diapositives');
    expect(resumerProgramme('Culte', [element('a')], 4).position).toBe(-1);
  });
});

describe('action definirProgramme', () => {
  it('joint le programme à l’état sans toucher au reste', async () => {
    const { etatInitial, reduireProjection } = await import('./etat');
    const avant = etatInitial(0);
    const programme = resumerProgramme('Culte', [element('a')], 0);
    const apres = reduireProjection(avant, { type: 'definirProgramme', programme }, 1);
    expect(apres.programme).toEqual(programme);
    expect(apres.element).toBeNull();
    expect(apres.misAJourLe).toBe(1);
  });
});
