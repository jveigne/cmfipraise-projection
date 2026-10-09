import type { ChantDTO } from '@cmfi/api';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FournisseurLangue } from '@/lib/i18n';
import { FournisseurSession } from '@/lib/session';

import { EcranBibliotheque } from './EcranBibliotheque';

const navigation = vi.hoisted(() => ({ params: new URLSearchParams() }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => navigation.params,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/chants/lecture/',
}));

const grace: ChantDTO = {
  id: 'grace',
  position: 112,
  title: 'Grâce infinie',
  keyRootIndex: 7,
  hasChord: true,
  parts: [
    {
      position: 1,
      type: 'VERSE',
      partId: 1,
      lines: [{ line: 'Grâce infinie, ô son si doux,', chords: [{ id: 'c', rootNoteIndex: 7, quality: '', charIndex: 0 }] }],
    },
    { position: 2, type: 'CHORUS', partId: 5, lines: [{ line: 'Gloire à l’Agneau, gloire à Jésus,' }] },
  ],
};

/** Backend simulé : jeton visiteur, un recueil français, rien en anglais. */
function reponse(url: string): unknown {
  if (url.includes('/private/generate-token')) return { token: 'visiteur' };
  if (url.includes('/songbook-versions?language=fr')) return [{ id: 'r1', title: 'Recueil CMFI', version: 3 }];
  if (url.includes('/songbook-versions')) return [];
  if (url.includes('/songbook?title=')) return [grace];
  if (url.includes('/categories')) return [];
  throw new Error(`URL inattendue : ${url}`);
}

function Fournisseurs({ children }: { children: ReactNode }) {
  return (
    <FournisseurLangue>
      <FournisseurSession>{children}</FournisseurSession>
    </FournisseurLangue>
  );
}

describe('bibliothèque', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => new Response(JSON.stringify(reponse(url)), { status: 200 }))
    );
    navigation.params = new URLSearchParams({ id: 'grace' });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('liste le recueil, ouvre le chant, transpose et agrandit', async () => {
    render(<EcranBibliotheque lecture />, { wrapper: Fournisseurs });

    expect(await screen.findByRole('heading', { level: 1, name: 'Grâce infinie' })).toBeInTheDocument();
    expect(screen.getByText('Recueil CMFI · n° 112')).toBeInTheDocument();
    expect(screen.getByText(/ordre 1 R/)).toBeInTheDocument();

    const liste = screen.getByRole('tabpanel');
    expect(within(liste).getByRole('link', { name: /Grâce infinie/ })).toHaveAttribute('aria-current', 'page');

    expect(screen.getByText('Sol (G)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Transposer d’un demi-ton plus haut' }));
    expect(screen.getByText('Lab (Ab)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch', { name: 'Accords' }));
    expect(screen.getByRole('switch', { name: 'Accords' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('button', { name: 'Transposer d’un demi-ton plus haut' })).toBeDisabled();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Rechercher un chant' }), { target: { value: '112' } });
    expect(await screen.findByText(/1 résultat/)).toBeInTheDocument();
  });
});
