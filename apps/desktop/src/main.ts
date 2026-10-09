/**
 * Processus principal de CMFIPraise Projection (bureau).
 *
 * Il ne contient aucun écran : il sert la web app exportée (protocole app://cmfi), ouvre la
 * régie et ses sorties sur les bons écrans, empêche la veille et répond au contrat
 * `window.cmfi`. Tout le reste est la web app, identique au site.
 */
import { app, BrowserWindow } from 'electron';

import { RELAIS_API_ACTIF, URL_DEV, dossierDonnees, dossierWeb } from './config';
import { confirmerFermeture, fermerToutesLesFenetres, ouvrirRegie, suivreLesEcrans } from './fenetres';
import { enregistrerIpc } from './ipc';
import { installerMenu } from './menu';
import { demarrerMisesAJour } from './misesAJour';
import { declarerSchema, enregistrerProtocole } from './protocole';
import { activerRelaisApi } from './relaisApi';
import { appliquerSecurite } from './securite';

// Une seule instance : deux régies piloteraient la même sortie par le même BroadcastChannel.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // Avant `ready` : les privilèges d'un schéma se déclarent au démarrage.
  declarerSchema();

  app.on('second-instance', () => ouvrirRegie());

  // macOS : l'app reste dans le Dock fenêtre fermée, comme toute app Mac ; ailleurs on quitte.
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) ouvrirRegie();
  });
  app.on('before-quit', (evenement) => {
    if (!confirmerFermeture()) evenement.preventDefault();
    else fermerToutesLesFenetres();
  });

  // Une erreur inattendue du processus principal est notée, jamais fatale : la projection
  // tourne dans les fenêtres, elle doit survivre à un incident de second plan.
  process.on('uncaughtException', (erreur) => console.error('[principal] exception non rattrapée', erreur));
  process.on('unhandledRejection', (raison) => console.error('[principal] promesse rejetée', raison));

  void app.whenReady().then(async () => {
    appliquerSecurite();
    await enregistrerProtocole({ web: dossierWeb(), donnees: dossierDonnees() });
    if (RELAIS_API_ACTIF) activerRelaisApi();
    enregistrerIpc();
    installerMenu();
    suivreLesEcrans();
    ouvrirRegie();
    demarrerMisesAJour();
    if (URL_DEV) console.log(`[principal] mode dev : ${URL_DEV}`);
  });
}
