/**
 * Les fenêtres : la régie, et les sorties qu'elle ouvre (« sortie » pour le projecteur,
 * « musiciens » en troisième écran facultatif).
 *
 * Règles qui comptent un dimanche matin :
 *  - une sortie plein écran ne se pose JAMAIS sur l'écran de la régie : elle masquerait les
 *    commandes. Sans second écran, elle s'ouvre en fenêtre (répétition à la maison) ;
 *  - quand le projecteur se branche alors qu'une sortie attend en fenêtre, elle y part seule ;
 *  - quand l'écran d'une sortie disparaît, la fenêtre se ferme et la régie en est avertie ;
 *  - une sortie qui plante se recharge seule : elle redemande l'état à la régie (demande-etat).
 */
import path from 'node:path';

import { BrowserWindow, dialog, screen, type Display, type WebPreferences } from 'electron';

import { Couleurs } from '@cmfi/design';
import { CANAUX_IPC, type EcranBureau, type NomSortie, type OptionsOuvertureBureau } from '@cmfi/plateforme/contrat';

import { ORIGINE_FENETRES, origineDe, urlRoute } from './config';
import { choisirEcran, listerEcrans, retenirEcran } from './ecrans';
import { estUrlApp } from './securite';
import { libererContenu, suivreSorties } from './veille';

export const NOMS_SORTIES: readonly NomSortie[] = ['sortie', 'musiciens'];

const TITRES: Record<NomSortie, string> = {
  sortie: 'Sortie — CMFIPraise Projection',
  musiciens: 'Musiciens — CMFIPraise Projection',
};

function preferencesWeb(): WebPreferences {
  return {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    nodeIntegrationInSubFrames: false,
    webSecurity: true,
    allowRunningInsecureContent: false,
    webviewTag: false,
    spellcheck: false,
    // Une sortie n'a jamais le focus : sans ceci Chromium ralentit ses minuteries et ses
    // animations, et les fondus de diapositives saccadent.
    backgroundThrottling: false,
  };
}

let regie: BrowserWindow | null = null;
let fermetureConfirmee = false;

interface Sortie {
  fenetre: BrowserWindow;
  /** Écran occupé en plein écran, ou null si la sortie est en fenêtre. */
  ecranId: number | null;
  /** Ce que la régie a demandé : on y revient quand le projecteur apparaît. */
  pleinEcranDemande: boolean;
  sansCadre: boolean;
  route: string;
  /** Vrai pendant un remplacement : la régie ne doit pas croire la sortie fermée. */
  remplacee: boolean;
}

const sorties = new Map<NomSortie, Sortie>();

/** Envoie un évènement à toutes les pages de la web app. */
export function diffuser(canal: string, ...args: unknown[]): void {
  for (const f of BrowserWindow.getAllWindows()) {
    if (!f.isDestroyed() && estUrlApp(f.webContents.getURL())) f.webContents.send(canal, ...args);
  }
}

export function fenetreRegie(): BrowserWindow | null {
  return regie && !regie.isDestroyed() ? regie : null;
}

function ecranDeLaRegie(): Display | null {
  const r = fenetreRegie();
  return r ? screen.getDisplayMatching(r.getBounds()) : null;
}

// ─── Régie ───────────────────────────────────────────────────────────────────

/**
 * Fermer la régie (ou quitter) pendant une projection : on demande, une fois. Vrai = on peut
 * fermer. Rien de destructeur sans le vouloir, même par un Cmd+Q réflexe.
 */
export function confirmerFermeture(): boolean {
  if (fermetureConfirmee || sorties.size === 0) return true;
  const parent = fenetreRegie();
  const options = {
    type: 'question' as const,
    buttons: ['Continuer la projection', 'Fermer'],
    defaultId: 0,
    cancelId: 0,
    title: 'Projection en cours',
    message: 'Une sortie est encore ouverte.',
    detail: 'Fermer la régie ferme aussi la sortie projetée.',
  };
  const choix = parent ? dialog.showMessageBoxSync(parent, options) : dialog.showMessageBoxSync(options);
  if (choix === 0) return false;
  fermetureConfirmee = true;
  return true;
}

