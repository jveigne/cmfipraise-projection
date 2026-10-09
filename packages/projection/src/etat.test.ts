import { describe, expect, it } from 'vitest';

import type { ElementProjete } from './diapositive';
import {
  contenuSortie,
  diapositiveEnDirect,
  etatInitial,
  positionPrecedente,
  positionSuivante,
  reduireProjection,
  suivantePour,
} from './etat';

function element(id: string, n: number): ElementProjete {
  return {
    id,
    genre: 'chant',
    titre: id,
    meta: '',
    ordre: '',
    tonalite: null,
    personnel: false,
    diapositives: Array.from({ length: n }, (_, i) => ({
      id: `${id}:${i}`,
      genre: 'couplet' as const,
      libelle: `${i + 1}.`,
      numero: i + 1,
      lignes: [{ texte: `${id}-${i}` }],
      lignesSecondes: null,
      reference: null,
      referenceSeconde: null,
      morceau: null,
      partId: i,
    })),
  };
}

const setlist = [element('a', 2), element('vide', 0), element('b', 3)];

describe('reduireProjection', () => {
  it('projeter rétablit l’écran', () => {
    let e = etatInitial(0);
    e = reduireProjection(e, { type: 'basculerEcranNoir' }, 1);
    e = reduireProjection(e, { type: 'basculerLogo' }, 2);
    expect(contenuSortie(e)).toBe('noir');
    e = reduireProjection(e, { type: 'projeter', element: setlist[0]!, index: 1 }, 3);
    expect(e.ecranNoir).toBe(false);
    expect(e.logo).toBe(false);
    expect(diapositiveEnDirect(e)?.id).toBe('a:1');
    expect(contenuSortie(e)).toBe('texte');
    expect(e.misAJourLe).toBe(3);
  });

  it('Masquer et Logo s’excluent', () => {
    let e = reduireProjection(etatInitial(0), { type: 'projeter', element: setlist[0]!, index: 0 });
    e = reduireProjection(e, { type: 'basculerMasquerTexte' });
    expect(contenuSortie(e)).toBe('fond');
    e = reduireProjection(e, { type: 'basculerLogo' });
    expect(e.texteMasque).toBe(false);
    expect(contenuSortie(e)).toBe('logo');
  });

  it('borne l’index et applique un thème partiel', () => {
    let e = reduireProjection(etatInitial(0), { type: 'projeter', element: setlist[0]!, index: 9 });
    expect(e.index).toBe(1);
    e = reduireProjection(e, { type: 'appliquerTheme', theme: { fond: 'noir' } });
    expect(e.theme.fond).toBe('noir');
    expect(e.theme.afficherReference).toBe(true);
    e = reduireProjection(e, { type: 'effacer' });
    expect(contenuSortie(e)).toBe('fond');
  });

  it('joint puis retire le code de la salle sans toucher au direct', () => {
    let e = reduireProjection(etatInitial(0), { type: 'projeter', element: setlist[0]!, index: 1 });
    e = reduireProjection(e, { type: 'definirSalle', codeSalle: 'K7MQ2X' });
    expect(e.codeSalle).toBe('K7MQ2X');
    expect(e.index).toBe(1);
    e = reduireProjection(e, { type: 'definirSalle', codeSalle: null });
    expect(e.codeSalle).toBeNull();
  });
});

describe('navigation dans la setlist', () => {
  it('passe à l’élément suivant en sautant les éléments vides', () => {
    expect(positionSuivante(setlist, { element: 0, diapositive: 0 })).toEqual({ element: 0, diapositive: 1 });
    expect(positionSuivante(setlist, { element: 0, diapositive: 1 })).toEqual({ element: 2, diapositive: 0 });
    expect(positionSuivante(setlist, { element: 2, diapositive: 2 })).toBeNull();
  });

  it('revient à la dernière diapositive de l’élément précédent', () => {
    expect(positionPrecedente(setlist, { element: 2, diapositive: 0 })).toEqual({ element: 0, diapositive: 1 });
    expect(positionPrecedente(setlist, { element: 0, diapositive: 0 })).toBeNull();
  });

  it('décrit la suivante', () => {
    expect(suivantePour(setlist, { element: 0, diapositive: 1 })).toMatchObject({ titreElement: 'b', changeElement: true });
    expect(suivantePour(setlist, { element: 2, diapositive: 2 })).toBeNull();
  });
});
