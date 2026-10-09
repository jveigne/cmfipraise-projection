import { afterEach, describe, expect, it, vi } from 'vitest';

import { recopierInstantaneBureau } from './instantane';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('recopierInstantaneBureau', () => {
  it('ne fait rien hors de l’app de bureau (aucune requête vers /_donnees/)', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await recopierInstantaneBureau();
    expect(fetch).not.toHaveBeenCalled();
  });
});
