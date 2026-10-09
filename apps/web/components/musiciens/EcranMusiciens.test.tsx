import { etatInitial, ouvrirCanal, reduireProjection, resumerProgramme, type ElementProjete } from '@cmfi/projection';
import { act, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EcranMusiciens } from './EcranMusiciens';

const chant: ElementProjete = {
  id: 'e1',
  genre: 'chant',
  titre: 'Grâce infinie',
  meta: 'Recueil CMFI',
  ordre: '1 R',
  // Fa original, joué en Sol : les accords sont décalés de deux demi-tons.
  tonalite: { racine: 5, mineur: false },
  transposition: 2,
  personnel: false,
  diapositives: [
    {
      id: 'e1:0', genre: 'couplet', libelle: '1.', numero: 1,
      lignes: [{ texte: 'C’est elle', accords: [{ id: 'a', rootNoteIndex: 5, quality: '', charIndex: 0 }] }],
      lignesSecondes: null, reference: null, referenceSeconde: null, morceau: null, partId: 1,
    },
    {
      id: 'e1:1', genre: 'refrain', libelle: 'R.', numero: null,
      lignes: [{ texte: 'Gloire à l’Agneau' }],
      lignesSecondes: null, reference: null, referenceSeconde: null, morceau: null, partId: 2,
    },
  ],
};

const attendre = () => new Promise((r) => setTimeout(r, 30));

describe('EcranMusiciens', () => {
  it('attend la régie, puis montre la partie en cours avec ses accords transposés', async () => {
    render(<EcranMusiciens />);
    expect(screen.getByRole('heading', { name: 'En attente de la régie' })).toBeInTheDocument();

    const regie = ouvrirCanal('regie');
    let etat = reduireProjection(etatInitial(0), {
      type: 'projeter',
      element: chant,
      index: 0,
      suivante: { titreElement: chant.titre, changeElement: false, diapositive: chant.diapositives[1]! },
    }, 1);
    etat = reduireProjection(etat, { type: 'definirProgramme', programme: resumerProgramme('Culte', [chant], 0) }, 2);
    await act(async () => {
      regie.envoyer({ type: 'etat', etat });
      await attendre();
    });

    expect(screen.getByRole('heading', { name: 'Grâce infinie' })).toBeInTheDocument();
    expect(screen.getByText('Musiciens · 1 / 1')).toBeInTheDocument();
    expect(screen.getByText('En cours')).toBeInTheDocument();
    // Fa + 2 = G (notation en lettres par défaut) ; tonalité jouée Sol, originale Fa.
    expect(screen.getByText('G')).toBeInTheDocument();
    expect(screen.getByText('Sol')).toBeInTheDocument();
    expect(screen.getByText('Fa')).toBeInTheDocument();
    expect(screen.getByText('Partie suivante')).toBeInTheDocument();
    const structure = screen.getByRole('heading', { name: 'Structure' }).parentElement!;
    expect(within(structure).getByLabelText('Partie 1., en cours')).toHaveAttribute('aria-current', 'step');
    expect(within(structure).getByLabelText('Partie R., suivante')).toBeInTheDocument();
    regie.fermer();
  });
});
