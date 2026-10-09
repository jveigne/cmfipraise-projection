import '@cmfi/design/jetons.css';
import './globals.css';

import { Couleurs } from '@cmfi/design';
import type { Metadata, Viewport } from 'next';
import { Instrument_Sans, Newsreader } from 'next/font/google';
import type { ReactNode } from 'react';

import { Fournisseurs } from './fournisseurs';

// Polices auto-hébergées par next/font au build : aucune requête vers Google à
// l'exécution, donc la projection hors-ligne garde sa typographie.
const newsreader = Newsreader({
  subsets: ['latin', 'latin-ext'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  variable: '--font-newsreader',
  display: 'swap',
});

const instrumentSans = Instrument_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-instrument-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'CMFIPraise Projection', template: '%s · CMFIPraise' },
  description: 'Paroles et Bible projetées pendant le culte, pour les bénévoles. Gratuit.',
  applicationName: 'CMFIPraise Projection',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Pas de mode sombre de l'interface : seules les surfaces de projection sont sombres.
  colorScheme: 'light',
  themeColor: Couleurs.page,
};

/**
 * Layout racine : polices, jetons, fournisseurs. Aucun bandeau ni navigation ici, car la
 * sortie, l'écran des musiciens et les téléphones occupent tout l'écran ; chaque section
 * pose sa propre structure.
 */
export default function LayoutRacine({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${newsreader.variable} ${instrumentSans.variable}`}>
      <body>
        <Fournisseurs>{children}</Fournisseurs>
      </body>
    </html>
  );
}
