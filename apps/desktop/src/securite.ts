/**
 * Sécurité des fenêtres : CSP, navigation, fenêtres surgissantes, permissions, liens externes.
 *
 * Principe : les fenêtres ne montrent QUE la web app (origine app://cmfi, ou next dev). Tout
 * le reste — un lien vers le site de don, une adresse e-mail — part dans le navigateur ou la
 * messagerie du système, jamais dans une fenêtre Electron qui aurait le preload.
 */
import { app, session, shell, type IpcMainInvokeEvent, type WebContents } from 'electron';

import { ORIGINE_API, ORIGINE_FENETRES, URL_DEV, origineDe } from './config';

/**
 * CSP de l'export. `'unsafe-inline'` sur les scripts est inévitable : un export statique Next
 * injecte ses données RSC en <script> en ligne, sans nonce possible (pas de serveur). Le
 * risque reste borné : aucune donnée n'est interprétée en HTML (React échappe tout), et
 * connect-src limite les échanges à l'app elle-même et au backend.
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  `connect-src 'self' ${ORIGINE_API}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
].join('; ');

/** En dev, next dev a besoin d'eval et de son websocket de rechargement à chaud. */
const CSP_DEV = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  `connect-src 'self' ws: ${ORIGINE_API}`,
  "object-src 'none'",
  "frame-ancestors 'none'",
].join('; ');

/** Vrai si l'URL appartient à la web app (et peut donc s'afficher dans nos fenêtres). */
export function estUrlApp(url: string): boolean {
  return origineDe(url) === ORIGINE_FENETRES;
}

/** Seuls https: et mailto: quittent l'app ; le reste (file:, javascript:, smb:…) est ignoré. */
export function estLienExterneAutorise(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'mailto:';
  } catch {
    return false;
  }
}

export async function ouvrirLienExterne(url: string): Promise<void> {
  if (!estLienExterneAutorise(url)) {
    console.warn('[sécurité] lien externe refusé :', url);
    return;
  }
  await shell.openExternal(url);
}

/** L'IPC n'écoute que le cadre principal d'une page de la web app. */
export function expediteurDeConfiance(evenement: IpcMainInvokeEvent): boolean {
  const cadre = evenement.senderFrame;
  if (!cadre || cadre.parent) return false;
  return estUrlApp(cadre.url);
}

function verrouillerContenu(contenu: WebContents): void {
  contenu.on('will-navigate', (evenement, url) => {
    if (estUrlApp(url)) return;
    evenement.preventDefault();
    void ouvrirLienExterne(url);
  });
  contenu.on('will-redirect', (evenement, url) => {
    if (!estUrlApp(url)) evenement.preventDefault();
  });
  // La régie ouvre ses sorties par l'IPC (contrat), jamais par window.open.
  contenu.setWindowOpenHandler(({ url }) => {
    if (!estUrlApp(url)) void ouvrirLienExterne(url);
    return { action: 'deny' };
  });
  contenu.on('will-attach-webview', (evenement) => evenement.preventDefault());
}

const PERMISSIONS_ACCORDEES = new Set(['fullscreen', 'clipboard-sanitized-write']);

/** À appeler une fois l'app prête. */
export function appliquerSecurite(): void {
  app.on('web-contents-created', (_e, contenu) => verrouillerContenu(contenu));

  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((contenu, permission, rappel) => {
    rappel(PERMISSIONS_ACCORDEES.has(permission) && estUrlApp(contenu.getURL()));
  });
  ses.setPermissionCheckHandler((_contenu, permission, origine) => PERMISSIONS_ACCORDEES.has(permission) && origineDe(origine) === ORIGINE_FENETRES);

  // L'export reçoit sa CSP du protocole ; next dev, lui, la reçoit ici.
  if (URL_DEV) {
    ses.webRequest.onHeadersReceived({ urls: [`${URL_DEV}/*`] }, (details, rappel) => {
      const entetes = { ...details.responseHeaders };
      if (details.resourceType === 'mainFrame' || details.resourceType === 'subFrame') {
        entetes['Content-Security-Policy'] = [CSP_DEV];
      }
      rappel({ responseHeaders: entetes });
    });
  }
}
