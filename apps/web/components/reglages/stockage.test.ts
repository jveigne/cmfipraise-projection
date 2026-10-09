import { beforeEach, describe, expect, it } from 'vitest';

import { REGLAGES_PAR_DEFAUT, ecrireReglages, lireReglages, themeSortieDepuisReglages } from './stockage';

beforeEach(() => window.localStorage.clear());

describe('réglages de projection', () => {
  it('rend les valeurs par défaut sans rien stocké, et ignore les valeurs inconnues', () => {
    expect(lireReglages()).toEqual(REGLAGES_PAR_DEFAUT);
    window.localStorage.setItem('app_reglages', JSON.stringify({ theme: 'arc-en-ciel', taille: 'grande' }));
    expect(lireReglages()).toMatchObject({ theme: 'nuit', taille: 'grande' });
  });

  it('persiste, et retire une seconde version identique à la principale', () => {
    ecrireReglages({ versionBible: 'KJV' });
    const r = lireReglages();
    expect(r.versionBible).toBe('KJV');
    expect(r.versionSeconde).toBeNull();
    expect(JSON.parse(window.localStorage.getItem('app_reglages')!)).toMatchObject({ versionBible: 'KJV' });
  });

  it('traduit en thème de sortie ; un fond sans photo reste en Nuit', () => {
    expect(themeSortieDepuisReglages({ ...REGLAGES_PAR_DEFAUT, theme: 'fond' })).toMatchObject({ fond: 'nuit', imageId: null });
    expect(themeSortieDepuisReglages({ ...REGLAGES_PAR_DEFAUT, theme: 'fond', imageFondId: 'm1', taille: 'tres-grande' })).toMatchObject({
      fond: 'image',
      imageId: 'm1',
      echelleTexte: 1.47,
    });
    expect(themeSortieDepuisReglages({ ...REGLAGES_PAR_DEFAUT, theme: 'noir', police: 'grasse' })).toMatchObject({ fond: 'noir', graisse: 'grasse' });
  });
});
