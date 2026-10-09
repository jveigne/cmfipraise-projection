import { ErreurApi } from '@cmfi/api';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { reinitialiserEtatReseau, signalerEchecApi } from '@/lib/reseau/etat';

import { ChargementDiapositives, EtatRienAProjeter, GrilleHorsLigne, IndicateurReseau, ReseauPerduEnCulte } from '.';

afterEach(() => reinitialiserEtatReseau());

describe('états partagés', () => {
  it('vide : deux portes d’entrée', () => {
    render(<EtatRienAProjeter hrefExemple="/regie/?exemple=1" hrefSetlists="/setlists/" />);
    expect(screen.getByRole('heading', { name: 'Rien à projeter pour l’instant' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Essayer la setlist d’exemple' })).toHaveAttribute('href', expect.stringContaining('exemple=1'));
    expect(screen.getByRole('link', { name: 'Ouvrir une de mes setlists' })).toBeInTheDocument();
  });

  it('chargement : le titre est là, les diapositives arrivent', () => {
    render(<ChargementDiapositives titre="Grâce infinie" nombre={6} />);
    expect(screen.getByText('Grâce infinie')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Préparation des 6 diapositives… le titre est déjà projetable.');
  });

  it('hors-ligne : ce qui reste disponible et ce qui attend', () => {
    render(
      <GrilleHorsLigne
        disponibilites={[
          { libelle: 'Setlist du culte', disponible: true },
          { libelle: 'King James', disponible: false, statut: 'pas encore téléchargée' },
        ]}
      />
    );
    expect(screen.getByText('disponible')).toBeInTheDocument();
    expect(screen.getByText('pas encore téléchargée')).toBeInTheDocument();
  });

  it('réseau perdu en culte : bandeau et services', () => {
    render(<ReseauPerduEnCulte apercu={<div>aperçu</div>} enDirect />);
    expect(screen.getByText(/La projection continue/)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'État des services' })).toHaveTextContent('Télécommandeen attente');
  });

  it('indicateur : rien en ligne, serveur injoignable sur échec réseau', () => {
    render(<IndicateurReseau />);
    expect(screen.queryByRole('status')).toBeNull();
    act(() => signalerEchecApi(new ErreurApi('x', { chemin: '/songbook', reseau: true })));
    expect(screen.getByRole('status')).toHaveTextContent('Le serveur CMFIPraise ne répond pas');
  });
});
