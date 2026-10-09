import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EcranAccueil } from '@/components/accueil/EcranAccueil';
import { FournisseurLangue } from '@/lib/i18n';
import { FournisseurSession } from '@/lib/session';

import { EcranSoutien } from './EcranSoutien';

function Fournisseurs({ children }: { children: ReactNode }) {
  return (
    <FournisseurLangue>
      <FournisseurSession>{children}</FournisseurSession>
    </FournisseurLangue>
  );
}

describe('écrans de découverte', () => {
  beforeEach(() => {
    // Aucun appel réseau réel pendant les tests.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('hors-ligne')));
    // La langue choisie est mémorisée : chaque test repart du français.
    window.localStorage.clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('accueil : Chanter mène à la bibliothèque, Projeter à la régie, le don à /soutien/', () => {
    render(<EcranAccueil />, { wrapper: Fournisseurs });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Les chants de la CMFI');
    expect(screen.getByRole('link', { name: /Chanter/ }).getAttribute('href')).toMatch(/^\/chants\/?$/);
    expect(screen.getByRole('link', { name: /Projeter/ }).getAttribute('href')).toMatch(/^\/regie\/?\?exemple=1$/);
    expect(screen.getByRole('link', { name: 'Faire un don' }).getAttribute('href')).toMatch(/^\/soutien\/?$/);
    // Liens de téléchargement encore à définir : boutons désactivés, pas de faux lien.
    expect(screen.getByRole('button', { name: /Télécharger pour Windows/ })).toBeDisabled();
  });

  it('accueil : le bouton FR · EN change la langue', () => {
    render(<EcranAccueil />, { wrapper: Fournisseurs });
    fireEvent.click(screen.getByRole('button', { name: /Passer en anglais/ }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('The songs of CMFI');
  });

  it('soutien : le montant et la devise se reflètent dans le bouton, désactivé sans lien de don', () => {
    render(<EcranSoutien />, { wrapper: Fournisseurs });
    const bouton = screen.getByRole('button', { name: /Donner 5\s000\sFCFA/ });
    expect(bouton).toBeDisabled();
    fireEvent.click(screen.getByLabelText('10 000'));
    expect(screen.getByRole('button', { name: /Donner 10\s000\sFCFA/ })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Chaque mois'));
    expect(screen.getByRole('button', { name: /par mois/ })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Carte bancaire'));
    expect(screen.queryByLabelText('Orange Money')).not.toBeInTheDocument();
  });
});
