import { analyserReference, sourceEchantillon } from '@cmfi/projection';
import { describe, expect, it } from 'vitest';

import { estAjoutable, interpreterBible, interpreterSaisie, versElementSetlist } from './interpretation';

const ctx = { bible: sourceEchantillon, version: 'LSG' as const, seconde: null, langueFavorite: 'fr' };

describe('interpreterSaisie', () => {
  it('comprend chaque segment : références bibliques et chants', async () => {
    // Sans IndexedDB (jsdom), aucun recueil en cache : le chant reste « inconnu » localement.
    const r = await interpreterSaisie('Grâce infinie, Psaume 23, Jn 3:16', ctx);
    expect(r.map((i) => i.genre)).toEqual(['inconnu', 'bible', 'bible']);
    const [, psaume, jean] = r;
    expect(psaume?.genre === 'bible' && psaume.passage?.versets).toHaveLength(6);
    expect(jean?.genre === 'bible' && jean.passage?.versets[0]?.numero).toBe(16);
  });

  it('un passage absent de l’échantillon n’est pas ajoutable', async () => {
    const [rm] = await interpreterSaisie('Rm 8,28', ctx);
    expect(rm?.genre).toBe('bible');
    expect(rm && estAjoutable(rm)).toBe(false);
    expect(rm && versElementSetlist(rm)).toBeNull();
  });

  it('propose d’étendre un passage quand la source a le verset suivant', async () => {
    const ref = analyserReference('Ps 23:1-4')!;
    const i = await interpreterBible('x', 'Ps 23:1-4', ref, 'LSG', null, sourceEchantillon);
    expect(i.extension).toMatchObject({ versetDebut: 1, versetFin: 5 });
    const jean = await interpreterBible('y', 'Jn 3:16', analyserReference('Jn 3:16')!, 'LSG', null, sourceEchantillon);
    // Jean 3:17 n'est pas dans l'échantillon : rien à proposer.
    expect(jean.extension).toBeNull();
  });
});

describe('versElementSetlist', () => {
  it('normalise la référence et garde la seconde version', async () => {
    const i = await interpreterBible('x', 'jn 3.16', analyserReference('jn 3.16')!, 'LSG', 'KJV', sourceEchantillon);
    const r = versElementSetlist(i);
    expect(r?.element).toMatchObject({ type: 'bible', reference: 'Jean 3:16', version: 'LSG', secondeVersion: 'KJV' });
  });

  it('ignore une seconde version identique à la première', async () => {
    const i = await interpreterBible('x', 'Ps 23', analyserReference('Ps 23')!, 'LSG', 'LSG', sourceEchantillon);
    expect(i.seconde).toBeNull();
  });
});
