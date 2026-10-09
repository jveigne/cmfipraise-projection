import { nouvelleSetlist, type ChantDTO, type ClientApi, type SetlistDTO } from '@cmfi/api';
import { describe, expect, it, vi } from 'vitest';

import { decouperSaisie, resoudreSaisie } from './saisie';
import { chantsPartageables, formaterCode, partageIncomplet, pousserSetlist } from './serveur';

const grace: ChantDTO = {
  id: 'grace',
  position: 112,
  title: 'Grâce infinie',
  keyRootIndex: 7,
  parts: [{ position: 1, type: 'VERSE', partId: 1, lines: [{ line: 'Grâce infinie, ô son si doux,' }] }],
};

describe('saisie', () => {
  it('découpe sur virgules, points-virgules et retours à la ligne', () => {
    expect(decouperSaisie('Grâce infinie, Psaume 23 ;Jn 3:16\n\n 112 ')).toEqual(['Grâce infinie', 'Psaume 23', 'Jn 3:16', '112']);
  });

  it('reconnaît chants et références, et rend ce qui reste introuvable', async () => {
    const bilan = await resoudreSaisie('112, Jn 3:16, Chant qui n’existe pas', {
      candidats: [{ chant: grace, recueil: 'Recueil CMFI' }],
      version: 'LSG',
    });
    expect(bilan.ajoutes).toHaveLength(2);
    expect(bilan.ajoutes[0]).toMatchObject({ type: 'chant', chantId: 'grace', recueil: 'Recueil CMFI', numero: 112, tonalite: 7 });
    expect(bilan.ajoutes[1]).toMatchObject({ type: 'bible', reference: 'Jean 3:16', version: 'LSG' });
    expect(bilan.introuvables).toEqual(['Chant qui n’existe pas']);
  });

  it('demande au serveur ce qui n’est pas dans les recueils locaux', async () => {
    const rechercherServeur = vi.fn().mockResolvedValue([grace]);
    const bilan = await resoudreSaisie('grâce', { candidats: [], version: 'KJV', rechercherServeur });
    expect(rechercherServeur).toHaveBeenCalledWith('grâce');
    expect(bilan.ajoutes[0]).toMatchObject({ type: 'chant', chantId: 'grace' });
  });
});

describe('partage', () => {
  const setlist = nouvelleSetlist('Culte', [
    { type: 'chant', id: 'e1', chantId: 'a', titre: 'A' },
    { type: 'bible', id: 'e2', reference: 'Jean 3:16', version: 'LSG' },
    { type: 'chant', id: 'e3', chantId: 'b', titre: 'B' },
    { type: 'chant', id: 'e4', chantId: 'a', titre: 'A' },
  ]);

  it('n’envoie que les chants, sans doublon, dans l’ordre', () => {
    expect(chantsPartageables(setlist)).toEqual(['a', 'b']);
    expect(partageIncomplet(setlist)).toEqual({ bible: true, doublons: true });
  });

  it('met la copie du compte à l’image de la setlist locale', async () => {
    const serveur: SetlistDTO = {
      id: 'srv',
      name: 'Culte',
      userId: 'u',
      songs: [
        { id: 'b', title: 'B', position: 1 },
        { id: 'z', title: 'Z', position: 2 },
      ],
    };
    const api = {
      setlistParId: vi.fn().mockResolvedValue(serveur),
      retirerChantSetlist: vi.fn().mockResolvedValue(undefined),
      ajouterChantSetlist: vi.fn().mockResolvedValue({ id: 'srv', songId: 'a', position: 1 }),
      deplacerChantSetlist: vi.fn().mockResolvedValue(undefined),
    };
    await pousserSetlist(api as unknown as ClientApi, { ...setlist, idServeur: 'srv' });
    expect(api.retirerChantSetlist).toHaveBeenCalledWith('srv', 'z');
    expect(api.ajouterChantSetlist).toHaveBeenCalledWith('srv', { songId: 'a', position: 1 });
    expect(api.deplacerChantSetlist).toHaveBeenCalledWith('srv', 'b', 2);
  });

  it('rend le code lisible à voix haute', () => {
    expect(formaterCode('a1b2c3d4')).toBe('A1B2·C3D4');
  });
});
