import type { ElementSetlist } from '@cmfi/api';
import { elementDepuisChant, etatInitial, reduireProjection } from '@cmfi/projection';
import { describe, expect, it } from 'vitest';

import {
  deplacerElement,
  DUREE_REPRISE_MS,
  elementsNavigation,
  memeSuivante,
  premierePosition,
  reduireRegie,
  seanceReprenable,
  suivanteDepuis,
  versPositionDirect,
  versPositionIndex,
  type ElementResolu,
} from './seance';

function chantProjete(id: string, couplets: number) {
  return elementDepuisChant(
    {
      id: `chant-${id}`,
      title: `Chant ${id}`,
      position: 1,
      parts: Array.from({ length: couplets }, (_, i) => ({ position: i + 1, type: 'VERSE' as const, partId: i + 1, lines: [{ line: `${id} couplet ${i + 1}` }] })),
    },
    { idElement: id }
  );
}

const elements: ElementSetlist[] = [
  { type: 'chant', id: 'e1', chantId: 'chant-e1', titre: 'Chant e1' },
  { type: 'bible', id: 'e2', reference: 'Jean 3:16', version: 'LSG' },
  { type: 'chant', id: 'e3', chantId: 'chant-e3', titre: 'Chant e3' },
];

function pret(projete: ReturnType<typeof chantProjete>): ElementResolu {
  return { statut: 'pret', projete, exemple: false, echantillon: false, incomplet: false, secondeManquante: false };
}

describe('navigation dans une setlist partiellement chargée', () => {
  const resolus = new Map<string, ElementResolu>([
    ['e1', pret(chantProjete('e1', 2))],
    ['e2', { statut: 'erreur', cause: 'bible-absente' }],
    ['e3', pret(chantProjete('e3', 1))],
  ]);
  const nav = elementsNavigation(elements, resolus);

  it('aligne la navigation sur la setlist, un élément en erreur n’ayant aucune diapositive', () => {
    expect(nav.map((e) => e.id)).toEqual(['e1', 'e2', 'e3']);
    expect(nav.map((e) => e.diapositives.length)).toEqual([2, 0, 1]);
  });

  it('saute l’élément indisponible : la projection ne s’arrête pas sur une erreur', () => {
    const s = suivanteDepuis(nav, { element: 0, diapositive: 1 });
    expect(s?.titreElement).toBe('Chant e3');
    expect(s?.changeElement).toBe(true);
  });

  it('avant la première diapositive, la suivante est la première de la setlist', () => {
    expect(premierePosition(nav)).toEqual({ element: 0, diapositive: 0 });
    expect(suivanteDepuis(nav, null)?.diapositive.id).toBe('e1:0');
  });

  it('repère la position par identifiant d’élément : elle survit au réordonnancement', () => {
    const direct = versPositionDirect(nav, { element: 2, diapositive: 0 });
    expect(direct).toEqual({ idElement: 'e3', diapositive: 0 });
    const reordonne = elementsNavigation(deplacerElement(elements, 'e3', 'e1'), resolus);
    expect(versPositionIndex(reordonne, direct)).toEqual({ element: 0, diapositive: 0 });
  });
});

describe('deplacerElement', () => {
  it('déplace sans rien retirer, et renvoie la même liste si rien ne change', () => {
    expect(deplacerElement(elements, 'e1', 'e3').map((e) => e.id)).toEqual(['e2', 'e3', 'e1']);
    expect(deplacerElement(elements, 'e1', 'e1')).toBe(elements);
    expect(deplacerElement(elements, 'inconnu', 'e1')).toBe(elements);
  });
});

describe('reduireRegie', () => {
  it('« logoSeul » vide la sortie et montre le logo, sans toucher au thème ni au bilingue', () => {
    let etat = reduireProjection(etatInitial(0), { type: 'basculerBilingue' }, 1);
    etat = reduireProjection(etat, { type: 'projeter', element: chantProjete('e1', 2), index: 1 }, 2);
    etat = reduireProjection(etat, { type: 'basculerEcranNoir' }, 3);
    const logo = reduireRegie(etat, { type: 'logoSeul' }, 4);
    expect(logo).toMatchObject({ element: null, logo: true, ecranNoir: false, texteMasque: false, bilingue: true, misAJourLe: 4 });
  });

  it('« actualiserElement » garde la position et les bascules', () => {
    let etat = reduireProjection(etatInitial(0), { type: 'projeter', element: chantProjete('e1', 2), index: 1 }, 1);
    etat = reduireProjection(etat, { type: 'basculerEcranNoir' }, 2);
    const nouveau = chantProjete('e1', 3);
    const apres = reduireRegie(etat, { type: 'actualiserElement', element: nouveau, index: 1 }, 3);
    expect(apres.element).toBe(nouveau);
    expect(apres.index).toBe(1);
    expect(apres.ecranNoir).toBe(true);
  });
});

describe('memeSuivante', () => {
  it('compare par diapositive, pas par objet', () => {
    const a = chantProjete('e1', 2);
    const s = { titreElement: a.titre, changeElement: false, diapositive: a.diapositives[1]! };
    expect(memeSuivante(s, { ...s })).toBe(true);
    expect(memeSuivante(s, null)).toBe(false);
    expect(memeSuivante(null, null)).toBe(true);
  });
});

describe('seanceReprenable', () => {
  const base = {
    v: 1,
    setlist: { id: 's', nom: 'Culte', elements, creeLe: 0, modifieLe: 0 },
    origine: { type: 'nouvelle' },
    phase: 'direct',
    direct: { idElement: 'e1', diapositive: 0 },
    bilingue: false,
    enregistreeLe: 1_000,
  };

  it('reprend une séance récente, pas une séance terminée ni périmée', () => {
    expect(seanceReprenable(base, 2_000)).toBe(true);
    expect(seanceReprenable({ ...base, phase: 'fin' }, 2_000)).toBe(false);
    expect(seanceReprenable(base, 1_000 + DUREE_REPRISE_MS + 1)).toBe(false);
    expect(seanceReprenable({ ...base, v: 2 }, 2_000)).toBe(false);
    expect(seanceReprenable(null)).toBe(false);
  });
});
