#!/usr/bin/env node
/**
 * Dev du bureau : `next dev` + Electron, sans dépendance de plus (ni concurrently ni wait-on).
 *
 *  1. démarre `next dev` (apps/web) sauf s'il répond déjà sur le port ;
 *  2. compile main/preload en continu (esbuild) ;
 *  3. attend que /regie/ réponde, puis lance Electron sur http://localhost:<port> ;
 *  4. relance Electron quand main/preload changent ; la web app, elle, se recharge à chaud.
 *
 * Fermer Electron arrête tout. PORT change le port (3000 par défaut).
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { surveiller } from './construire.mjs';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racineBureau = path.resolve(ici, '..');
const racineDepot = path.resolve(racineBureau, '../..');
const port = Number(process.env.PORT || 3000);
const urlDev = `http://localhost:${port}`;
const require = createRequire(import.meta.url);
/** Le paquet « electron » exporte le chemin de son exécutable. */
const binaireElectron = require('electron');

async function repond(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return r.status < 500;
  } catch {
    return false;
  }
}

async function attendre(url, delaiMs) {
  const fin = Date.now() + delaiMs;
  while (Date.now() < fin) {
    if (await repond(url)) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${url} ne répond pas après ${Math.round(delaiMs / 1000)} s`);
}

let next = null;
if (await repond(urlDev)) {
  console.log(`[dev] next dev déjà lancé sur ${urlDev}`);
} else {
  console.log('[dev] démarrage de next dev…');
  next = spawn('npm', ['run', 'dev', '-w', '@cmfi/web', '--', '--port', String(port)], {
    cwd: racineDepot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

let electron = null;
let arretDemande = false;
let relanceEnCours = false;

function lancerElectron() {
  electron = spawn(binaireElectron, ['.'], {
    cwd: racineBureau,
    stdio: 'inherit',
    env: { ...process.env, CMFI_URL_DEV: urlDev, ELECTRON_ENABLE_LOGGING: '1' },
  });
  electron.on('exit', () => {
    electron = null;
    if (relanceEnCours) {
      relanceEnCours = false;
      lancerElectron();
    } else {
      arreter(0);
    }
  });
}

let premiere = true;
const fermerSurveillance = await surveiller(() => {
  if (premiere) return;
  console.log('[dev] main/preload recompilés : relance d’Electron');
  if (electron) {
    relanceEnCours = true;
    electron.kill();
  }
});

function arreter(code) {
  if (arretDemande) return;
  arretDemande = true;
  void fermerSurveillance();
  if (electron) electron.kill();
  if (next) next.kill();
  process.exit(code);
}
process.on('SIGINT', () => arreter(0));
process.on('SIGTERM', () => arreter(0));

try {
  // Première compilation de next dev : peut prendre une minute sur une machine froide.
  await attendre(`${urlDev}/regie/`, 180_000);
} catch (erreur) {
  console.error(`[dev] ${erreur.message}`);
  arreter(1);
}
premiere = false;
lancerElectron();
