import { describe, expect, it } from 'vitest';

import { dictionnaires } from './dictionnaires';
import { formater, pluriel } from './outils';

describe('i18n', () => {
  it('formate les marqueurs et laisse les inconnus', () => {
    expect(formater('{n} éléments · {x}', { n: 5 })).toBe('5 éléments · {x}');
  });

  it('pluriel français (0 et 1 au singulier) et anglais', () => {
    expect(pluriel(0, '{n} élément', '{n} éléments')).toBe('0 élément');
    expect(pluriel(2, '{n} élément', '{n} éléments')).toBe('2 éléments');
    expect(pluriel(0, '{n} item', '{n} items', 'en')).toBe('0 items');
  });

  it('chaque module a les mêmes clés en français et en anglais', () => {
    for (const [nom, module] of Object.entries(dictionnaires)) {
      expect(Object.keys(module.en).sort(), nom).toEqual(Object.keys(module.fr).sort());
    }
  });
});
