/**
 * Petites préférences du bureau (écran de sortie retenu…), dans un fichier JSON de userData.
 *
 * Pourquoi pas IndexedDB : le processus principal doit les lire AVANT qu'une page existe
 * (choisir l'écran d'une sortie). Écriture atomique (fichier temporaire puis renommage) :
 * une coupure de courant pendant le culte ne laisse pas un fichier à moitié écrit.
 */
import { readFileSync } from 'node:fs';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { app } from 'electron';

const TAILLE_MAX = 256 * 1024;
const CLE_VALIDE = /^[A-Za-z0-9_.:-]{1,120}$/;

let valeurs: Record<string, unknown> | null = null;
let ecritureEnCours: Promise<void> = Promise.resolve();

function fichier(): string {
  return path.join(app.getPath('userData'), 'preferences.json');
}

function charger(): Record<string, unknown> {
  if (valeurs) return valeurs;
  try {
    const brut = JSON.parse(readFileSync(fichier(), 'utf8')) as unknown;
    valeurs = brut && typeof brut === 'object' && !Array.isArray(brut) ? (brut as Record<string, unknown>) : {};
  } catch {
    // Absent au premier lancement, ou illisible : on repart de zéro plutôt que de bloquer le culte.
    valeurs = {};
  }
  return valeurs;
}

export function cleValide(cle: unknown): cle is string {
  return typeof cle === 'string' && CLE_VALIDE.test(cle);
}

export function lirePreference(cle: string): unknown {
  return charger()[cle];
}

export function ecrirePreference(cle: string, valeur: unknown): Promise<void> {
  const prochaines = { ...charger() };
  if (valeur === undefined || valeur === null) delete prochaines[cle];
  else prochaines[cle] = valeur;

  const contenu = JSON.stringify(prochaines, null, 2);
  if (contenu.length > TAILLE_MAX) return Promise.reject(new Error('Préférences trop volumineuses'));
  valeurs = prochaines;

  // Écritures à la file : la dernière gagne, jamais deux renommages croisés.
  ecritureEnCours = ecritureEnCours
    .catch(() => undefined)
    .then(async () => {
      const cible = fichier();
      await mkdir(path.dirname(cible), { recursive: true });
      const temporaire = `${cible}.${process.pid}.tmp`;
      await writeFile(temporaire, contenu, 'utf8');
      await rename(temporaire, cible);
    });
  return ecritureEnCours;
}

/** Valeur sérialisable en JSON (structuredClone de l'IPC accepte plus large : on restreint). */
export function valeurSerialisable(valeur: unknown): boolean {
  try {
    return JSON.stringify(valeur ?? null).length <= TAILLE_MAX;
  } catch {
    return false;
  }
}
