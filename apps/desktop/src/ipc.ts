/**
 * Côté processus principal du contrat `window.cmfi` (packages/plateforme/src/contrat.ts).
 *
 * Tout argument venant d'une page est vérifié ici : le preload ne fait que transmettre, et
 * une page compromise ne doit pouvoir ni ouvrir une URL étrangère dans une fenêtre, ni écrire
 * n'importe quoi sur le disque, ni ouvrir un lien `file:`.
 */
import { ipcMain, type IpcMainInvokeEvent } from 'electron';

import { CANAUX_IPC, type NomSortie, type OptionsOuvertureBureau } from '@cmfi/plateforme/contrat';

import { listerEcrans } from './ecrans';
import { NOMS_SORTIES, fermerSortie, ouvrirSortie, sortieOuverte } from './fenetres';
import { cleValide, ecrirePreference, lirePreference, valeurSerialisable } from './preferences';
import { expediteurDeConfiance, ouvrirLienExterne } from './securite';
import { autoriser, empecher } from './veille';

type Traitement = (evenement: IpcMainInvokeEvent, ...args: unknown[]) => unknown;

function gerer(canal: string, traitement: Traitement): void {
  ipcMain.handle(canal, (evenement, ...args) => {
    if (!expediteurDeConfiance(evenement)) throw new Error('Expéditeur non autorisé');
    return traitement(evenement, ...args);
  });
}

function nomSortie(valeur: unknown): NomSortie {
  if (typeof valeur === 'string' && (NOMS_SORTIES as readonly string[]).includes(valeur)) return valeur as NomSortie;
  throw new Error('Sortie inconnue');
}

function optionsOuverture(valeur: unknown): OptionsOuvertureBureau {
  if (!valeur || typeof valeur !== 'object') throw new Error('Options manquantes');
  const o = valeur as Record<string, unknown>;
  if (typeof o.route !== 'string') throw new Error('Route manquante');
  if (o.ecranId !== undefined && o.ecranId !== null && typeof o.ecranId !== 'string') throw new Error('Écran invalide');
  if (o.pleinEcran !== undefined && typeof o.pleinEcran !== 'boolean') throw new Error('pleinEcran invalide');
  return {
    nom: nomSortie(o.nom),
    route: o.route,
    ecranId: (o.ecranId as string | null | undefined) ?? null,
    ...(o.pleinEcran !== undefined ? { pleinEcran: o.pleinEcran as boolean } : {}),
  };
}

export function enregistrerIpc(): void {
  gerer(CANAUX_IPC.ecransLister, () => listerEcrans());

  gerer(CANAUX_IPC.sortiesOuvrir, (_e, options) => ouvrirSortie(optionsOuverture(options)));
  gerer(CANAUX_IPC.sortiesFermer, (_e, nom) => fermerSortie(nomSortie(nom)));
  gerer(CANAUX_IPC.sortiesEstOuverte, (_e, nom) => sortieOuverte(nomSortie(nom)));

  gerer(CANAUX_IPC.veilleEmpecher, (e) => empecher(e.sender.id));
  gerer(CANAUX_IPC.veilleAutoriser, (e, id) => {
    if (typeof id === 'number' && Number.isInteger(id)) autoriser(e.sender.id, id);
  });

  gerer(CANAUX_IPC.preferencesLire, (_e, cle) => {
    if (!cleValide(cle)) throw new Error('Clé de préférence invalide');
    return lirePreference(cle);
  });
  gerer(CANAUX_IPC.preferencesEcrire, (_e, cle, valeur) => {
    if (!cleValide(cle)) throw new Error('Clé de préférence invalide');
    if (!valeurSerialisable(valeur)) throw new Error('Valeur de préférence invalide');
    return ecrirePreference(cle, valeur);
  });

  gerer(CANAUX_IPC.liensOuvrirExterne, (_e, url) => {
    if (typeof url !== 'string') throw new Error('Lien invalide');
    return ouvrirLienExterne(url);
  });
}
