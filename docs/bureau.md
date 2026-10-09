# App de bureau (apps/desktop)

L'app de bureau est une coquille Electron autour de la web app exportée (`apps/web/out`). Elle
n'a aucun écran à elle : elle sert les fichiers, ouvre la régie et ses sorties sur les bons
écrans, empêche la veille et répond au contrat `window.cmfi`
(`packages/plateforme/src/contrat.ts`). Ce qui la distingue du web pour l'utilisateur est
décrit dans `design/WebBureau.dc.html`.

## Organisation

```
apps/desktop/
├── src/
│   ├── main.ts          # Démarrage : instance unique, ordre d'initialisation
│   ├── config.ts        # Mode dev / export, origines, dossiers, constantes injectées au build
│   ├── protocole.ts     # app://cmfi → export web (trailingSlash, 404, /_donnees/)
│   ├── relaisApi.ts     # Relais du backend par le processus principal (CORS, voir plus bas)
│   ├── securite.ts      # CSP, navigation, window.open, permissions, liens externes
│   ├── fenetres.ts      # Régie, sortie, musiciens ; réaction aux écrans branchés/débranchés
│   ├── ecrans.ts        # screen.getAllDisplays() → EcranBureau ; écran retenu
│   ├── ipc.ts           # Côté principal du contrat (canaux CANAUX_IPC), arguments vérifiés
│   ├── preload.ts       # window.cmfi, conforme au contrat, rien d'autre
│   ├── veille.ts        # powerSaveBlocker 'prevent-display-sleep'
│   ├── preferences.ts   # userData/preferences.json (écriture atomique)
│   ├── menu.ts          # Menus natifs français
│   └── misesAJour.ts    # electron-updater, inactif tant que non signé
├── scripts/
│   ├── dev.mjs          # next dev + Electron, relance d'Electron quand main/preload changent
│   ├── construire.mjs   # esbuild main/preload → dist/, copie out/ → dist/web, instantané
│   ├── instantane.ts    # Données embarquées → dist/donnees (recueils, Bibles)
│   └── paquet.mjs       # electron-builder, signature coupée sauf CMFI_SIGNER=1
├── build/icon.png       # Icône (celle du mobile, agrandie à 1024 px)
└── electron-builder.yml
```

## Lancer en dev

```bash
npm run dev:bureau          # depuis la racine (= npm run dev -w @cmfi/desktop)
```

`scripts/dev.mjs` démarre `next dev` (ou réutilise celui qui tourne déjà sur le port 3000),
compile `main`/`preload` en continu et ouvre Electron sur `http://localhost:3000/regie/`. La web
app se recharge à chaud ; une modification de `src/*.ts` relance Electron. Fermer la fenêtre
arrête tout. `PORT=3001 npm run dev:bureau` change de port.

En dev, Affichage propose « Recharger » et les outils de développement (absents de l'app
installée : recharger la régie en plein culte ferait perdre la main sur la projection).

Pour voir l'app exactement comme installée (protocole `app://cmfi`, données embarquées,
premier lancement) sans empaqueter :

```bash
npm run build -w @cmfi/web               # export statique (une fois)
npm run dev:export -w @cmfi/desktop      # construire.mjs puis electron .
```

## Construire

```bash
npm run build -w @cmfi/desktop     # export web → copie → compilation → electron-builder --dir
npm run paquet -w @cmfi/desktop    # idem sans reconstruire la web app
npm run distribuer -w @cmfi/desktop  # installeurs de la plateforme courante (dmg / NSIS / AppImage)
```

Étapes de `construire.mjs` :

