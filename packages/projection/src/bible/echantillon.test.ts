import { describe, expect, it } from 'vitest';

import { sourceEchantillon } from './echantillon';
import { analyserReference } from './references';

describe('source d’échantillon', () => {
  it('ne déclare que des versions du domaine public, marquées échantillon', () => {
    for (const v of sourceEchantillon.versions()) {
      expect(v.domainePublic).toBe(true);
      expect(v.echantillon).toBe(true);
    }
  });

  it('Jean 3:16 en LSG et KJV', async () => {
    const lsg = await sourceEchantillon.lirePassage('LSG', analyserReference('Jn 3:16')!);
    const kjv = await sourceEchantillon.lirePassage('KJV', analyserReference('John 3:16')!);
    expect(lsg?.versets[0]?.texte).toMatch(/^Car Dieu a tant aimé le monde/);
    expect(kjv?.versets[0]?.texte).toMatch(/^For God so loved the world/);
    expect(lsg?.incomplet).toBe(false);
  });

  it('Psaume 23 complet, suscription séparée', async () => {
    const p = await sourceEchantillon.lirePassage('LSG', analyserReference('Psaume 23')!);
    expect(p?.versets.map((v) => v.numero)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(p?.versets[0]?.suscription).toBe('Cantique de David.');
    expect(p?.incomplet).toBe(false);
  });

  it('dit honnêtement ce qui manque', async () => {
    expect(await sourceEchantillon.lirePassage('LSG', analyserReference('Romains 8:28')!)).toBeNull();
    const partiel = await sourceEchantillon.lirePassage('LSG', analyserReference('Jn 3:16-18')!);
    expect(partiel?.versets).toHaveLength(1);
    expect(partiel?.incomplet).toBe(true);
    expect(await sourceEchantillon.contient('KJV', analyserReference('Ps 23:4')!)).toBe(true);
  });
});