export function ouvrirRegie(): BrowserWindow {
  const existante = fenetreRegie();
  if (existante) {
    if (existante.isMinimized()) existante.restore();
    existante.focus();
    return existante;
  }

  fermetureConfirmee = false;
  const fenetre = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'CMFIPraise Projection',
    backgroundColor: Couleurs.page,
    show: false,
    webPreferences: preferencesWeb(),
  });
  regie = fenetre;
  const idContenu = fenetre.webContents.id;

  fenetre.once('ready-to-show', () => fenetre.show());
  // La web app fixe ses propres titres (en français) ; la barre native garde le nom de l'app.
  fenetre.on('page-title-updated', (e) => e.preventDefault());

  // Fermer la régie pendant une projection : on demande, une fois. Rien de destructeur sans le vouloir.
  fenetre.on('close', (evenement) => {
    if (!confirmerFermeture()) evenement.preventDefault();
  });

  fenetre.on('closed', () => {
    regie = null;
    libererContenu(idContenu);
    for (const nom of NOMS_SORTIES) fermerSortie(nom);
  });

  fenetre.webContents.on('render-process-gone', (_e, details) => {
    if (details.reason === 'clean-exit') return;
    console.error('[régie] processus perdu :', details.reason);
    libererContenu(idContenu);
    const choix = dialog.showMessageBoxSync(fenetre, {
      type: 'warning',
      buttons: ['Recharger la régie', 'Fermer'],
      defaultId: 0,
      cancelId: 0,
      title: 'La régie s’est arrêtée',
      message: 'La régie s’est arrêtée de façon inattendue.',
      detail: 'La sortie garde la dernière diapositive affichée. Rechargez pour reprendre la main.',
    });
    if (choix === 0) fenetre.webContents.reload();
    else fenetre.close();
  });

  void fenetre.loadURL(urlRoute('/regie/'));
  return fenetre;
}

// ─── Sorties ─────────────────────────────────────────────────────────────────

/** Route relative de la web app (« /sortie/?x=1 »), ou null si elle sort de l'app. */
export function routeValide(route: unknown): string | null {
  if (typeof route !== 'string' || route.length > 2048 || !route.startsWith('/') || route.startsWith('//')) return null;
  try {
    const url = new URL(route, ORIGINE_FENETRES);
    return origineDe(url) === ORIGINE_FENETRES ? `${url.pathname}${url.search}${url.hash}` : null;
  } catch {
    return null;
  }
}

/** Taille d'une sortie en fenêtre, centrée sur la zone utile de l'écran. */
function rectangleFenetre(ecran: Display, nom: NomSortie) {
  const zone = ecran.workArea;
  const largeur = Math.min(nom === 'sortie' ? 1280 : 1180, Math.round(zone.width * 0.8));
  const hauteur = Math.min(nom === 'sortie' ? 720 : 820, Math.round(zone.height * 0.8));
  return {
    x: Math.round(zone.x + (zone.width - largeur) / 2),
    y: Math.round(zone.y + (zone.height - hauteur) / 2),
    width: largeur,
    height: hauteur,
  };
}

function placer(sortie: Sortie, ecran: Display | null, pleinEcran: boolean, nom: NomSortie): void {
  const f = sortie.fenetre;
  if (pleinEcran && ecran) {
    if (f.isFullScreen()) f.setFullScreen(false);
    if (process.platform === 'darwin' && f.isSimpleFullScreen()) f.setSimpleFullScreen(false);
    f.setBounds(ecran.bounds);
    // macOS : le plein écran « simple » n'ouvre pas d'Espace séparé ni d'animation de
    // plusieurs secondes, et ne bascule pas la régie dans un autre bureau.
    if (process.platform === 'darwin') f.setSimpleFullScreen(true);
    else f.setFullScreen(true);
    sortie.ecranId = ecran.id;
  } else {
    if (process.platform === 'darwin' && f.isSimpleFullScreen()) f.setSimpleFullScreen(false);
    if (f.isFullScreen()) f.setFullScreen(false);
    f.setBounds(rectangleFenetre(ecran ?? ecranDeLaRegie() ?? screen.getPrimaryDisplay(), nom));
    sortie.ecranId = null;
  }
}

function montrer(sortie: Sortie): void {
  const f = sortie.fenetre;
  // Plein écran sur le projecteur : la régie garde le focus (les flèches du clavier restent à elle).
  if (sortie.ecranId !== null) f.showInactive();
  else f.show();
}

function creerSortie(nom: NomSortie, sansCadre: boolean): Sortie {
  const fenetre = new BrowserWindow({
    title: TITRES[nom],
    frame: !sansCadre,
    show: false,
    backgroundColor: Couleurs.nuit,
    autoHideMenuBar: true,
    fullscreenable: true,
    // Plein écran sans cadre : pas d'entrée de plus dans la barre des tâches à fermer par erreur.
    skipTaskbar: sansCadre,
    webPreferences: preferencesWeb(),
  });
  fenetre.setMenu(null);
  fenetre.on('page-title-updated', (e) => e.preventDefault());

  const sortie: Sortie = { fenetre, ecranId: null, pleinEcranDemande: false, sansCadre, route: '/', remplacee: false };
  const idContenu = fenetre.webContents.id;

  fenetre.on('closed', () => {
    libererContenu(idContenu);
    if (sorties.get(nom) === sortie) sorties.delete(nom);
    suivreSorties(sorties.size > 0);
    if (!sortie.remplacee) diffuser(CANAUX_IPC.sortiesFermeture, nom);
  });

  // Une sortie qui plante ne doit pas laisser un écran noir : on la recharge, elle redemande l'état.
  fenetre.webContents.on('render-process-gone', (_e, details) => {
    if (details.reason === 'clean-exit' || fenetre.isDestroyed()) return;
    console.error(`[${nom}] processus perdu :`, details.reason);
    libererContenu(idContenu);
    setTimeout(() => {
      if (!fenetre.isDestroyed()) void fenetre.loadURL(urlRoute(sortie.route));
    }, 500);
  });

  return sortie;
}

