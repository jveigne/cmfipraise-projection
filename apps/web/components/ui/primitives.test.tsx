import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { Bouton } from './Bouton';
import { EtiquetteEtat } from './EtiquetteEtat';
import { Interrupteur } from './Interrupteur';
import { Onglets } from './Onglets';

describe('primitives', () => {
  it('Bouton rend un vrai bouton, ou un lien avec href', () => {
    render(
      <>
        <Bouton variante="plein">Projeter</Bouton>
        <Bouton href="/regie/">Régie</Bouton>
      </>
    );
    expect(screen.getByRole('button', { name: 'Projeter' })).toHaveAttribute('type', 'button');
    // Hors de Next, next/link ignore trailingSlash : on ne vérifie que la cible.
    expect(screen.getByRole('link', { name: 'Régie' }).getAttribute('href')).toMatch(/^\/regie\/?$/);
  });

  it('Interrupteur expose son état', () => {
    function Temoin() {
      const [coche, setCoche] = useState(false);
      return <Interrupteur coche={coche} surChangement={setCoche} libelle="Bilingue FR + EN" />;
    }
    render(<Temoin />);
    const bascule = screen.getByRole('switch', { name: 'Bilingue FR + EN' });
    expect(bascule).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(bascule);
    expect(bascule).toHaveAttribute('aria-checked', 'true');
  });

  it('Onglets : flèches du clavier et un seul onglet tabulable', () => {
    function Temoin() {
      const [actif, setActif] = useState<'a' | 'b'>('a');
      return (
        <Onglets
          idBase="t"
          aria-label="Filtrer"
          actif={actif}
          surChangement={setActif}
          onglets={[
            { id: 'a', libelle: 'Langue' },
            { id: 'b', libelle: 'Catégorie' },
          ]}
        />
      );
    }
    render(<Temoin />);
    const [a, b] = screen.getAllByRole('tab');
    expect(a).toHaveAttribute('tabindex', '0');
    expect(b).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(a!, { key: 'ArrowRight' });
    expect(b).toHaveAttribute('aria-selected', 'true');
    expect(b).toHaveFocus();
  });

  it('EtiquetteEtat : libellé par défaut en français', () => {
    render(<EtiquetteEtat etat="direct" />);
    expect(screen.getByText('En direct')).toBeInTheDocument();
  });
});
