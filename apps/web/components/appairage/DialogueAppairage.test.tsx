import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { obtenirTransportDistant } from '@/lib/reseau/distant';

import { DialogueAppairage } from './DialogueAppairage';

const attendre = () => new Promise((r) => setTimeout(r, 40));

describe('DialogueAppairage', () => {
  it('affiche la demande d’un téléphone avec son code, et l’accepte', async () => {
    window.sessionStorage.clear();
    render(<DialogueAppairage ouvert surFermeture={() => {}} />);
    await act(attendre);

    expect(screen.getByRole('heading', { name: 'Appairer un téléphone' })).toBeInTheDocument();
    const qr = screen.getByRole('img', { name: /Code QR menant à .*\/telecommande\/\?salle=/ });
    const code = /salle=([A-Z0-9]{6})/.exec(qr.getAttribute('aria-label') ?? '')![1]!;

    const tel = obtenirTransportDistant().rejoindre({ codeSalle: code, role: 'telecommande', nom: 'Paul' });
    await act(attendre);
    expect(screen.getByText('Le téléphone de Paul demande à piloter la régie.')).toBeInTheDocument();
    expect(screen.getByText(tel.codeVerification)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Accepter' }));
    await act(attendre);
    expect(tel.liaison()).toBe('connecte');
    expect(screen.getByRole('button', { name: 'Retirer la télécommande de Paul' })).toBeInTheDocument();
    tel.fermer();
  });

  it('montre le QR des paroles dans l’onglet de l’assemblée', async () => {
    render(<DialogueAppairage ouvert surFermeture={() => {}} ongletInitial="assemblee" />);
    await act(attendre);
    expect(screen.getByRole('img', { name: /\/suivre\/\?salle=/ })).toBeInTheDocument();
    expect(screen.getByText('Aucun téléphone ne suit encore les paroles.')).toBeInTheDocument();
  });
});
