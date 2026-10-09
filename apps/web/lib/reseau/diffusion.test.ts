import { etatInitial, reduireProjection, resumerProgramme, type ElementProjete } from '@cmfi/projection';
import { describe, expect, it } from 'vitest';

import { diffuserDepuisEtat } from './diffusion';

const chant: ElementProjete = {
  id: 'e1',
  genre: 'chant',
  titre: 'Grâce infinie',
  meta: '',
  ordre: '1 R 2',
  tonalite: { racine: 7, mineur: false },
  personnel: false,
  diapositives: [
    { id: 'e1:0', genre: 'couplet', libelle: '1.', numero: 1, lignes: [{ texte: 'Grâce', accords: [{ id: 'a', name: 'G', charIndex: 0 }] }], lignesSecondes: [{ texte: 'Grace' }], reference: null, referenceSeconde: null, morceau: null, partId: 1 },
    { id: 'e1:1', genre: 'refrain', libelle: 'R.', numero: null, lignes: [{ texte: 'Gloire' }], lignesSecondes: null, reference: null, referenceSeconde: null, morceau: null, partId: 2 },
  ],
};

describe('diffuserDepuisEtat', () => {
  it('ne garde que le texte, la position et les bascules', () => {
    let etat = reduireProjection(etatInitial(0), { type: 'projeter', element: chant, index: 1 }, 1);
    etat = reduireProjection(etat, { type: 'definirProgramme', programme: resumerProgramme('Culte', [chant, chant], 0) }, 2);
    const d = diffuserDepuisEtat(etat, { langueParoles: 'fr' });
    expect(d.titre).toBe('Grâce infinie');
    expect(d.programme).toEqual({ nom: 'Culte', position: 1, total: 2 });
    expect(d.enDirect?.lignes).toEqual(['Gloire']);
    expect(d.precedente?.lignes).toEqual(['Grâce']);
    // Aucun accord ne quitte la régie.
    expect(JSON.stringify(d)).not.toContain('charIndex');
    expect(d.langues).toEqual({ premiere: 'fr', seconde: null });
  });

  it('annonce la seconde langue quand la diapositive en a une', () => {
    const etat = reduireProjection(etatInitial(0), { type: 'projeter', element: chant, index: 0 }, 1);
    expect(diffuserDepuisEtat(etat, { langueParoles: 'en' }).langues).toEqual({ premiere: 'en', seconde: 'fr' });
  });

  it('lit les versions bibliques dans la référence', () => {
    const verset: ElementProjete = {
      ...chant,
      genre: 'bible',
      diapositives: [{ ...chant.diapositives[0]!, genre: 'verset', reference: 'Jean 3:16 · LSG', referenceSeconde: 'John 3:16 · KJV' }],
    };
    const etat = reduireProjection(etatInitial(0), { type: 'projeter', element: verset, index: 0 }, 1);
    expect(diffuserDepuisEtat(etat, { langueParoles: 'fr' }).langues).toEqual({ premiere: 'LSG', seconde: 'KJV' });
  });
});
