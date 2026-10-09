import 'fake-indexeddb/auto';

import { afterAll, describe, expect, it } from 'vitest';

import {
  ecrirePreference,
  enregistrerChant,
  enregistrerRecueil,
  fermerCache,
  lireChant,
  lirePreference,
  lireRecueil,
} from './cache';
import {
  depuisSetlistServeur,
  enregistrerSetlistLocale,
  listerSetlistsLocales,
  nouvelleSetlist,
  supprimerSetlistLocale,
} from './setlistsLocales';

afterAll(fermerCache);

describe('cache IndexedDB', () => {
  it('enregistre et relit un recueil, et y retrouve un chant par id', async () => {
    await enregistrerRecueil({
      langue: 'fr',
      titre: 'Recueil CMFI',
      version: 4,
      chants: [{ id: 'c112', title: 'Grâce infinie', position: 112 }],
    });
    expect((await lireRecueil('fr', 'Recueil CMFI'))?.version).toBe(4);
    expect((await lireChant('c112'))?.title).toBe('Grâce infinie');
  });

  it('préfère le chant enregistré isolément', async () => {
    await enregistrerChant({ id: 'c112', title: 'Grâce infinie (détail)', position: 112 });
    expect((await lireChant('c112'))?.title).toBe('Grâce infinie (détail)');
  });

  it('garde les préférences', async () => {
    await ecrirePreference('sortie.ecran', 'ecran-2');
    expect(await lirePreference<string>('sortie.ecran')).toBe('ecran-2');
  });

  it('liste les setlists locales, la plus récente d’abord', async () => {
    const a = await enregistrerSetlistLocale(nouvelleSetlist('Culte du 4 oct.'));
    await new Promise((r) => setTimeout(r, 5));
    const b = await enregistrerSetlistLocale(
      nouvelleSetlist('Culte du 11 oct.', [
        { type: 'bible', id: 'e1', reference: 'Psaume 23', version: 'LSG', secondeVersion: 'KJV' },
      ])
    );
    const noms = (await listerSetlistsLocales()).map((s) => s.nom);
    expect(noms.slice(0, 2)).toEqual([b.nom, a.nom]);
    await supprimerSetlistLocale(a.id);
    expect((await listerSetlistsLocales()).some((s) => s.id === a.id)).toBe(false);
  });

  it('convertit une setlist du serveur dans l’ordre des positions', () => {
    const locale = depuisSetlistServeur({
      id: 's',
      name: 'Dimanche',
      userId: 'u',
      songs: [
        { id: 'b', title: 'B', position: 2 },
        { id: 'a', title: 'A', position: 1 },
      ],
    });
    expect(locale.idServeur).toBe('s');
    expect(locale.elements.map((e) => (e.type === 'chant' ? e.chantId : ''))).toEqual(['a', 'b']);
  });
});
