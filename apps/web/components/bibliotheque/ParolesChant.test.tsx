import type { ChantDTO } from '@cmfi/api';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ParolesChant } from './ParolesChant';

const chant: ChantDTO = {
  id: 'grace',
  position: 112,
  title: 'Grâce infinie',
  keyRootIndex: 7,
  parts: [
    {
      position: 1,
      type: 'VERSE',
      partId: 1,
      lines: [{ line: 'Grâce infinie, ô son si doux,', chords: [{ id: 'c1', rootNoteIndex: 7, quality: '', charIndex: 0 }] }],
    },
    { position: 2, type: 'CHORUS', partId: 9, lines: [{ line: 'Gloire à l’Agneau, gloire à Jésus,' }] },
    { position: 3, type: 'VERSE', partId: 2, lines: [{ line: 'C’est elle qui m’apprit la crainte,' }] },
  ],
};

describe('ParolesChant', () => {
  it('numérote les couplets et marque le refrain « R. », dans l’ordre d’enchaînement', () => {
    render(<ParolesChant chant={chant} accords={false} transposition={0} taille={19} notation="en" />);
    const parties = screen.getAllByRole('region');
    expect(parties.map((p) => p.getAttribute('aria-label'))).toEqual(['Couplet 1', 'Refrain', 'Couplet 2']);
    expect(screen.getByText('R.')).toBeInTheDocument();
  });

  it('transpose les accords sans toucher aux paroles lues', () => {
    render(<ParolesChant chant={chant} accords transposition={2} taille={19} notation="en" />);
    // Sol + 2 demi-tons = La ; la ligne reste lisible d'un bloc pour les lecteurs d'écran.
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('Grâce infinie, ô son si doux,', { selector: '.visuellement-masque' })).toBeInTheDocument();
  });
});
