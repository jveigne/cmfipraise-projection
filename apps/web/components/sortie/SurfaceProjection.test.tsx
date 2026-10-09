import { decouperPassage, elementDepuisChant, sourceEchantillon, analyserReference, THEME_PAR_DEFAUT } from '@cmfi/projection';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SurfaceProjection } from './SurfaceProjection';
import { tracerQr } from '@/components/ui';

const chant = elementDepuisChant(
  {
    id: 'c',
    title: 'Grâce infinie',
    position: 1,
    parts: [
      { position: 1, type: 'VERSE', partId: 1, lines: [{ line: 'Première ligne' }, { line: 'Deuxième ligne' }] },
      { position: 2, type: 'CHORUS', partId: 2, lines: [{ line: 'Refrain' }] },
    ],
  },
  {
    idElement: 'e',
    chantSecond: {
      id: 'c2',
      title: 'Amazing Grace',
      position: 1,
      parts: [
        { position: 1, type: 'VERSE', partId: 1, lines: [{ line: 'First line' }] },
        { position: 2, type: 'CHORUS', partId: 2, lines: [{ line: 'Chorus' }] },
      ],
    },
  }
);

const URL_QR = 'https://exemple.test/suivre/';

describe('SurfaceProjection', () => {
  it('écran noir : noir pur, sans texte, sans QR, sans référence', () => {
    const { container } = render(
      <SurfaceProjection contenu="noir" diapositive={chant.diapositives[0]!} titreElement={chant.titre} theme={THEME_PAR_DEFAUT} bilingue={false} mode="sortie" urlQr={URL_QR} />
    );
    expect(container.textContent).toBe('');
    expect(container.querySelector('svg')).toBeNull();
  });

  it('l’aperçu de la régie peut seulement dire que l’écran est noir', () => {
    render(
      <SurfaceProjection contenu="noir" diapositive={null} titreElement={null} theme={THEME_PAR_DEFAUT} bilingue={false} mode="apercu" messageEcranNoir="Écran noir — B pour rétablir" />
    );
    expect(screen.getByText('Écran noir — B pour rétablir')).toBeInTheDocument();
  });

  it('projette les lignes, l’étiquette du chant et le QR « suivre »', () => {
    render(
      <SurfaceProjection contenu="texte" diapositive={chant.diapositives[0]!} titreElement={chant.titre} theme={THEME_PAR_DEFAUT} bilingue={false} mode="sortie" urlQr={URL_QR} />
    );
    expect(screen.getByText('Première ligne')).toBeInTheDocument();
    expect(screen.getByText('Deuxième ligne')).toBeInTheDocument();
    expect(screen.getByText('Grâce infinie · 1.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /QR code/ })).toBeInTheDocument();
    // Bilingue désactivé : la seconde langue n'apparaît pas.
    expect(screen.queryByText('First line')).toBeNull();
  });

  it('en bilingue, la seconde langue suit la première', () => {
    render(
      <SurfaceProjection contenu="texte" diapositive={chant.diapositives[0]!} titreElement={chant.titre} theme={THEME_PAR_DEFAUT} bilingue mode="sortie" urlQr={null} />
    );
    expect(screen.getByText('First line')).toBeInTheDocument();
  });

  it('respecte le thème : ni référence ni QR quand ils sont désactivés', () => {
    const theme = { ...THEME_PAR_DEFAUT, afficherReference: false, afficherQr: false };
    render(<SurfaceProjection contenu="texte" diapositive={chant.diapositives[1]!} titreElement={chant.titre} theme={theme} bilingue={false} mode="sortie" urlQr={URL_QR} />);
    expect(screen.queryByText(/Grâce infinie ·/)).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('un verset en deux versions : colonnes nommées et références des deux langues', async () => {
    const ref = analyserReference('Jean 3:16')!;
    const lsg = await sourceEchantillon.lirePassage('LSG', ref);
    const kjv = await sourceEchantillon.lirePassage('KJV', ref);
    const [d] = decouperPassage(lsg!, kjv);
    render(<SurfaceProjection contenu="texte" diapositive={d!} titreElement="Jean 3:16" theme={THEME_PAR_DEFAUT} bilingue mode="sortie" urlQr={URL_QR} />);
    expect(screen.getByText('Louis Segond 1910')).toBeInTheDocument();
    expect(screen.getByText('King James')).toBeInTheDocument();
    expect(screen.getByText('Jean 3:16 · John 3:16')).toBeInTheDocument();
  });

  it('masquer le texte : le fond seul', () => {
    const { container } = render(
      <SurfaceProjection contenu="fond" diapositive={chant.diapositives[0]!} titreElement={chant.titre} theme={THEME_PAR_DEFAUT} bilingue={false} mode="sortie" urlQr={URL_QR} />
    );
    expect(container.textContent).toBe('');
  });

  it('logo : le nom de l’assemblée, rien d’autre', () => {
    const { container } = render(<SurfaceProjection contenu="logo" diapositive={null} titreElement={null} theme={THEME_PAR_DEFAUT} bilingue={false} mode="sortie" urlQr={URL_QR} />);
    expect(container.textContent).toBe('CMFI');
  });
});

describe('tracerQr', () => {
  it('produit un vrai QR (version 1 minimum : 21 modules de côté)', () => {
    const qr = tracerQr(URL_QR);
    expect(qr?.cote).toBeGreaterThanOrEqual(21);
    expect(qr?.trace).toMatch(/^M\d+ \d+h1v1h-1z/);
  });
});
