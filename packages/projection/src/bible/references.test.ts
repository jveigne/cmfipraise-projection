import { describe, expect, it } from 'vitest';

import { LIVRES } from './livres';
import { analyserReference, estReferenceBiblique, formaterReference, suggererLivres, trouverLivre } from './references';

const ref = (livre: string, chapitre: number, versetDebut: number | null, chapitreFin = chapitre, versetFin = versetDebut) => ({
  livre,
  chapitre,
  versetDebut,
  chapitreFin,
  versetFin,
});

describe('analyserReference — les formes du cahier des charges', () => {
  it.each([
    ['Jn 3:16', ref('JHN', 3, 16)],
    ['Jean 3.16', ref('JHN', 3, 16)],
    ['Jn 3:16-18', ref('JHN', 3, 16, 3, 18)],
    ['Ps 23', ref('PSA', 23, null)],
    ['Psaume 23', ref('PSA', 23, null)],
  ])('%s', (saisie, attendu) => {
    expect(analyserReference(saisie)).toEqual(attendu);
  });
});

describe('analyserReference — noms français et anglais', () => {
  it.each([
    ['John 3:16', ref('JHN', 3, 16)],
    ['Psalm 23', ref('PSA', 23, null)],
    ['Psalms 23:1-4', ref('PSA', 23, 1, 23, 4)],
    ['Psaumes 23', ref('PSA', 23, null)],
    ['Romains 8.28', ref('ROM', 8, 28)],
    ['Romans 8:28', ref('ROM', 8, 28)],
    ['Jean 3,16', ref('JHN', 3, 16)],
    ['jean 3 : 16', ref('JHN', 3, 16)],
    ['1 Co 13', ref('1CO', 13, null)],
    ['1Co 13:4-7', ref('1CO', 13, 4, 13, 7)],
    ['I Corinthians 13:4-7', ref('1CO', 13, 4, 13, 7)],
    ['1 Corinthiens 13', ref('1CO', 13, null)],
    ['1Jn 4:8', ref('1JN', 4, 8)],
    ['1 Jean 4.8', ref('1JN', 4, 8)],
    ['1re Pierre 2:9', ref('1PE', 2, 9)],
    ['2 Tim 3:16', ref('2TI', 3, 16)],
    ['Ésaïe 53:5', ref('ISA', 53, 5)],
    ['Esaie 53:5', ref('ISA', 53, 5)],
    ['Isaiah 53:5', ref('ISA', 53, 5)],
    ['Ézéchiel 37', ref('EZK', 37, null)],
    ['Cantique des cantiques 2:4', ref('SNG', 2, 4)],
    ['Song of Solomon 2:4', ref('SNG', 2, 4)],
    ['Apocalypse 22:21', ref('REV', 22, 21)],
    ['Revelation 21:4', ref('REV', 21, 4)],
    ['Ap 21.4', ref('REV', 21, 4)],
    ['Matthieu 5:3-12', ref('MAT', 5, 3, 5, 12)],
    ['Philip 4:13', ref('PHP', 4, 13)],
    ['Deutéronome 6:4', ref('DEU', 6, 4)],
    ['Hébreux 11:1', ref('HEB', 11, 1)],
  ])('%s', (saisie, attendu) => {
    expect(analyserReference(saisie)).toEqual(attendu);
  });
});

describe('analyserReference — plages', () => {
  it('franchit un chapitre (tiret long ou court)', () => {
    expect(analyserReference('Jn 3:16–4:2')).toEqual(ref('JHN', 3, 16, 4, 2));
    expect(analyserReference('Jn 3:16-4:2')).toEqual(ref('JHN', 3, 16, 4, 2));
  });

  it('plage de chapitres entiers', () => {
    expect(analyserReference('Ps 23-24')).toEqual({ livre: 'PSA', chapitre: 23, versetDebut: null, chapitreFin: 24, versetFin: null });
  });

  it('livre d’un seul chapitre cité par verset', () => {
    expect(analyserReference('Jude 3')).toEqual(ref('JUD', 1, 3));
    expect(analyserReference('Jude 24-25')).toEqual(ref('JUD', 1, 24, 1, 25));
    expect(analyserReference('Philémon 1:6')).toEqual(ref('PHM', 1, 6));
  });
});

