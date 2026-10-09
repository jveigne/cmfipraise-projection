/**
 * La page de sortie écoute la régie sur le BroadcastChannel : logo d'abord, puis l'état
 * reçu ; un état plus ancien est ignoré ; l'écran noir n'affiche rien ; les touches sont
 * relayées à la régie.
 */
import {
  elementDepuisChant,
  etatInitial,
  NOM_CANAL,
  reduireProjection,
  VERSION_PROTOCOLE,
  type Enveloppe,
  type EtatProjection,
  type MessageProjection,
} from '@cmfi/projection';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Sortie } from './Sortie';

const element = elementDepuisChant(
  { id: 'c', title: 'Grâce infinie', position: 1, parts: [{ position: 1, type: 'VERSE', partId: 1, lines: [{ line: 'Grâce infinie, ô son si doux' }] }] },
  { idElement: 'e' }
);

let regie: BroadcastChannel;
let recus: MessageProjection[] = [];

function diffuser(etat: EtatProjection) {
  const enveloppe: Enveloppe = { v: VERSION_PROTOCOLE, source: 'test-regie', role: 'regie', horodatage: Date.now(), message: { type: 'etat', etat } };
  regie.postMessage(enveloppe);
}

beforeEach(() => {
  recus = [];
  regie = new BroadcastChannel(NOM_CANAL);
  regie.onmessage = (e: MessageEvent<Enveloppe>) => recus.push(e.data.message);
});

afterEach(() => regie.close());

describe('Sortie', () => {
  it('montre le logo, demande l’état, puis projette ce que la régie diffuse', async () => {
    const { container } = render(<Sortie />);
    expect(screen.getByText('CMFI')).toBeInTheDocument();
    await waitFor(() => expect(recus.some((m) => m.type === 'demande-etat')).toBe(true));
    expect(recus.some((m) => m.type === 'presence' && m.present)).toBe(true);

    const projete = reduireProjection(etatInitial(1), { type: 'projeter', element, index: 0 }, 10);
    diffuser(projete);
    expect(await screen.findByText('Grâce infinie, ô son si doux')).toBeInTheDocument();

    // Un état plus ancien (message retardé) ne remplace pas celui affiché.
    diffuser(reduireProjection(etatInitial(1), { type: 'basculerLogo' }, 5));
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.getByText('Grâce infinie, ô son si doux')).toBeInTheDocument();

    // Écran noir : la surface ne montre plus rien du tout.
    diffuser(reduireProjection(projete, { type: 'basculerEcranNoir' }, 20));
    await waitFor(() => expect(screen.queryByText('Grâce infinie, ô son si doux')).toBeNull());
    const surface = container.querySelector('main > div');
    expect(surface?.textContent).toBe('');
  });

  it('relaie les touches de présentation à la régie', async () => {
    render(<Sortie />);
    fireEvent.keyDown(window, { key: 'PageDown' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'b' });
    await waitFor(() =>
      expect(recus.filter((m) => m.type === 'commande').map((m) => (m.type === 'commande' ? m.commande : null))).toEqual([
        'suivante',
        'precedente',
        'ecran-noir',
      ])
    );
  });
});
