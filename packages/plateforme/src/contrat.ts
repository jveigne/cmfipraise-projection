/**
 * CONTRAT entre la web app et l'app de bureau : ce que le preload Electron expose sous
 * `window.cmfi` (contextBridge.exposeInMainWorld('cmfi', …)).
 *
 * C'est la SEULE porte entre les deux mondes. La web app n'importe jamais `electron` et
 * n'appelle jamais `window.cmfi` directement : elle passe par l'interface `Plateforme`
 * (types.ts), dont l'implémentation bureau (bureau.ts) n'est qu'un adaptateur vers ce
 * contrat. Le preload (apps/desktop) doit s'y conformer à la lettre ; toute évolution
 * incrémente VERSION_CONTRAT.
 *
 * Règles pour l'implémentation Electron :
 *  - tout passe par `ipcRenderer.invoke` / `ipcMain.handle` sur les canaux CANAUX_IPC ;
 *  - aucune API Node ni objet Electron n'est exposé tel quel (contextIsolation: true,
 *    nodeIntegration: false, sandbox: true) ;
 *  - les fonctions `sur…` renvoient une fonction de désabonnement.
 */

export const VERSION_CONTRAT = 1;

/** Fenêtres secondaires que la régie peut ouvrir. */
export type NomSortie = 'sortie' | 'musiciens';

/** Un écran branché sur l'ordinateur, vu du processus principal (screen.getAllDisplays()). */
export interface EcranBureau {
  /** `display.id` converti en chaîne : stable tant que l'écran reste branché au même port. */
  id: string;
  /** `display.label` si le système le donne, sinon « Écran 2 ». */
  libelle: string;
  largeur: number;
  hauteur: number;
  /** Position dans le bureau virtuel. */
  x: number;
  y: number;
  facteurEchelle: number;
  principal: boolean;
  /** Écran intégré d'un portable. */
  interne: boolean;
}

export interface OptionsOuvertureBureau {
  nom: NomSortie;
  /**
   * Route de la web app, avec sa barre finale (export statique, trailingSlash) et sa query
   * éventuelle : « /sortie/ », « /musiciens/?mode=plein ». Le processus principal la
   * résout lui-même vers son protocole (app://…) : la web app ne connaît pas l'origine.
   */
  route: string;
  /** Écran cible ; absent = l'écran retenu, sinon le premier écran non principal. */
  ecranId?: string | null;
  /** Plein écran sans cadre sur l'écran cible (vrai par défaut pour « sortie »). */
  pleinEcran?: boolean;
}

/** Ce que le preload expose sous `window.cmfi`. */
export interface ApiBureau {
  versionContrat: number;
  /** Version de l'app de bureau (app.getVersion()). */
  versionApp: string;
  systeme: 'darwin' | 'win32' | 'linux';

  ecrans: {
    lister(): Promise<EcranBureau[]>;
    /** Écran branché, débranché, ou résolution changée. */
    surChangement(rappel: (ecrans: EcranBureau[]) => void): () => void;
  };

  sorties: {
    /** Ouvre la fenêtre (ou la déplace et la recharge si elle existe déjà). */
    ouvrir(options: OptionsOuvertureBureau): Promise<void>;
    fermer(nom: NomSortie): Promise<void>;
    estOuverte(nom: NomSortie): Promise<boolean>;
    /** La fenêtre a été fermée (par l'utilisateur ou parce que son écran a disparu). */
    surFermeture(rappel: (nom: NomSortie) => void): () => void;
  };

  veille: {
    /** powerSaveBlocker.start('prevent-display-sleep') ; renvoie l'identifiant du verrou. */
    empecher(): Promise<number>;
    autoriser(identifiant: number): Promise<void>;
  };

  /** Petites préférences propres au bureau (écran de sortie retenu…), dans userData. */
  preferences: {
    lire(cle: string): Promise<unknown>;
    ecrire(cle: string, valeur: unknown): Promise<void>;
  };

  liens: {
    /** shell.openExternal, limité à https: et mailto: côté processus principal. */
    ouvrirExterne(url: string): Promise<void>;
  };
}

/** Canaux IPC : mêmes chaînes dans le preload et dans le processus principal. */
export const CANAUX_IPC = {
  ecransLister: 'cmfi:ecrans:lister',
  ecransChangement: 'cmfi:ecrans:changement',
  sortiesOuvrir: 'cmfi:sorties:ouvrir',
  sortiesFermer: 'cmfi:sorties:fermer',
  sortiesEstOuverte: 'cmfi:sorties:est-ouverte',
  sortiesFermeture: 'cmfi:sorties:fermeture',
  veilleEmpecher: 'cmfi:veille:empecher',
  veilleAutoriser: 'cmfi:veille:autoriser',
  preferencesLire: 'cmfi:preferences:lire',
  preferencesEcrire: 'cmfi:preferences:ecrire',
  liensOuvrirExterne: 'cmfi:liens:ouvrir-externe',
} as const;

export type CanalIpc = (typeof CANAUX_IPC)[keyof typeof CANAUX_IPC];

declare global {
  interface Window {
    /** Présent uniquement dans l'app de bureau. Ne pas lire directement : voir obtenirPlateforme(). */
    cmfi?: ApiBureau;
  }
}
