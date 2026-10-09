# Architecture — décisions et raisons

Chaque décision est suivie de sa raison : c'est elle qu'il faut relire avant d'en changer.

## 1. Une web app, embarquée telle quelle par le bureau

**Décision.** L'application est une web app Next.js (`apps/web`) exportée en fichiers statiques
(`output: 'export'`). L'app de bureau Electron (`apps/desktop`) charge ces mêmes fichiers.

**Pourquoi.** Une seule base de code, une seule maquette à maintenir, un seul apprentissage pour
les bénévoles (`design/WebBureau.dc.html`). Le web sert à découvrir et à dépanner sans rien
installer ; le bureau sert au culte, parce qu'il possède les écrans et les fichiers de
l'ordinateur et n'a besoin de personne d'autre.

**Conséquences de l'export statique.**
- Pas de Server Actions, pas de routes API, pas de rendu serveur à la demande : il n'y a pas de
  serveur, ni sur l'hébergeur statique ni dans Electron.
- Pas de segment dynamique `[id]` : l'export devrait connaître tous les identifiants au build.
  Les paramètres passent en query string (`/chants/lecture/?id=…`) et se lisent côté client.
- `trailingSlash: true` : `/regie/` devient `regie/index.html`, servi tel quel par n'importe quel
  hébergeur et par le protocole `app://` d'Electron, sans règle de réécriture.
- `images.unoptimized` : l'optimiseur d'images de Next est un service serveur.
- Toutes les données se chargent dans le navigateur.

## 2. Monorepo npm workspaces

**Décision.** `apps/web`, `apps/desktop`, `packages/{design,api,plateforme,projection}`. Les paquets
exposent leur TypeScript source ; Next les compile (`transpilePackages`).

**Pourquoi.** Le modèle de projection, le client d'API et les jetons servent à la web app, à
Electron et aux tests : ils ne doivent dépendre ni de React ni de Next. Sans étape de build par
paquet, un changement est visible immédiatement partout. npm (et pas pnpm/yarn) pour rester
sur l'outil du mobile.

Dépendances entre paquets : `projection → api` (types des chants) ; `design`, `plateforme` et
`api` ne dépendent d'aucun autre paquet du dépôt.

## 3. La plateforme derrière une interface unique

**Décision.** `@cmfi/plateforme` définit `Plateforme` (`ouvrirSortie`, `fermerSortie`,
`listerEcrans`, `empecherVeille`, `estBureau`, préférences, liens externes). Deux implémentations :
- **web** : `window.open` ; Window Management API (`getScreenDetails`) quand le navigateur l'offre
  pour placer la sortie sur le projecteur ; `navigator.wakeLock` contre la veille ;
- **bureau** : simple adaptateur vers `window.cmfi`, que le preload Electron expose selon le
  contrat `packages/plateforme/src/contrat.ts` (types et noms de canaux IPC).

**Pourquoi.** La web app n'appelle jamais Electron : elle reste testable dans un navigateur, et
le bureau peut évoluer sans toucher aux écrans. Le contrat est versionné (`VERSION_CONTRAT`) ;
le preload s'y conforme à la lettre, avec `contextIsolation`, `sandbox` et sans `nodeIntegration`.

## 4. Régie → sorties par BroadcastChannel

**Décision.** La régie possède l'état de projection (`EtatProjection`, réducteur pur
`reduireProjection`) et le diffuse sur `BroadcastChannel('cmfi-projection')`. La sortie et
l'écran des musiciens l'affichent ; à leur ouverture ils envoient `demande-etat`.

