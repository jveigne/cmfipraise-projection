import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FournisseurLangue } from '@/lib/i18n';
import { FournisseurSession } from '@/lib/session';

import { EcranSetlists } from './EcranSetlists';

const navigation = vi.hoisted(() => ({ params: new URLSearchParams(), push: vi.fn(), replace: vi.fn() }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => navigation.params,
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
  usePathname: () => '/setlists/',
}));

function Fournisseurs({ children }: { children: ReactNode }) {
  return (
    <FournisseurLangue>
      <FournisseurSession>{children}</FournisseurSession>
    </FournisseurLangue>
  );
}

describe('écran des setlists (visiteur, sans IndexedDB)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('hors-ligne')));
    navigation.params = new URLSearchParams();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('crée une setlist, puis l’édite : ajout d’un passage, retrait, suppression confirmée', async () => {
    const { rerender } = render(<EcranSetlists />, { wrapper: Fournisseurs });

    fireEvent.click(screen.getAllByRole('button', { name: 'Nouvelle setlist' })[0]!);
    await waitFor(() => expect(navigation.push).toHaveBeenCalled());
    const id = new URL(`http://x${navigation.push.mock.calls[0]![0] as string}`).searchParams.get('id')!;
    navigation.params = new URLSearchParams({ id });
    rerender(<EcranSetlists />);

    // Le partage invite à se connecter, sans bloquer l'édition.
    expect(screen.getByText('Le partage passe par un compte')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Ajouter à la setlist'), { target: { value: 'Jn 3:16' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }));
    const liste = await screen.findByRole('list', { name: 'Éléments de la setlist' });
    expect(within(liste).getByText('Jean 3:16')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retirer Jean 3:16 de la setlist' }));
    await waitFor(() => expect(screen.queryByRole('list', { name: 'Éléments de la setlist' })).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer définitivement cette setlist' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer définitivement' }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/setlists/'));
  });
});
