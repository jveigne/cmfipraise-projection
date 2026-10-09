import type { ChantDTO, RecueilEnCache } from '@cmfi/api';
import { describe, expect, it } from 'vitest';

import { chercherDansRecueils, decouperSaisie, fusionnerCandidats, lireNumero, normaliserRecherche } from './rechercheBarre';

function chant(id: string, title: string, position: number, lignes: string[] = []): ChantDTO {
  return {
    id,
    title,
    position,
    parts: lignes.length ? [{ position: 1, type: 'VERSE', partId: 1, lines: lignes.map((line) => ({ line })) }] : [],
  };
}

const recueils: RecueilEnCache[] = [
  {
    langue: 'fr',
    titre: 'Christ Est Vainqueur',
    version: 1,
    enregistreLe: 0,
    chants: [
      chant('a', 'A TOI LA GLOIRE.', 4, ['A TOI la gloire,', 'O Ressuscité !']),
      chant('b', 'Grâce infinie', 112, ['Grâce infinie, ô son si doux,', 'Qui vint me relever ;']),
      chant('c', 'Gloire à Dieu', 7, ['Toute la gloire à toi']),
    ],
  },
  {
    langue: 'en',
    titre: 'Hymns',
    version: 1,
    enregistreLe: 0,
    chants: [chant('d', 'AMAZING GRACE', 112, ['AMAZING grace ! how sweet the sound'])],
  },
];

describe('decouperSaisie', () => {
  it('sépare sur la virgule suivie d’une espace, le point-virgule et le retour à la ligne', () => {
    expect(decouperSaisie('Grâce infinie, Psaume 23, Jn 3:16')).toEqual(['Grâce infinie', 'Psaume 23', 'Jn 3:16']);
    expect(decouperSaisie('112; Ps 23\nJn 3:16')).toEqual(['112', 'Ps 23', 'Jn 3:16']);
  });

  it('garde la virgule collée d’une référence à la française', () => {
    expect(decouperSaisie('Rm 8,28, Ps 23')).toEqual(['Rm 8,28', 'Ps 23']);
  });

  it('ignore les segments vides et la virgule finale', () => {
    expect(decouperSaisie(' , Ps 23,  ')).toEqual(['Ps 23']);
    expect(decouperSaisie('   ')).toEqual([]);
  });
});

describe('normaliserRecherche et lireNumero', () => {
  it('retire accents, casse et ponctuation', () => {
    expect(normaliserRecherche('À toi la gloire !')).toBe('a toi la gloire');
    expect(normaliserRecherche('A TOI LA GLOIRE.')).toBe('a toi la gloire');
    expect(normaliserRecherche('L’Éternel')).toBe('l eternel');
  });

  it('reconnaît un numéro de recueil sous ses formes courantes', () => {
    expect(lireNumero('112')).toBe(112);
    expect(lireNumero('n° 112')).toBe(112);
    expect(lireNumero('#4')).toBe(4);
    expect(lireNumero('Ps 23')).toBeNull();
    expect(lireNumero('0')).toBeNull();
  });
});

describe('chercherDansRecueils', () => {
  it('met le titre exact devant, sans tenir compte des accents ni de la casse', () => {
    const r = chercherDansRecueils(recueils, 'à toi la gloire');
    expect(r[0]?.id).toBe('a');
    expect(r[0]?.raison).toBe('titre-exact');
  });

  it('trouve par numéro, la langue favorite d’abord', () => {
    expect(chercherDansRecueils(recueils, '112', { langueFavorite: 'fr' }).map((c) => c.id)).toEqual(['b', 'd']);
    expect(chercherDansRecueils(recueils, '112', { langueFavorite: 'en' }).map((c) => c.id)).toEqual(['d', 'b']);
  });

  it('trouve par un vers, même sans accents, et dit lequel', () => {
    const r = chercherDansRecueils(recueils, 'qui vint me relever');
    expect(r[0]?.id).toBe('b');
    expect(r[0]?.raison).toBe('vers');
    expect(r[0]?.vers).toBe('Qui vint me relever ;');
    expect(chercherDansRecueils(recueils, 'grace infinie o son')[0]?.raison).toBe('premier-vers');
  });

  it('classe début de titre avant titre contenant la saisie', () => {
    const r = chercherDansRecueils(recueils, 'gloire');
    expect(r[0]?.id).toBe('c');
    expect(r[0]?.raison).toBe('debut-titre');
    expect(r.map((c) => c.id)).toContain('a');
  });

  it('ne renvoie rien pour une saisie trop courte qui correspondrait à tout', () => {
    expect(chercherDansRecueils(recueils, 'o')).toEqual([]);
  });
});

describe('fusionnerCandidats', () => {
  it('ajoute après les résultats locaux ceux du serveur, sans doublon', () => {
    const locaux = chercherDansRecueils(recueils, 'à toi la gloire');
    const fusion = fusionnerCandidats(locaux, [chant('a', 'A TOI LA GLOIRE.', 0), { id: 'z', title: 'Autre', position: 0 } as ChantDTO]);
    expect(fusion.map((c) => c.id)).toEqual(['a', 'z']);
    expect(fusion[1]?.raison).toBe('serveur');
    // Sans paroles, le chant du serveur sera chargé à part.
    expect(fusion[1]?.chant).toBeUndefined();
  });
});