**Pourquoi.** Aucun serveur, aucun réseau : si Internet tombe en plein culte, la projection
continue (`design/Etats.dc.html`). Le même code tourne sur le web (fenêtres d'un même navigateur,
même origine) et sur le bureau (fenêtres Electron d'une même session, même origine `app://`).
Les messages sont enveloppés et versionnés (`VERSION_PROTOCOLE`) : un message inconnu est ignoré,
jamais interprété à moitié. Les règles d'exclusion (projeter rétablit l'écran ; Masquer et Logo
s'excluent) vivent dans le réducteur, testées.

La télécommande par téléphone et les paroles sur les téléphones de l'assemblée sortent du
navigateur : elles demanderont un relais réseau (Internet sur le web ; Wi-Fi local possible sur
le bureau). Ce n'est pas le rôle de ce canal.

## 5. Données : l'API existante, visiteur d'abord

**Décision.** Même backend que le mobile (Railway, partagé avec Shephr). `ClientApi` (fetch) gère
deux jetons : le **jeton visiteur** (`GET /private/generate-token`), obtenu sans rien demander et
renouvelé une fois sur 401/403 ; le **JWT du compte** (`POST /auth/login`), exigé seulement pour
ce que l'utilisateur a créé ou partagé (setlists du serveur, chants personnels).

**Pourquoi.** Essayer en un clic d'abord : un visiteur lit et projette tout le contenu officiel.
Le client ne remplace jamais un échec par un tableau vide (l'appelant écraserait sa copie
hors-ligne) et distingue une panne réseau (`ErreurApi.reseau`) d'un refus.

**CORS.** Le backend (`cmfipraise-backend`, `conf/WebConfig.java`) autorise les origines de la
projection par la propriété `frontend.origin.projection` (liste séparée par des virgules), sur
`/api/**` et `/private/generate-token` seulement.

| Environnement | Valeur |
|---|---|
| Local (`application-local.properties`) | `http://localhost:3000,app://cmfi` |
| Production (variable Railway `FRONTEND_ORIGIN_PROJECTION`) | `https://www.cmfipraise.com,app://cmfi` — à poser |

Tant que la variable de production n'est pas posée, la production répond toujours 403 à la web
app. Le **bureau** fait passer ses requêtes par le processus principal
(`apps/desktop/src/relaisApi.ts`, voir docs/bureau.md) : une fois `app://cmfi` autorisé en
production, vérifier avec `CMFI_RELAIS_API=0`, puis supprimer le relais.

**Adresses publiques.** Web app de projection : `https://www.cmfipraise.com`. Back-office
(`cmfipraise-webapp`, origine `FRONTEND_ORIGIN` du backend) : `https://www.backoffice-cmfipraise.com`.
Les QR et liens partagés générés depuis l'app de bureau mènent au site public
(`apps/web/lib/urlPublique.ts`, remplaçable au build par `NEXT_PUBLIC_URL_PUBLIQUE`). Une origine
CORS est comparée à l'identique : `cmfipraise.com` sans `www` doit rediriger vers `www`.

## 6. Hors-ligne : IndexedDB

**Décision.** Le cache (`packages/api/src/cache.ts`, lib `idb`) tient recueils, chants, catégories,
setlists locales et du serveur, préférences, médias (fonds) et — plus tard — les Bibles
importées. Le schéma entier est déclaré à un seul endroit. Seuls les jetons vont en `localStorage`.

**Pourquoi.** Les recueils pèsent quelques Mo ; le mobile a appris qu'un stockage clé-valeur
plafonné finit par refuser d'écrire sans le dire (SQLITE_FULL sur Android). IndexedDB tient des
centaines de Mo et stocke des Blob. Une montée de version concurrente entre onglets bloque
l'ouverture : d'où un schéma unique, changé seulement dans `cache.ts`.

La synchronisation (`synchroniserRecueils`) reprend celle du mobile : comparer la version serveur
de chaque recueil, ne retélécharger que ce qui a changé, ne jamais effacer la copie locale sur échec.

## 7. Setlists locales, plus riches que celles du serveur

**Décision.** Le modèle `SetlistLocale` mêle chants et passages bibliques ; c'est lui que la régie
projette. Une setlist du serveur (chants seuls) s'y convertit (`depuisSetlistServeur`).

**Pourquoi.** Un culte, c'est des chants **et** des lectures. Le serveur ne connaît que les chants ;
les visiteurs n'ont pas de serveur du tout.

## 8. Bible : domaine public, et rien d'inventé

**Décision.** Versions du domaine public seulement (Louis Segond 1910, King James). Une interface
`BibleSource` ; pour l'instant une **source d'échantillon** (Jean 3:16, Psaume 23), marquée
`echantillon: true`, que l'interface doit signaler. Le parseur de références (`analyserReference`)
reconnaît les noms et abréviations français et anglais.

**Pourquoi.** Une version sous droits ne peut pas être projetée sans licence : l'app ne doit
jamais mettre une église dans cette situation. Un verset écrit de mémoire est un verset faux.
Le parseur préfère ne rien reconnaître que reconnaître le mauvais livre (« Jo » est refusé :
Job, Jonas, Josué, Joël…). L'import complet implémentera `BibleSource` sur le magasin `bibles`.

## 9. Diapositives : l'ordre d'enchaînement du backend

**Décision.** Un chant devient une diapositive par partie, dans l'ordre de `parts` (un refrain
chanté trois fois donne trois diapositives, de même `partId`) ; repli sur l'ancien format comme
le mobile. Une partie de plus de six lignes est coupée en morceaux équilibrés. Le bilingue
apparie les parties par rang.

