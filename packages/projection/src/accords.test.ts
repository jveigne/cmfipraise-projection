import { describe, expect, it } from 'vitest';

import { modulo12, nomAccord, nomTonalite } from './accords';

describe('accords', () => {
  const sol = { rootNoteIndex: 7, quality: '' };
  const re7 = { rootNoteIndex: 2, quality: '7' };
  const solSurSi = { rootNoteIndex: 7, quality: '', bassNoteIndex: 11 };

  it('nomme en français et en anglais', () => {
    expect(nomAccord(sol, { tonalite: 7, notation: 'fr' })).toBe('Sol');
    expect(nomAccord(re7, { tonalite: 7, notation: 'en' })).toBe('D7');
    expect(nomAccord(solSurSi, { tonalite: 7, notation: 'en' })).toBe('G/B');
  });

  it('transpose en suivant la tonalité d’arrivée (bémols en Fa)', () => {
    expect(nomAccord(sol, { tonalite: 7, transposition: -2, notation: 'en' })).toBe('F');
    expect(nomAccord(re7, { tonalite: 7, transposition: -2, notation: 'en' })).toBe('C7');
    expect(nomAccord({ rootNoteIndex: 9, quality: 'm' }, { tonalite: 0, transposition: 1, notation: 'en' })).toBe('Bbm');
  });

  it('NNS insensible à la transposition', () => {
    expect(nomAccord(re7, { tonalite: 7, notation: 'nns' })).toBe('57');
    expect(nomAccord(solSurSi, { tonalite: 7, transposition: 3, notation: 'nns' })).toBe('1/3');
  });

  it('repli sur le nom fourni par le backend', () => {
    expect(nomAccord({ name: 'Sus4' }, { tonalite: 0, notation: 'fr' })).toBe('Sus4');
  });

  it('tonalités', () => {
    expect(nomTonalite(10, false, 'fr')).toBe('Sib');
    expect(nomTonalite(9, true, 'en')).toBe('Am');
    expect(modulo12(-1)).toBe(11);
  });
});
