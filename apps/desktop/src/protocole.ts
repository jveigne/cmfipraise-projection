/**
 * Protocole `app://cmfi` : sert l'export statique de la web app depuis le disque.
 *
 * Pourquoi pas `file://` : une origine `file://` est opaque — IndexedDB, BroadcastChannel et
 * les chemins absolus de Next (`/_next/…`) s'y comportent mal. Un schéma « standard » et
 * « secure » donne une vraie origine, stable d'une version à l'autre : le cache hors-ligne
 * et les setlists locales survivent aux mises à jour.
 *
 * Correspondance des chemins (export Next avec trailingSlash) :
 *   /regie/            → regie/index.html
 *   /regie             → redirection vers /regie/ (les chemins relatifs restent justes)
 *   /_next/static/x.js → _next/static/x.js
 *   /_donnees/…        → instantané embarqué (recueils, Bibles), hors de l'export web
 *   introuvable        → 404.html, statut 404
 */
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { protocol } from 'electron';

import { HOTE, SCHEMA } from './config';
import { CSP } from './securite';

/** À appeler AVANT `app.whenReady()` : les privilèges d'un schéma se déclarent au démarrage. */
export function declarerSchema(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEMA,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
        codeCache: true,
      },
    },
  ]);
}

const TYPES_MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  // Charges utiles RSC de Next (navigation côté client) : texte brut, comme sur un hébergeur statique.
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm',
};

function typeMime(fichier: string): string {
  return TYPES_MIME[path.extname(fichier).toLowerCase()] ?? 'application/octet-stream';
}

/**
 * Chemin disque sous `racine`, ou null s'il en sortirait. `path.resolve` absorbe les `..`
 * et les `%2e%2e` déjà décodés : on vérifie le résultat, pas la chaîne d'entrée.
 */
function sousRacine(racine: string, cheminUrl: string): string | null {
  const relatif = cheminUrl.replace(/^\/+/, '');
  const absolu = path.resolve(racine, relatif);
  const racineNormalisee = path.resolve(racine);
  if (absolu !== racineNormalisee && !absolu.startsWith(racineNormalisee + path.sep)) return null;
  return absolu;
}

async function estFichier(chemin: string): Promise<boolean> {
  try {
    return (await stat(chemin)).isFile();
  } catch {
    return false;
  }
}

async function estDossier(chemin: string): Promise<boolean> {
  try {
    return (await stat(chemin)).isDirectory();
  } catch {
    return false;
  }
}

function entetes(fichier: string, extra: Record<string, string> = {}): Headers {
  const h = new Headers({
    'Content-Type': typeMime(fichier),
    'X-Content-Type-Options': 'nosniff',
    // Les fichiers de _next/static portent un hachage : immuables. Le reste doit suivre l'export.
    'Cache-Control': fichier.includes(`${path.sep}_next${path.sep}static${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
    ...extra,
  });
  if (fichier.endsWith('.html')) h.set('Content-Security-Policy', CSP);
  return h;
}

async function servir(fichier: string, statut = 200): Promise<Response> {
  const corps = await readFile(fichier);
  return new Response(corps, { status: statut, headers: entetes(fichier) });
}

function texte(statut: number, message: string): Response {
  return new Response(message, { status: statut, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

export interface RacinesProtocole {
  /** Export statique de la web app. */
  web: string;
  /** Instantané des données, servi sous /_donnees/. */
  donnees: string;
}

/** Résout une requête app:// en réponse. Exporté pour être testable sans Electron. */
export async function repondre(url: URL, methode: string, racines: RacinesProtocole): Promise<Response> {
  if (url.host !== HOTE) return texte(404, 'Hôte inconnu');
  if (methode !== 'GET' && methode !== 'HEAD') return texte(405, 'Méthode non autorisée');

  let chemin: string;
  try {
    chemin = decodeURIComponent(url.pathname);
  } catch {
    return texte(400, 'Chemin invalide');
  }
  if (chemin.includes('\0')) return texte(400, 'Chemin invalide');

  // Données embarquées : un dossier à part, pour que l'export web reste celui du site.
  if (chemin === '/_donnees' || chemin.startsWith('/_donnees/')) {
    const fichier = sousRacine(racines.donnees, chemin.slice('/_donnees'.length));
    if (fichier && (await estFichier(fichier))) return servir(fichier);
    return texte(404, 'Donnée absente');
  }

  const cible = sousRacine(racines.web, chemin);
  if (!cible) return texte(404, 'Introuvable');

  if (chemin.endsWith('/')) {
    const index = path.join(cible, 'index.html');
    if (await estFichier(index)) return servir(index);
  } else {
    if (await estFichier(cible)) return servir(cible);
    // « /regie » → « /regie/ » : la forme exportée, et celle que Next attend avec trailingSlash.
    if (await estFichier(path.join(cible, 'index.html'))) {
      return new Response(null, { status: 308, headers: { Location: `${chemin}/${url.search}` } });
    }
    // Next exporte parfois « page.html » à côté de « page/ » : on l'accepte aussi.
    if (!path.extname(cible) && (await estFichier(`${cible}.html`))) return servir(`${cible}.html`);
  }

  const page404 = path.join(racines.web, '404.html');
  if (await estFichier(page404)) return servir(page404, 404);
  return texte(404, 'Introuvable');
}

/** À appeler une fois l'app prête. */
export async function enregistrerProtocole(racines: RacinesProtocole): Promise<void> {
  if (!(await estDossier(racines.web))) {
    // Pas d'export : on le dit à l'écran plutôt que de laisser une fenêtre blanche.
    console.error(`[protocole] export web introuvable : ${racines.web}. Lancer « npm run build -w @cmfi/web ».`);
  }
  protocol.handle(SCHEMA, async (requete) => {
    try {
      return await repondre(new URL(requete.url), requete.method, racines);
    } catch (erreur) {
      console.error('[protocole]', requete.url, erreur);
      return texte(500, 'Erreur de lecture');
    }
  });
}
