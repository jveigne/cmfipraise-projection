import path from 'node:path';

import type { NextConfig } from 'next';

/**
 * Export statique : la même sortie `out/` sert le site web et est embarquée telle quelle
 * par l'app de bureau. D'où, partout dans l'app : pas de Server Actions, pas de routes
 * API, pas de segment dynamique `[id]` — les paramètres passent en query string (?id=),
 * et toutes les données se chargent côté client.
 */
const config: NextConfig = {
  output: 'export',
  // Des URL en « /regie/ » donnent des fichiers « regie/index.html » : servis tels quels
  // par n'importe quel hébergeur statique et par le protocole app:// d'Electron.
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  // Les paquets du monorepo sont publiés en TypeScript source : Next les compile.
  transpilePackages: ['@cmfi/api', '@cmfi/design', '@cmfi/plateforme', '@cmfi/projection'],
  turbopack: {
    root: path.resolve(process.cwd(), '../..'),
  },
};

export default config;
