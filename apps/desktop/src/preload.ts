/**
 * Preload : expose `window.cmfi`, conforme à la lettre à packages/plateforme/src/contrat.ts.
 *
 * Rien d'autre ne passe : ni ipcRenderer, ni objet Electron, ni API Node (contextIsolation,
 * sandbox, pas de nodeIntegration). Chaque fonction ne fait qu'un `invoke` sur un canal du
 * contrat ; les vérifications vivent dans le processus principal (ipc.ts).
 *
 * Sandboxé, ce fichier n'a droit qu'à `require('electron')` : esbuild y incorpore le contrat.
 */
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

import { CANAUX_IPC, VERSION_CONTRAT, type ApiBureau, type EcranBureau, type NomSortie } from '@cmfi/plateforme/contrat';

declare const __VERSION_APP__: string;

/** Abonnement à un évènement du processus principal ; renvoie le désabonnement. */
function ecouter<T>(canal: string, rappel: (valeur: T) => void): () => void {
  // L'évènement IPC n'est jamais transmis à la page : il donne accès à `sender`.
  const relais = (_e: IpcRendererEvent, valeur: T) => rappel(valeur);
  ipcRenderer.on(canal, relais);
  return () => {
    ipcRenderer.removeListener(canal, relais);
  };
}

const systeme = process.platform === 'darwin' || process.platform === 'win32' ? process.platform : 'linux';

const api: ApiBureau = {
  versionContrat: VERSION_CONTRAT,
  versionApp: __VERSION_APP__,
  systeme,

  ecrans: {
    lister: () => ipcRenderer.invoke(CANAUX_IPC.ecransLister) as Promise<EcranBureau[]>,
    surChangement: (rappel) => ecouter<EcranBureau[]>(CANAUX_IPC.ecransChangement, rappel),
  },

  sorties: {
    ouvrir: (options) => ipcRenderer.invoke(CANAUX_IPC.sortiesOuvrir, options) as Promise<void>,
    fermer: (nom) => ipcRenderer.invoke(CANAUX_IPC.sortiesFermer, nom) as Promise<void>,
    estOuverte: (nom) => ipcRenderer.invoke(CANAUX_IPC.sortiesEstOuverte, nom) as Promise<boolean>,
    surFermeture: (rappel) => ecouter<NomSortie>(CANAUX_IPC.sortiesFermeture, rappel),
  },

  veille: {
    empecher: () => ipcRenderer.invoke(CANAUX_IPC.veilleEmpecher) as Promise<number>,
    autoriser: (identifiant) => ipcRenderer.invoke(CANAUX_IPC.veilleAutoriser, identifiant) as Promise<void>,
  },

  preferences: {
    lire: (cle) => ipcRenderer.invoke(CANAUX_IPC.preferencesLire, cle) as Promise<unknown>,
    ecrire: (cle, valeur) => ipcRenderer.invoke(CANAUX_IPC.preferencesEcrire, cle, valeur) as Promise<void>,
  },

  liens: {
    ouvrirExterne: (url) => ipcRenderer.invoke(CANAUX_IPC.liensOuvrirExterne, url) as Promise<void>,
  },
};

contextBridge.exposeInMainWorld('cmfi', api);