describe('analyserReference — refus', () => {
  it.each([
    'Grâce infinie',
    'À toi la gloire',
    '112',
    'Ps',
    'Ps 151',
    'Jean 22:1',
    'Jn 3:18-16',
    'Jo 3:16',
    'Jn 3:16, 18',
    '',
    'Gloire 2',
  ])('« %s » n’est pas une référence', (saisie) => {
    expect(analyserReference(saisie)).toBeNull();
    expect(estReferenceBiblique(saisie)).toBe(false);
  });
});

describe('formaterReference', () => {
  it('formats français et anglais', () => {
    expect(formaterReference(ref('JHN', 3, 16) as never, 'fr')).toBe('Jean 3:16');
    expect(formaterReference(ref('JHN', 3, 16, 3, 17) as never, 'fr')).toBe('Jean 3:16-17');
    expect(formaterReference(ref('JHN', 3, 16, 3, 16) as never, 'en')).toBe('John 3:16');
    expect(formaterReference(ref('PSA', 23, null) as never, 'fr')).toBe('Psaume 23');
    expect(formaterReference(ref('PSA', 23, null) as never, 'en')).toBe('Psalm 23');
    expect(formaterReference({ livre: 'PSA', chapitre: 23, versetDebut: null, chapitreFin: 24, versetFin: null }, 'fr')).toBe('Psaumes 23-24');
    expect(formaterReference(ref('JHN', 3, 16, 4, 2) as never, 'fr')).toBe('Jean 3:16–4:2');
    expect(formaterReference(ref('JUD', 1, 3) as never, 'fr')).toBe('Jude 3');
    expect(formaterReference(ref('1CO', 13, 4, 13, 7) as never, 'fr', { abrege: true })).toBe('1 Co 13:4-7');
  });

  it('aller-retour saisie → format → saisie', () => {
    for (const s of ['Jn 3:16', 'Ps 23', '1 Co 13:4-7', 'Jude 3', 'Ap 22:21', 'Jn 3:16-4:2']) {
      const r = analyserReference(s);
      expect(r).not.toBeNull();
      expect(analyserReference(formaterReference(r!, 'fr'))).toEqual(r);
      expect(analyserReference(formaterReference(r!, 'en'))).toEqual(r);
    }
  });
});

describe('table des livres', () => {
  it('66 livres, 1189 chapitres', () => {
    expect(LIVRES).toHaveLength(66);
    expect(LIVRES.reduce((n, l) => n + l.chapitres, 0)).toBe(1189);
  });

  it('chaque nom complet retrouve son livre', () => {
    for (const l of LIVRES) {
      expect(trouverLivre(l.nomFr)?.code).toBe(l.code);
      expect(trouverLivre(l.nomEn)?.code).toBe(l.code);
    }
  });

  it('aucun alias n’est partagé par deux livres', () => {
    const vus = new Map<string, string>();
    for (const l of LIVRES) {
      for (const a of l.alias) {
        expect(vus.get(a) ?? l.code, `alias « ${a} »`).toBe(l.code);
        vus.set(a, l.code);
      }
    }
  });

  it('suggère les livres par préfixe', () => {
    expect(suggererLivres('jea').map((l) => l.code)).toEqual(['JHN']);
    expect(suggererLivres('1 co').map((l) => l.code)).toEqual(['1CO']);
    expect(suggererLivres('jo').map((l) => l.code)).toEqual(expect.arrayContaining(['JOS', 'JOB', 'JON', 'JOL']));
  });
});
