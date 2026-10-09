import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { obtenirTransportDistant } from '@/lib/reseau/distant';
import type { CommandeDistante, CoteRegie, EtatDiffuse } from '@/lib/reseau/transport';

const parametres = { salle: '' };
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(parametres.salle ? { salle: parametres.salle } : {}),
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/telecommande/',
}));

const { Telecommande } = await import('./Telecommande');
const { SuivreParoles } = await import('./SuivreParoles');

const attendre = () => new Promise((r) => setTimeout(r, 40));

const etat: EtatDiffuse = {
  v: 1,
  titre: 'Grâce infinie',
  programme: { nom: 'Culte du dimanche', position: 2, total: 5 },
  precedente: { libelle: 'R.', genre: 'refrain', lignes: ['Gloire à l’Agneau,', 'gloire à Jésus,', 'Sa grâce est infinie'], lignesSecondes: null, reference: null },
  enDirect: { libelle: '2.', genre: 'couplet', lignes: ['C’est elle qui m’apprit la crainte,', 'C’est elle qui m’apaisa ;'], lignesSecondes: ['Twas grace that taught'], reference: null },
  suivante: { libelle: 'R.', genre: 'refrain', lignes: ['Gloire à l’Agneau'], lignesSecondes: null, reference: null, titreElement: 'Grâce infinie', changeElement: false },
  ecranNoir: false,
  texteMasque: false,
  logo: false,
  langues: { premiere: 'fr', seconde: 'en' },
  misAJourLe: 1,
};

describe('vues téléphone', () => {
  let regie: CoteRegie;

  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    regie = obtenirTransportDistant().ouvrirRegie();
    regie.diffuser(etat);
    parametres.salle = regie.invitation.codeSalle;
  });

  afterEach(() => regie.fermer());

  it('télécommande : demande, vérification, acceptation, puis Suivant', async () => {
    const recues: CommandeDistante[] = [];
    regie.surCommande((c) => recues.push(c));
    render(<Telecommande />);
    await act(attendre);

    await userEvent.type(screen.getByLabelText('Votre prénom'), 'Paul');
    await userEvent.click(screen.getByRole('button', { name: 'Demander à piloter' }));
    await act(attendre);
    await act(attendre);

    const demande = regie.appareils()[0]!;
    expect(screen.getByRole('heading', { name: 'Vérifiez ce code' })).toBeInTheDocument();
    expect(screen.getByText(demande.codeVerification)).toBeInTheDocument();

    await act(async () => {
      regie.accepter(demande.id);
      await attendre();
    });
    expect(screen.getByText('À l’écran · Grâce infinie · 2.')).toBeInTheDocument();
    expect(screen.getByText('Régie appairée · même navigateur')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Suivant/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Diapositive précédente' }));
    await userEvent.type(screen.getByLabelText('Verset demandé par le prédicateur'), 'Jn 3:16');
    expect(await screen.findByText(/Car Dieu a tant aimé le monde/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Mettre en suivante' }));
    await act(attendre);
    expect(recues).toEqual([
      { type: 'suivante' },
      { type: 'precedente' },
      { type: 'passage', reference: 'Jean 3:16', version: 'LSG', quand: 'suivante' },
    ]);
  });

  it('assemblée : paroles en direct sans rien demander, langues au choix', async () => {
    render(<SuivreParoles />);
    await act(attendre);
    await act(attendre);
    expect(screen.getByRole('heading', { name: 'Grâce infinie' })).toBeInTheDocument();
    expect(screen.getByText('Culte du dimanche · 2 / 5')).toBeInTheDocument();
    expect(screen.getByText('C’est elle qui m’apprit la crainte,')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'FR + EN' }));
    expect(screen.getByText('Twas grace that taught')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Texte plus grand' }));
    expect(window.localStorage.getItem('app_suivre_echelle')).toBe('1.1');
  });
});
