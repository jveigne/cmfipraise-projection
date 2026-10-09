#!/usr/bin/env node
/**
 * Lance electron-builder avec electron-builder.yml, signature et notarisation COUPÉES sauf
 * demande explicite. Sans ce garde-fou, electron-builder signe avec le premier certificat
 * trouvé dans le trousseau : un build de poste de dev se retrouverait signé par hasard.
 *
 *   node scripts/paquet.mjs --dir          dossier non empaqueté (release/<plateforme>-unpacked)
 *   node scripts/paquet.mjs                installeurs de la plateforme courante
 *   node scripts/paquet.mjs --mac --win    installeurs choisis
 *
 * CMFI_SIGNER=1   signe (macOS : CSC_LINK/CSC_KEY_PASSWORD ou trousseau ; Windows : CSC_LINK…)
 *                 et notarise sur macOS (APPLE_API_KEY, APPLE_API_KEY_ID, APPLE_API_ISSUER).
 * CMFI_PUBLIER=1  publie sur GitHub Releases (GH_TOKEN), en brouillon. Exige CMFI_SIGNER=1.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racineBureau = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const signer = process.env.CMFI_SIGNER === '1';
const publier = process.env.CMFI_PUBLIER === '1';

if (publier && !signer) {
  console.error('[paquet] publication refusée sans signature : une mise à jour non signée ne s’installe pas (CMFI_SIGNER=1).');
  process.exit(1);
}

const env = { ...process.env };
const args = ['--config', 'electron-builder.yml', ...process.argv.slice(2)];

if (!signer) {
  env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
  // Les variables de notarisation éventuellement présentes ne doivent pas déclencher l'étape.
  for (const cle of ['APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID', 'APPLE_API_KEY', 'APPLE_API_KEY_ID', 'APPLE_API_ISSUER', 'APPLE_KEYCHAIN', 'APPLE_KEYCHAIN_PROFILE']) {
    delete env[cle];
  }
  args.push('-c.mac.identity=null', '-c.mac.notarize=false');
} else {
  args.push('-c.mac.notarize=true');
}
args.push('--publish', publier ? 'always' : 'never');

// Le CLI résolu depuis node_modules : marche aussi hors `npm run` (PATH sans node_modules/.bin).
const cli = createRequire(import.meta.url).resolve('electron-builder/cli.js');
console.log(`[paquet] electron-builder ${args.join(' ')}`);
const enfant = spawn(process.execPath, [cli, ...args], { cwd: racineBureau, env, stdio: 'inherit' });
enfant.on('error', (erreur) => {
  console.error('[paquet]', erreur.message);
  process.exit(1);
});
enfant.on('exit', (code) => process.exit(code ?? 1));
