import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CodeQr, tracerQr } from './CodeQr';

describe('CodeQr', () => {
  it('produit une vraie matrice QR (21 modules et plus) avec ses trois repères', () => {
    const qr = tracerQr('https://exemple.org/telecommande/?salle=K7MQ2X');
    expect(qr).not.toBeNull();
    const { cote, trace } = qr!;
    expect(cote).toBeGreaterThanOrEqual(21);
    // Coin haut gauche du repère de position : toujours noir.
    expect(trace.startsWith('M0 0h1v1h-1z')).toBe(true);
  });

  it('s’annonce par son libellé', () => {
    render(<CodeQr valeur="https://exemple.org" libelle="Code QR menant à exemple.org" />);
    expect(screen.getByRole('img', { name: 'Code QR menant à exemple.org' })).toBeInTheDocument();
  });
});
