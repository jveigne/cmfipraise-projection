import { describe, expect, it, vi } from 'vitest';

import { ClientApi } from './client';
import { CONFIG_PRODUCTION } from './config';
import { ErreurApi } from './erreurs';
import { stockageMemoire } from './jetons';

const { urlApi, urlRacine } = CONFIG_PRODUCTION;

function reponse(status: number, corps?: unknown): Response {
  const texte = corps === undefined ? '' : typeof corps === 'string' ? corps : JSON.stringify(corps);
  return new Response(status === 204 ? null : texte, { status });
}

describe('ClientApi', () => {
  it('obtient un jeton visiteur puis l’envoie en Bearer', async () => {
    const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url) === `${urlRacine}/private/generate-token`) return reponse(200, { token: 'V1' });
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer V1');
      return reponse(200, []);
    });
    const client = new ClientApi(CONFIG_PRODUCTION, { fetch: fetch as typeof globalThis.fetch });
    await expect(client.listerCategories('fr')).resolves.toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('renouvelle un jeton visiteur refusé et rejoue la requête une fois', async () => {
    // Jeton mémorisé périmé (secret JWT changé côté serveur) : refusé, renouvelé, rejoué.
    const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).endsWith('/private/generate-token')) return reponse(200, { token: 'NEUF' });
      const auth = (init?.headers as Record<string, string>).Authorization;
      return auth === 'Bearer NEUF' ? reponse(200, [{ id: 'a', title: 'A', version: 3 }]) : reponse(403);
    });
    const stockage = stockageMemoire({ visiteur: 'PERIME' });
    const client = new ClientApi(CONFIG_PRODUCTION, { fetch: fetch as typeof globalThis.fetch, stockage });
    await expect(client.listerVersionsRecueils('fr')).resolves.toHaveLength(1);
    expect(stockage.lire('visiteur')).toBe('NEUF');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('exige un compte pour les setlists du serveur', async () => {
    const fetch = vi.fn();
    const client = new ClientApi(CONFIG_PRODUCTION, { fetch: fetch as unknown as typeof globalThis.fetch });
    const erreur = await client.mesSetlists().catch((e: unknown) => e);
    expect(erreur).toBeInstanceOf(ErreurApi);
    expect((erreur as ErreurApi).compteRequis).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('repasse en visiteur quand le JWT est refusé sur du contenu officiel', async () => {
    const surSessionExpiree = vi.fn();
    const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).endsWith('/private/generate-token')) return reponse(200, { token: 'V' });
      const auth = (init?.headers as Record<string, string>).Authorization;
      return auth === 'Bearer JWT' ? reponse(401) : reponse(200, { id: 's1', title: 'Grâce infinie', position: 112 });
    });
    const stockage = stockageMemoire({ compte: 'JWT', utilisateur: '{"id":"u"}' });
    const client = new ClientApi(CONFIG_PRODUCTION, { fetch: fetch as typeof globalThis.fetch, stockage, surSessionExpiree });
    const chant = await client.chantParId('s1');
    expect(chant.title).toBe('Grâce infinie');
    expect(surSessionExpiree).toHaveBeenCalledOnce();
    expect(client.estConnecte).toBe(false);
  });

  it('signale un échec réseau comme tel (jamais comme un tableau vide)', async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const client = new ClientApi(CONFIG_PRODUCTION, {
      fetch: fetch as typeof globalThis.fetch,
      stockage: stockageMemoire({ visiteur: 'V' }),
    });
    const erreur = await client.listerRecueils('fr').catch((e: unknown) => e);
    expect((erreur as ErreurApi).reseau).toBe(true);
  });

  it('nettoie les guillemets du code de partage', async () => {
    const fetch = vi.fn(async (url: string | URL | Request) => {
      expect(String(url)).toBe(`${urlApi}/setlists/abc/share-code`);
      return reponse(200, '"K7Q2"');
    });
    const client = new ClientApi(CONFIG_PRODUCTION, {
      fetch: fetch as typeof globalThis.fetch,
      stockage: stockageMemoire({ compte: 'JWT' }),
    });
    await expect(client.codePartageSetlist('abc')).resolves.toBe('K7Q2');
  });

  it('se connecte et mémorise le compte', async () => {
    const fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual({ email: 'a@b.fr', password: 'x' });
      return reponse(200, { token: 'JWT', user: { id: 'u1', email: 'a@b.fr', fullName: 'A B' } });
    });
    const client = new ClientApi(CONFIG_PRODUCTION, { fetch: fetch as typeof globalThis.fetch });
    await client.connexion(' a@b.fr ', 'x');
    expect(client.estConnecte).toBe(true);
    expect(client.utilisateur?.fullName).toBe('A B');
    client.deconnexion();
    expect(client.utilisateur).toBeNull();
  });
});