1. `src/main.ts` et `src/preload.ts` → `dist/main.js`, `dist/preload.js` (esbuild, CommonJS, tout
   incorporé ; seul `electron` reste externe, ce qu'exige le preload sandboxé) ;
2. `apps/web/out` → `dist/web` (erreur claire si l'export manque) ;
3. instantané des données → `dist/donnees`.

electron-builder place `dist/web` et `dist/donnees` dans les ressources de l'app (hors asar),
l'asar ne contient que `dist/*.js` et `package.json` : aucun `node_modules` n'est embarqué.
Sortie dans `apps/desktop/release/` (ignoré par git).

Variables lues au build :

| Variable | Effet |
|----------|-------|
| `NEXT_PUBLIC_API_RACINE` | Backend. À donner aussi au build web : CSP et relais doivent viser le même. |
| `CMFI_INSTANTANE=api` | Recueils et catégories tirés du backend dans l'instantané (sinon : échantillon). |
| `CMFI_MISES_A_JOUR=1` | Active electron-updater dans le build (signé seulement). |
| `CMFI_SIGNER=1` | Signature (et notarisation macOS). |
| `CMFI_PUBLIER=1` | Publication GitHub Releases (exige `CMFI_SIGNER=1`). |

Cibles : macOS **dmg universel** (x64 + arm64), Windows **NSIS** (x64, arm64, installeur en
français, dossier au choix, sans droits administrateur), Linux **AppImage** (x64, arm64).
Construire les installeurs Windows depuis un Mac demande Wine ; le plus simple est une CI par
système (GitHub Actions : `macos-latest`, `windows-latest`, `ubuntu-latest`).

## Données embarquées

`scripts/instantane.ts` écrit dans `dist/donnees` :

```
manifeste.json        { format: 1, identifiant, genereLe, source, api, recueils[], categories[], bibles[] }
recueils/<langue>-<titre>.json   { langue, titre, version, chants }   (= RecueilEnCache sans enregistreLe)
categories/<langue>.json         CategorieDTO[]
bibles/<LSG|KJV>.json            { format: 'versets', version: VersionBible, versets: VersetBiblique[] }
```

Le protocole les sert sous `app://cmfi/_donnees/…`. Par défaut (`echantillon`), aucun recueil
et les Bibles de l'échantillon de `@cmfi/projection` (Jean 3:16 et Psaume 23, LSG et KJV) : le
build ne touche pas le réseau. `CMFI_INSTANTANE=api` tire les recueils officiels et les
catégories du backend au moment du build, par le même `ClientApi` que la web app ; un échec
arrête le build. Les Bibles complètes prendront la place de l'échantillon dans
`biblesEmbarquees()` quand l'import existera, au même format.

La web app les recopie dans IndexedDB au premier lancement (`apps/web/lib/bureau/instantane.ts`,
appelé par `app/fournisseurs.tsx`) : une fois par identifiant d'instantané (préférence
`bureau_instantane`), sans jamais écraser un recueil local plus récent. Les Bibles d'échantillon
sont ignorées (déjà dans le code) ; une Bible complète demandera `enregistrerChapitresBible`
dans `packages/api/src/cache.ts`.

## Fenêtres et écrans

- **Régie** : fenêtre normale, barre de titre native. Fermer la régie (ou quitter) pendant
  qu'une sortie est ouverte demande confirmation.
- **Sortie** : plein écran sans cadre sur l'écran choisi, sinon l'écran retenu, sinon le
  premier écran qui n'est pas celui de la régie. Elle ne se pose **jamais** en plein écran sur
  l'écran de la régie : sans second écran, elle s'ouvre en fenêtre 1280 × 720. Si le projecteur
  se branche ensuite, elle y part seule. S'il se débranche, elle se ferme et la régie est
  prévenue (`surFermeture`). Une sortie dont le processus plante se recharge et redemande
  l'état. macOS : plein écran « simple » (pas d'Espace séparé, pas d'animation).
- **Musiciens** : même mécanisme, nom `musiciens`, en fenêtre par défaut.
- L'écran choisi explicitement (`ecranId`) est retenu dans `userData/preferences.json`, avec son
  libellé et sa taille pour le retrouver si Windows lui donne un autre identifiant.
- Anti-veille : verrou tenu tant qu'une sortie est ouverte, en plus de ceux que la web app demande.

## Sécurité

- `contextIsolation`, `sandbox`, pas de `nodeIntegration`, pas de `webview`. Le preload n'expose
  que `window.cmfi` ; chaque appel IPC vérifie que l'expéditeur est le cadre principal d'une
  page de l'app, puis ses arguments (route relative, nom de sortie, clé de préférence, lien
  `https:`/`mailto:` seulement).
