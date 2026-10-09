/**
 * Mises à jour automatiques (electron-updater, depuis les GitHub Releases).
 *
 * INACTIVES tant que l'app n'est pas signée : macOS refuse d'installer une mise à jour non
 * signée, et sous Windows une mise à jour non signée réveille SmartScreen à chaque fois. Le
 * build signé les active avec CMFI_MISES_A_JOUR=1 (voir docs/bureau.md).
 *
 * Jamais pendant le culte : on télécharge en silence, et l'installation n'a lieu qu'à la
 * fermeture de l'app. Aucune boîte de dialogue ne s'ouvre au-dessus de la régie.
 *
 * electron-updater n'est pas encore une dépendance : chargé à la demande, son absence
 * désactive simplement la fonction.
 */
import { app } from 'electron';

import { MISES_A_JOUR_ACTIVES } from './config';

interface MiseAJourMinimale {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  on(evenement: 'error', rappel: (erreur: Error) => void): unknown;
  checkForUpdates(): Promise<unknown>;
}

export function demarrerMisesAJour(): void {
  if (!MISES_A_JOUR_ACTIVES || !app.isPackaged) return;

  let autoUpdater: MiseAJourMinimale;
  try {
    // require dynamique : marqué « external » dans esbuild, résolu dans le paquet installé.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    autoUpdater = (require('electron-updater') as { autoUpdater: MiseAJourMinimale }).autoUpdater;
  } catch {
    console.warn('[mises à jour] electron-updater absent : fonction désactivée.');
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  // Hors-ligne au culte : une erreur de réseau ici est normale, on la note et c'est tout.
  autoUpdater.on('error', (erreur) => console.warn('[mises à jour]', erreur.message));

  // Pas au démarrage même : on laisse la régie s'ouvrir d'abord.
  setTimeout(() => void autoUpdater.checkForUpdates().catch(() => undefined), 30_000);
}
