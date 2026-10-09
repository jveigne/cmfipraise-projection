/**
 * Parcours complet de la régie, hors-ligne : setlist d'exemple → prêt → lancer → direct
 * (clavier, écran noir) → fin du culte. Le réseau est coupé (fetch rejette) : la régie doit
 * tout faire avec la Bible d'échantillon et les copies d'exemple, sans jamais s'arrêter.
 */
import { NOM_CANAL, type Enveloppe, type EtatProjection } from '@cmfi/projection';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FournisseurLangue } from '@/lib/i18n';
import { FournisseurSession } from '@/lib/session';

import { Regie } from './Regie';

const navigation = vi.hoisted(() => ({ parametres: 'exemple', replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(navigation.parametres),
  useRouter: () => ({ replace: navigation.replace, push: () => {} }),
}));

/** Derniers états diffusés sur le canal, tels qu'une sortie les recevrait. */
let recus: EtatProjection[] = [];
let ecoute: BroadcastChannel | null = null;

beforeEach(() => {
  recus = [];
  navigation.parametres = 'exemple';
  navigation.replace.mockClear();
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
  );
  // La fenêtre de sortie : jsdom n'ouvre rien, on simule une fenêtre ouverte.
  vi.spyOn(window, 'open').mockImplementation(() => ({ closed: false, focus: () => {}, close: () => {}, location: { href: '' } }) as unknown as Window);
  if (typeof BroadcastChannel !== 'undefined') {
    ecoute = new BroadcastChannel(NOM_CANAL);
    ecoute.onmessage = (e: MessageEvent<Enveloppe>) => {
      if (e.data?.message?.type === 'etat') recus.push(e.data.message.etat);
    };
  }
});

afterEach(() => {
  ecoute?.close();
  ecoute = null;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function rendre() {
  return render(
    <FournisseurLangue>
      <FournisseurSession>
        <Regie />
      </FournisseurSession>
    </FournisseurLangue>
  );
}

describe('Régie — parcours hors-ligne avec la setlist d’exemple', () => {
  it('prépare, lance, projette au clavier, coupe l’écran puis termine le culte', async () => {
    const user = userEvent.setup();
    rendre();

    // Préparation : la setlist d'exemple se charge, les chants tombent sur leurs copies.
    expect(await screen.findByRole('heading', { name: 'Setlist d’exemple' })).toBeInTheDocument();
    const setlist = screen.getByRole('region', { name: 'Setlist d’exemple' });
    await waitFor(() => expect(within(setlist).getAllByText(/exemple/).length).toBeGreaterThan(0));
    expect(within(setlist).getByText('Psaume 23:1-4')).toBeInTheDocument();
    expect(screen.getByText('Préparation · rien n’est projeté')).toBeInTheDocument();
    await screen.findByRole('heading', { name: /Tout est prêt|Presque prêt/ });

    // Lancer : la sortie s'ouvre, montre le logo ; la première diapositive attend « Suivant ».
    await user.click(screen.getByRole('button', { name: 'Lancer la projection' }));
    expect(window.open).toHaveBeenCalled();
    expect(await screen.findByText('La sortie affiche le logo. La première diapositive attend votre « Suivant ».')).toBeInTheDocument();

    // → : première diapositive en direct (bordure or, aria-current). Le couplet de huit
    // lignes est coupé en deux diapositives de quatre.
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    const enDirect = await screen.findByRole('button', { name: '1. 1/2, en direct' });
    expect(enDirect).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'Projeter 1. 2/2' })).toBeInTheDocument();
    // L'aperçu montre exactement la sortie : étiquette du chant comprise.
    expect(screen.getAllByText('A TOI LA GLOIRE. · 1.').length).toBeGreaterThan(0);

    // B : écran noir ; la bascule le montre, l'aperçu le dit.
    fireEvent.keyDown(window, { key: 'b' });
    expect(screen.getByRole('button', { name: /Écran noir/, pressed: true })).toBeInTheDocument();
    expect(screen.getByText('Écran noir — B pour rétablir')).toBeInTheDocument();
    // Projeter rétablit l'écran.
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByRole('button', { name: /Écran noir/, pressed: false })).toBeInTheDocument();

    // Une touche tapée dans un champ ne pilote pas la projection.
    const champ = screen.getByRole('combobox', { name: 'Ajouter à la setlist' });
    fireEvent.keyDown(champ, { key: 'b' });
    expect(screen.getByRole('button', { name: /Écran noir/, pressed: false })).toBeInTheDocument();

    // Jusqu'au bout de la setlist : « Suivant » devient « Terminer le culte ».
    for (let i = 0; i < 40 && !screen.queryByRole('button', { name: 'Terminer le culte' }); i++) {
      fireEvent.keyDown(window, { key: 'ArrowRight' });
    }
    await user.click(screen.getByRole('button', { name: 'Terminer le culte' }));
    expect(await screen.findByRole('heading', { name: 'Le culte est terminé. Merci pour votre service.' })).toBeInTheDocument();
    expect(screen.getByText('Projection terminée · la sortie affiche le logo')).toBeInTheDocument();

    // La sortie a reçu des états, le dernier étant le logo.
    if (ecoute) {
      await waitFor(() => expect(recus.at(-1)?.logo).toBe(true));
      expect(recus.some((e) => e.element?.genre === 'bible')).toBe(true);
    }

    // Reprendre ramène au direct, sur la dernière diapositive.
    await user.click(screen.getByRole('button', { name: 'Reprendre la projection' }));
    expect(await screen.findByRole('button', { name: 'Terminer le culte' })).toBeInTheDocument();
  });

  it('la barre unique ajoute un passage biblique en fin de setlist', async () => {
    const user = userEvent.setup();
    rendre();
    await screen.findByRole('heading', { name: 'Setlist d’exemple' });

    const champ = screen.getByRole('combobox', { name: 'Ajouter à la setlist' });
    await user.type(champ, 'Jn 3:16, Rm 8,28');
    const liste = await screen.findByRole('listbox', { name: 'Ce que la barre a compris' });
    await waitFor(() => expect(within(liste).getAllByRole('option')).toHaveLength(2));
    // Romains 8:28 n'est pas dans l'échantillon : présenté, mais pas ajoutable.
    expect(within(liste).getByText(/n’est pas encore disponible/)).toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(champ, { key: 'Enter' });
    });
    expect(champ).toHaveValue('');
    const setlist = screen.getByRole('region', { name: 'Setlist d’exemple' });
    await waitFor(() => expect(within(setlist).getAllByRole('listitem')).toHaveLength(5));
  });

  it('?bible= ajoute le passage à la séance, le montre, puis rend l’adresse à /regie/', async () => {
    navigation.parametres = 'bible=Jean%203%3A16&version=LSG&seconde=KJV';
    rendre();
    expect(await screen.findByRole('heading', { name: 'Jean 3:16' })).toBeInTheDocument();
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/regie/'));
    // Une seule fois : l'ajout ne se répète pas.
    expect(navigation.replace).toHaveBeenCalledTimes(1);
  });
});