- Navigation et `window.open` hors de l'origine de l'app : refusés, le lien part dans le
  navigateur du système.
- CSP sur chaque page HTML servie. `script-src 'unsafe-inline'` est imposé par l'export Next
  (données RSC en scripts en ligne, sans nonce possible sans serveur). `connect-src` : l'app et
  le backend.
- Permissions : plein écran et écriture du presse-papiers ; tout le reste est refusé.
- Fusibles Electron : pas de `RunAsNode`, pas de `NODE_OPTIONS` ni `--inspect`, app chargée
  depuis l'asar seulement.

### CORS et relais du backend

Le backend refuse aujourd'hui l'origine `app://cmfi` (403 « Invalid CORS request »). Pour que le
bureau marche sans attendre, `relaisApi.ts` intercepte les requêtes vers l'origine du backend,
les rejoue depuis le processus principal sans en-tête `Origin` et ajoute à la réponse les
en-têtes CORS de l'app ; le pré-vol `OPTIONS` est répondu localement. Les jetons Bearer sont
transmis tels quels : le contrôle d'accès du backend ne change pas. Vérifié le 09/10/2026 :
jeton visiteur, `GET /songbook-versions` et `POST /auth/login` passent avec le relais, échouent
sans (`CMFI_RELAIS_API=0`). Le relais marche aussi en dev (`next dev`). Quand le backend
autorisera `app://cmfi`, le couper et vérifier, puis supprimer le fichier.

## Signer

Par défaut, `paquet.mjs` **coupe** la signature (`mac.identity=null`,
`CSC_IDENTITY_AUTO_DISCOVERY=false`) et la notarisation, même si un certificat traîne dans le
trousseau. Avec `CMFI_SIGNER=1` :

- **macOS** : certificat « Developer ID Application » (`CSC_LINK` = .p12 en base64 ou chemin,
  `CSC_KEY_PASSWORD`), puis notarisation par clé d'API App Store Connect (`APPLE_API_KEY` =
  chemin du .p8, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`). Runtime renforcé activé ;
  electron-builder ajoute les droits nécessaires à Electron.
- **Windows** : certificat Authenticode (`CSC_LINK`, `CSC_KEY_PASSWORD`), ou signature Azure
  Trusted Signing (`win.azureSignOptions`, à ajouter). Sans signature, SmartScreen avertit
  à l'installation.
- **Linux** : AppImage non signée (usage courant).

```bash
CMFI_SIGNER=1 CSC_LINK=… CSC_KEY_PASSWORD=… \
APPLE_API_KEY=… APPLE_API_KEY_ID=… APPLE_API_ISSUER=… \
npm run distribuer -w @cmfi/desktop
```

## Publier

Les installeurs et les fichiers `latest*.yml` d'electron-updater vont dans une **GitHub
Release en brouillon** du dépôt `jveigne/cmfipraise-projection` (`publish` dans
`electron-builder.yml`), à relire puis publier à la main.

```bash
CMFI_SIGNER=1 CMFI_PUBLIER=1 CMFI_MISES_A_JOUR=1 GH_TOKEN=… \
CMFI_INSTANTANE=api npm run distribuer -w @cmfi/desktop
```

`paquet.mjs` refuse `CMFI_PUBLIER=1` sans `CMFI_SIGNER=1`. Mises à jour automatiques : actives
seulement si le build a été fait avec `CMFI_MISES_A_JOUR=1` **et** si `electron-updater` est
installé (pas encore une dépendance). Elles téléchargent en silence et s'installent à la
fermeture de l'app, jamais pendant le culte ; vérification 30 s après le démarrage.

## À faire

- Ajouter `electron-updater` aux `dependencies` de `apps/desktop` (et retirer de `files`
  l'exclusion devenue inutile si besoin) avant le premier build signé.
- Signer (certificats Developer ID et Authenticode) avant toute diffusion.
- Construire les installeurs Windows et Linux sur leur système (CI) ; seul le paquet macOS
  `--dir` x64 a été produit et lancé le 09/10/2026.
- Créer le dépôt GitHub `jveigne/cmfipraise-projection` ou corriger `publish.owner`/`repo`.
