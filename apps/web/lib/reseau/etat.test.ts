import { ErreurApi } from '@cmfi/api';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { reinitialiserEtatReseau, signalerEchecApi, signalerReussiteApi, useReseau } from './etat';

afterEach(() => {
  vi.restoreAllMocks();
  reinitialiserEtatReseau();
});

describe('useReseau', () => {
  it('passe en erreur sur un échec réseau alors que le navigateur est en ligne, puis s’en remet', () => {
    const { result } = renderHook(() => useReseau());
    expect(result.current.etat).toBe('en-ligne');
    act(() => signalerEchecApi(new ErreurApi('injoignable', { chemin: '/songbook', reseau: true })));
    expect(result.current.etat).toBe('erreur');
    expect(result.current.erreur?.chemin).toBe('/songbook');
    act(() => signalerReussiteApi());
    expect(result.current.etat).toBe('en-ligne');
  });

  it('ignore un refus ou un 404 : ce sont des réponses, pas des pannes', () => {
    const { result } = renderHook(() => useReseau());
    act(() => signalerEchecApi(new ErreurApi('refusé', { chemin: '/x', status: 403 })));
    act(() => signalerEchecApi(new ErreurApi('absent', { chemin: '/x', status: 404 })));
    expect(result.current.etat).toBe('en-ligne');
  });

  it('suit la coupure du navigateur et en note l’heure', () => {
    const enLigne = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const { result } = renderHook(() => useReseau());
    enLigne.mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.etat).toBe('hors-ligne');
    expect(result.current.coupureA).not.toBeNull();
    enLigne.mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.etat).toBe('en-ligne');
    expect(result.current.coupureA).toBeNull();
  });
});
