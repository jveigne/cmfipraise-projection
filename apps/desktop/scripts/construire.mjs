#!/usr/bin/env node
/**
 * Prépare apps/desktop/dist pour Electron :
 *   1. compile src/main.ts et src/preload.ts (esbuild, un fichier chacun) ;
 *   2. copie l'export statique de la web app (apps/web/out → dist/web) ;
 *   3. produit l'instantané des données embarquées (dist/donnees, voir instantane.ts).
 *
 * Options : --sans-web (étape 2 sautée), --sans-donnees. dev.mjs importe `surveiller()` pour
 * recompiler l'étape 1 en continu.
 *
 * Variables lues au build :
 *   NEXT_PUBLIC_API_RACINE  backend (le même que celui compilé dans la web app) ;
 *   CMFI_MISES_A_JOUR=1     active electron-updater (build signé seulement) ;
 *   CMFI_INSTANTANE=api     instantané tiré de l'API au lieu de l'échantillon.
 */
import { cp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import * as esbuild from 'esbuild';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racineBureau = path.resolve(ici, '..');
const dist = path.join(racineBureau, 'dist');
const exportWeb = path.resolve(racineBureau, '../web/out');

const API_PAR_DEFAUT = 'https://cmfipraise-prod-production.up.railway.app';

async function existe(chemin) {
  try {
    await stat(chemin);
    return true;
  } catch {
    return false;
  }
}

async function optionsEsbuild() {
  const paquet = JSON.parse(await readFile(path.join(racineBureau, 'package.json'), 'utf8'));
  const definitions = {
    __API_RACINE__: JSON.stringify((process.env.NEXT_PUBLIC_API_RACINE || API_PAR_DEFAUT).replace(/\/+$/, '')),
    __MISES_A_JOUR__: JSON.stringify(process.env.CMFI_MISES_A_JOUR === '1'),
    __VERSION_APP__: JSON.stringify(paquet.version),
  };
  const commun = {
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    sourcemap: 'linked',
    // Electron est fourni par le runtime ; electron-updater est facultatif (misesAJour.ts).
    external: ['electron', 'electron-updater'],
    define: definitions,
    logLevel: 'info',
    tsconfig: path.join(racineBureau, 'tsconfig.json'),
  };
  return [
    { ...commun, entryPoints: [path.join(racineBureau, 'src/main.ts')], outfile: path.join(dist, 'main.js') },
    // Preload sandboxé : seul require('electron') est permis, tout le reste est incorporé.
    { ...commun, entryPoints: [path.join(racineBureau, 'src/preload.ts')], outfile: path.join(dist, 'preload.js'), sourcemap: false },
  ];
}

export async function compiler() {
  await mkdir(dist, { recursive: true });
  await Promise.all((await optionsEsbuild()).map((o) => esbuild.build(o)));
}

export async function surveiller(surReconstruction) {
  await mkdir(dist, { recursive: true });
  const relance = {
    name: 'relance',
    setup(constructeur) {
      constructeur.onEnd((resultat) => {
        if (resultat.errors.length === 0) surReconstruction?.();
      });
    },
  };
  const contextes = await Promise.all((await optionsEsbuild()).map((o) => esbuild.context({ ...o, plugins: [relance] })));
  await Promise.all(contextes.map((c) => c.watch()));
  return () => Promise.all(contextes.map((c) => c.dispose()));
}

export async function copierWeb() {
  if (!(await existe(path.join(exportWeb, 'index.html')))) {
    throw new Error(`Export web introuvable (${exportWeb}). Lancer d'abord « npm run build -w @cmfi/web ».`);
  }
  const cible = path.join(dist, 'web');
  await rm(cible, { recursive: true, force: true });
  await cp(exportWeb, cible, { recursive: true });
  console.log(`[construire] export web copié → ${path.relative(racineBureau, cible)}`);
}

/** L'instantané est écrit en TypeScript (il réutilise @cmfi/projection) : esbuild le compile puis on l'exécute. */
export async function produireDonnees() {
  const sortie = path.join(dist, 'outils', 'instantane.mjs');
  await esbuild.build({
    entryPoints: [path.join(ici, 'instantane.ts')],
    outfile: sortie,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    logLevel: 'warning',
    tsconfig: path.join(racineBureau, 'tsconfig.json'),
  });
  const { produireInstantane } = await import(pathToFileURL(sortie).href);
  await produireInstantane({
    dossier: path.join(dist, 'donnees'),
    source: process.env.CMFI_INSTANTANE === 'api' ? 'api' : 'echantillon',
    racineApi: process.env.NEXT_PUBLIC_API_RACINE || API_PAR_DEFAUT,
  });
}

const directement = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (directement) {
  const args = new Set(process.argv.slice(2));
  try {
    await compiler();
    if (!args.has('--sans-web')) await copierWeb();
    if (!args.has('--sans-donnees')) await produireDonnees();
  } catch (erreur) {
    console.error(`[construire] ${erreur instanceof Error ? erreur.message : erreur}`);
    process.exit(1);
  }
}
