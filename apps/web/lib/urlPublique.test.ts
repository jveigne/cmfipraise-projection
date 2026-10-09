import { describe, expect, it } from 'vitest';

import { URL_PUBLIQUE_PAR_DEFAUT, originePublique } from './urlPublique';

describe('originePublique', () => {
  it('garde l’origine du site sur le web', () => {
    expect(originePublique({ protocol: 'http:', origin: 'http://localhost:3000' })).toBe('http://localhost:3000');
    expect(originePublique({ protocol: 'https:', origin: 'https://www.cmfipraise.com' })).toBe('https://www.cmfipraise.com');
  });

  it('renvoie au site public depuis l’app de bureau', () => {
    expect(originePublique({ protocol: 'app:', origin: 'null' })).toBe(URL_PUBLIQUE_PAR_DEFAUT);
    expect(URL_PUBLIQUE_PAR_DEFAUT).toBe('https://www.cmfipraise.com');
  });
});