export async function ouvrirSortie(options: OptionsOuvertureBureau): Promise<void> {
  const nom = options.nom;
  if (!NOMS_SORTIES.includes(nom)) throw new Error(`Sortie inconnue : ${String(nom)}`);
  const route = routeValide(options.route);
  if (!route) throw new Error('Route de sortie invalide');

  const ecranRegie = ecranDeLaRegie();
  const ecran = choisirEcran(nom, options.ecranId, ecranRegie);
  if (options.ecranId && ecran && String(ecran.id) === options.ecranId) retenirEcran(nom, ecran);

  const pleinEcranDemande = options.pleinEcran ?? nom === 'sortie';
  const pleinEcran = pleinEcranDemande && ecran !== null && ecran.id !== ecranRegie?.id;

  let sortie = sorties.get(nom);
  // Le cadre d'une fenêtre ne se change pas après coup : on la remplace si besoin.
  if (sortie && sortie.sansCadre !== pleinEcran) {
    sortie.remplacee = true;
    sortie.fenetre.destroy();
    sortie = undefined;
  }
  if (!sortie) {
    sortie = creerSortie(nom, pleinEcran);
    sorties.set(nom, sortie);
    suivreSorties(true);
  }

  sortie.pleinEcranDemande = pleinEcranDemande;
  sortie.route = route;
  placer(sortie, ecran, pleinEcran, nom);
  await sortie.fenetre.loadURL(urlRoute(route));
  if (!sortie.fenetre.isDestroyed()) montrer(sortie);
}

export function fermerSortie(nom: NomSortie): void {
  const sortie = sorties.get(nom);
  if (sortie && !sortie.fenetre.isDestroyed()) sortie.fenetre.close();
}

export function sortieOuverte(nom: NomSortie): boolean {
  const sortie = sorties.get(nom);
  return !!sortie && !sortie.fenetre.isDestroyed();
}

export function fermerToutesLesFenetres(): void {
  fermetureConfirmee = true;
  for (const f of BrowserWindow.getAllWindows()) if (!f.isDestroyed()) f.close();
}

// ─── Écrans branchés, débranchés ─────────────────────────────────────────────

/**
 * Réaction aux changements d'écrans. Regroupée : brancher un projecteur déclenche souvent
 * plusieurs évènements (ajout, puis changement de résolution) en quelques millisecondes.
 */
function reagirAuxEcrans(): void {
  const presents = new Map(screen.getAllDisplays().map((d) => [d.id, d] as const));
  const ecranRegie = ecranDeLaRegie();

  for (const nom of NOMS_SORTIES) {
    const sortie = sorties.get(nom);
    if (!sortie || sortie.fenetre.isDestroyed()) continue;

    if (sortie.ecranId !== null) {
      const ecran = presents.get(sortie.ecranId);
      // Écran débranché : on ferme (contrat), la régie le signale et propose de rouvrir.
      if (!ecran) fermerSortie(nom);
      // Résolution changée : on recolle la fenêtre aux nouveaux bords.
      else if (ecran.id !== ecranRegie?.id) placer(sortie, ecran, true, nom);
      else fermerSortie(nom);
      continue;
    }

    // En fenêtre faute de projecteur : s'il vient d'apparaître, la sortie y part seule.
    if (sortie.pleinEcranDemande) {
      const ecran = choisirEcran(nom, null, ecranRegie);
      if (ecran && ecran.id !== ecranRegie?.id) {
        void ouvrirSortie({ nom, route: sortie.route, pleinEcran: true }).catch((err) => console.warn(`[${nom}] déplacement impossible`, err));
      }
    }
  }

  diffuser(CANAUX_IPC.ecransChangement, listerEcrans() satisfies EcranBureau[]);
}

export function suivreLesEcrans(): void {
  let minuterie: NodeJS.Timeout | null = null;
  const planifier = () => {
    if (minuterie) clearTimeout(minuterie);
    minuterie = setTimeout(() => {
      minuterie = null;
      try {
        reagirAuxEcrans();
      } catch (erreur) {
        // Un écran qui disparaît au mauvais moment ne doit jamais faire tomber l'app.
        console.error('[écrans]', erreur);
      }
    }, 300);
  };
  screen.on('display-added', planifier);
  screen.on('display-removed', planifier);
  screen.on('display-metrics-changed', planifier);
}