**Pourquoi.** L'arrangement est la source de vérité du recueil. À 72 px sur 1080, au-delà de
six lignes le texte sort de l'écran.

## 10. Système visuel et i18n

**Décision.** Jetons en TS et en variables CSS (`@cmfi/design`), vérifiés l'un contre l'autre par
un test ; CSS modules ; polices par `next/font/google` ; i18n maison, un dictionnaire par module,
FR par défaut, clés vérifiées par le compilateur.

**Pourquoi.** Chaque couleur garde un seul emploi (or = en direct, nuit = projection, alerte =
suppression définitive) : une valeur codée en dur échappe aux relectures et dérive. `next/font`
auto-héberge les polices au build : la projection hors-ligne garde sa typographie. Une
bibliothèque d'i18n serait surdimensionnée pour deux langues et un export statique ; le rendu
statique est en français, la langue mémorisée s'applique après l'hydratation.

## Versions retenues (octobre 2026)

Next 16.4, React 19.3, TypeScript 5.9 (TypeScript 7 n'est pas encore pris en charge par
typescript-eslint), ESLint 9 (les plugins de `eslint-config-next` ne déclarent pas encore ESLint 10),
Vitest 4 (Vitest 5 exige Node 22), Electron 44, electron-builder 26, esbuild 0.28, idb 8.
Node 20 est fixé par `.nvmrc`. Voir la fin du README pour ce que cela implique.

## État de la chaîne (09/10/2026)

Vérifié sur macOS x86_64, Node 20.20.2 : `typecheck`, `lint`, `test` (236 tests), `next build`
(12 routes, `out/regie/index.html`, `out/sortie/index.html`…), compilation main/preload et
`electron-builder --dir` sont verts ; l'export servi en statique répond 200 sur chaque route et
l'app empaquetée démarre. Le détail des résultats et la liste consolidée des restes sont dans
le README (« État au 09/10/2026 »). Les restes qui touchent à l'architecture :

- **CORS** (§5) : à lever dans `WebConfig.java` ; puis couper le relais du bureau, vérifier,
  supprimer `relaisApi.ts`.
- **Bible complète** (§8) : implémenter `BibleSource` sur le magasin `bibles` ; l'instantané du
  bureau prendra les mêmes fichiers.
- **Relais distant** (§4) : une implémentation de `TransportDistant` de plus, choisie dans
  `obtenirTransportDistant()` ; aucun écran ne change (docs/relais-distant.md).
- **Node 22** : lèverait la limite Vitest 4 et l'avertissement d'Electron 44.
