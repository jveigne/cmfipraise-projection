/**
 * Menus natifs, en français, réduits au minimum.
 *
 * Volontairement absents : « Recharger » et les outils de développement dans l'app installée.
 * Recharger la régie en plein culte ferait perdre la main sur la projection ; un bénévole
 * qui tape Cmd+R par réflexe ne doit rien casser.
 */
import { app, Menu, shell, type MenuItemConstructorOptions } from 'electron';

import { URL_DEV } from './config';
import { ouvrirRegie } from './fenetres';

const SITE_AIDE = 'https://github.com/jveigne/cmfipraise-projection';

export function installerMenu(): void {
  const mac = process.platform === 'darwin';
  const nom = app.getName();

  const modeles: MenuItemConstructorOptions[] = [];

  if (mac) {
    modeles.push({
      label: nom,
      submenu: [
        { role: 'about', label: `À propos de ${nom}` },
        { type: 'separator' },
        { role: 'hide', label: `Masquer ${nom}` },
        { role: 'hideOthers', label: 'Masquer les autres' },
        { role: 'unhide', label: 'Tout afficher' },
        { type: 'separator' },
        { role: 'quit', label: `Quitter ${nom}` },
      ],
    });
  } else {
    modeles.push({ label: 'Fichier', submenu: [{ role: 'quit', label: 'Quitter' }] });
  }

  // Sans ce menu, Copier / Coller ne marchent pas dans les champs sous macOS.
  modeles.push({
    label: 'Édition',
    submenu: [
      { role: 'undo', label: 'Annuler' },
      { role: 'redo', label: 'Rétablir' },
      { type: 'separator' },
      { role: 'cut', label: 'Couper' },
      { role: 'copy', label: 'Copier' },
      { role: 'paste', label: 'Coller' },
      { role: 'selectAll', label: 'Tout sélectionner' },
    ],
  });

  const affichage: MenuItemConstructorOptions[] = [
    { role: 'resetZoom', label: 'Taille réelle' },
    { role: 'zoomIn', label: 'Zoom avant' },
    { role: 'zoomOut', label: 'Zoom arrière' },
    { type: 'separator' },
    { role: 'togglefullscreen', label: 'Plein écran' },
  ];
  if (URL_DEV || !app.isPackaged) {
    affichage.push({ type: 'separator' }, { role: 'reload', label: 'Recharger' }, { role: 'toggleDevTools', label: 'Outils de développement' });
  }
  modeles.push({ label: 'Affichage', submenu: affichage });

  modeles.push({
    label: 'Fenêtre',
    submenu: [
      { label: 'Régie', accelerator: 'CmdOrCtrl+1', click: () => ouvrirRegie() },
      { type: 'separator' },
      { role: 'minimize', label: mac ? 'Placer dans le Dock' : 'Réduire' },
      { role: 'close', label: 'Fermer la fenêtre' },
    ],
  });

  modeles.push({
    role: 'help',
    label: 'Aide',
    submenu: [{ label: 'Aide en ligne', click: () => void shell.openExternal(SITE_AIDE) }],
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate(modeles));
}
