/**
 * Les écrans de l'ordinateur, vus du contrat (EcranBureau), et le choix de l'écran d'une sortie.
 */
import { screen, type Display } from 'electron';

import type { EcranBureau, NomSortie } from '@cmfi/plateforme/contrat';

import { ecrirePreference, lirePreference } from './preferences';

export function versEcranBureau(d: Display, rang: number, principal: Display): EcranBureau {
  return {
    id: String(d.id),
    libelle: d.label?.trim() || `Écran ${rang + 1}`,
    largeur: d.size.width,
    hauteur: d.size.height,
    x: d.bounds.x,
    y: d.bounds.y,
    facteurEchelle: d.scaleFactor,
    principal: d.id === principal.id,
    interne: d.internal ?? false,
  };
}

/** Écrans dans un ordre stable : le principal d'abord, puis de gauche à droite. */
export function ecransTries(): Display[] {
  const principal = screen.getPrimaryDisplay();
  return screen
    .getAllDisplays()
    .slice()
    .sort((a, b) => (a.id === principal.id ? -1 : b.id === principal.id ? 1 : a.bounds.x - b.bounds.x || a.bounds.y - b.bounds.y));
}

export function listerEcrans(): EcranBureau[] {
  const principal = screen.getPrimaryDisplay();
  return ecransTries().map((d, i) => versEcranBureau(d, i, principal));
}

/**
 * Ce qu'on retient d'un écran. L'identifiant suffit sur macOS ; sous Windows il peut changer
 * quand on rebranche le projecteur : le libellé et la taille servent alors à le retrouver.
 */
interface EcranRetenu {
  id: string;
  libelle: string;
  largeur: number;
  hauteur: number;
}

const cleEcran = (nom: NomSortie) => `ecran.${nom}`;

export function retenirEcran(nom: NomSortie, d: Display): void {
  const e = listerEcrans().find((x) => x.id === String(d.id));
  if (!e) return;
  const retenu: EcranRetenu = { id: e.id, libelle: e.libelle, largeur: e.largeur, hauteur: e.hauteur };
  void ecrirePreference(cleEcran(nom), retenu).catch((err) => console.warn('[écrans] mémorisation impossible', err));
}

function ecranRetenu(nom: NomSortie): Display | null {
  const retenu = lirePreference(cleEcran(nom)) as EcranRetenu | undefined;
  if (!retenu || typeof retenu !== 'object') return null;
  const tous = screen.getAllDisplays();
  const parId = tous.find((d) => String(d.id) === retenu.id);
  if (parId) return parId;
  const vus = listerEcrans();
  const semblable = vus.find((e) => e.libelle === retenu.libelle && e.largeur === retenu.largeur && e.hauteur === retenu.hauteur);
  return semblable ? (tous.find((d) => String(d.id) === semblable.id) ?? null) : null;
}

export function ecranParId(id: string): Display | null {
  return screen.getAllDisplays().find((d) => String(d.id) === id) ?? null;
}

/**
 * Écran d'une sortie, selon le contrat : l'écran demandé, sinon l'écran retenu, sinon le
 * premier écran qui n'est pas celui de la régie. Null = un seul écran (on reste fenêtré).
 */
export function choisirEcran(nom: NomSortie, ecranId: string | null | undefined, ecranRegie: Display | null): Display | null {
  if (ecranId) {
    const demande = ecranParId(ecranId);
    if (demande) return demande;
  }
  const retenu = ecranRetenu(nom);
  if (retenu) return retenu;
  const principal = screen.getPrimaryDisplay();
  const exclu = ecranRegie ?? principal;
  return ecransTries().find((d) => d.id !== exclu.id) ?? null;
}
