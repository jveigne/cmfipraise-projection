# CMFIPraise Projection

Paroles des chants et textes bibliques projetés pendant le culte, pour les bénévoles. Gratuit.
Version web (rien à installer) et app de bureau (le culte, hors-ligne complet, choix de l'écran
de sortie) — une seule base de code.

## Démarrer

Prérequis : Node 20 (`nvm use`), npm 10.

```bash
npm install
npm run dev        # http://localhost:3000
```

| Commande | Effet |
|----------|-------|
| `npm run dev` | Web app en développement |
| `npm run build` | Export statique dans `apps/web/out/` |
| `npm run typecheck` | Vérification TypeScript de tout le dépôt |
| `npm run lint` | ESLint |
| `npm test` | Tests Vitest des paquets et de la web app |
| `npm run verifier` | Les quatre à la suite |
| `npm run dev:bureau` | App de bureau en dev : `next dev` + Electron |
| `npm run build:bureau` | Export web, compilation main/preload, paquet Electron non empaqueté (`--dir`) |
| `npm run distribuer -w @cmfi/desktop` | Installeurs de la plateforme courante (dmg / NSIS / AppImage) |

Détails du bureau : [docs/bureau.md](docs/bureau.md).

Pour voir l'export statique : `npx serve apps/web/out` (ou `python3 -m http.server -d apps/web/out`).
Les pages sont des dossiers (`/regie/`, `/sortie/`…) : n'importe quel serveur statique convient.

Variable facultative au build : `NEXT_PUBLIC_API_RACINE` (racine d'un autre backend que la production).

## État au 09/10/2026

Chaîne vérifiée sur macOS (x86_64), Node 20.20.2, npm 10.8.2 :

| Étape | Résultat |
|-------|----------|
| `npm install` | à jour, 702 paquets |
| `npm run typecheck` | vert, 6 espaces de travail |
| `npm run lint` | vert, aucun avertissement |
| `npm test` | vert : 37 fichiers, 236 tests (api 12, design 30, projection 83, web 111) ; `plateforme` n'a pas de test |
| `npm run build` | vert : 12 routes statiques, `apps/web/out` (2,2 Mo) |
| `npm run compiler -w @cmfi/desktop` | vert : `dist/main.js` 36 Ko, `dist/preload.js` 2 Ko, export et instantané copiés |
| `npm run build:bureau` | vert : `apps/desktop/release/mac/CMFIPraise Projection.app` (247 Mo, asar de 132 Ko sans `node_modules`, non signé) |
| Lancement de l'app empaquetée | démarre et reste ouverte 8 s sans erreur dans la console |
| Export servi en statique + `curl` | 200 sur `/`, `/regie/`, `/sortie/`, `/musiciens/`, `/chants/`, `/chants/lecture/?id=…`, `/setlists/`, `/reglages/`, `/soutien/`, `/suivre/`, `/telecommande/` ; les 21 ressources `_next/static` de la régie répondent |

### Ce qui marche

- **Accueil** (`/`), **Bibliothèque** et **lecture d'un chant** (`/chants/`, `/chants/lecture/?id=`),
  onglets langue / catégorie / favoris, vue Bible (échantillon).
- **Régie** (`/regie/`) : barre unique (chant, référence biblique, setlist), diapositives,
  en direct / suivante, écran noir, masquer le texte, logo, bilingue, parcours « prêt » et
  « fin du culte » ; setlist d'**exemple** pour découvrir sans compte.
- **Sortie** (`/sortie/`) et **écran des musiciens** (`/musiciens/`, accords) : reçoivent l'état
  de la régie par `BroadcastChannel`, y compris sur le bureau.
- **Setlists** (`/setlists/`) : locales en IndexedDB pour tous ; du serveur et partage pour un compte.
- **Personnalisation** (`/reglages/`), **Soutien** (`/soutien/`), états hors-ligne et réseau.
- **Télécommande** et **paroles en direct** (`/telecommande/`, `/suivre/`) et l'appairage :
  écrans faits, mais seulement par le transport **local** (onglets d'un même navigateur).
- **Bureau** : protocole `app://cmfi`, sortie plein écran sur le second écran, anti-veille,
  instantané de données embarqué, relais du backend par le processus principal (contourne CORS).
- FR / EN partout, FR par défaut.

### Restes (liste consolidée)

Bloquants pour un usage réel :

1. **CORS de production** — le backend sait autoriser la projection (`frontend.origin.projection`),
   mais la variable Railway `FRONTEND_ORIGIN_PROJECTION=https://www.cmfipraise.com,app://cmfi`
   reste à poser. D'ici là, la web app en production ne charge aucun recueil ; le bureau passe
   par `relaisApi.ts`. En local, voir `apps/web/.env.local` (`NEXT_PUBLIC_API_RACINE`). Voir
   docs/architecture.md §5.
2. **Bible** : seul un échantillon (Jean 3:16, Psaume 23, LSG et KJV) est inclus. L'import
   complet des deux versions du domaine public reste à faire (`BibleSource` sur le magasin
   `bibles`, `enregistrerChapitresBible` dans `packages/api/src/cache.ts`).
3. **Relais distant** : sans lui, la télécommande et les paroles ne marchent pas sur un vrai
   téléphone. Backend (WebSocket, salles éphémères) et option Wi-Fi local du bureau décrits
   dans [docs/relais-distant.md](docs/relais-distant.md).

Bureau, avant une première diffusion :

4. Signature et notarisation (certificats Apple Developer ID et Authenticode) ; sans elles,
   Gatekeeper et SmartScreen avertissent.
5. `electron-updater` à ajouter aux dépendances de `apps/desktop` (les mises à jour sont
   chargées à la demande et restent inactives sans lui).
6. Dépôt GitHub `jveigne/cmfipraise-projection` à créer (ou `publish` à corriger dans
   `electron-builder.yml`).
7. Installeurs Windows et Linux : à construire sur leur système (CI par système) ; seul le
   paquet macOS `--dir` (x64) a été produit ici. Le dmg universel n'a pas été construit.
8. L'instantané embarqué par défaut ne contient **aucun recueil** (`CMFI_INSTANTANE=api` au
   build pour embarquer les recueils officiels).

Outillage :

9. `npm audit` : 13 alertes (8 modérées, 5 hautes), **toutes dans les outils de dev**
   (`eslint-config-next` → `micromatch`/`braces`/`fast-glob` ; `electron-builder` →
   `global-agent`/`roarr`…). `npm audit --omit=dev` : 0. Les « correctifs » proposés sont des
   rétrogradations majeures (eslint-config-next 14, electron-builder 26.5) : ne pas appliquer.
10. **Node 20** est en fin de vie depuis avril 2026. Electron 44 et Vitest 5 demandent Node 22 :
    Electron s'installe malgré l'avertissement, Vitest est tenu en v4. Passer à Node 22 ou 24
    lèverait ces deux limites.
11. `packages/plateforme` n'a pas de tests (l'implémentation web dépend de `window.open`,
    `getScreenDetails`, `wakeLock`).
12. Ni vérification visuelle automatisée contre `design/*.dc.html`, ni test de bout en bout
    navigateur (régie → sortie dans deux vraies fenêtres).

## Organisation

- `apps/web` — Next.js (App Router, export statique), écrans et primitives d'interface.
- `apps/desktop` — Electron, embarque `apps/web/out`.
- `packages/design` — jetons du système visuel (TS + variables CSS).
- `packages/api` — client de l'API CMFIPraise, jetons visiteur/compte, DTO, cache IndexedDB.
- `packages/plateforme` — interface web/bureau et contrat du preload Electron.
- `packages/projection` — diapositives, état de projection, canal régie → sorties, Bible, accords.
- `design/` — maquettes de référence.

Conventions, règles de couleur et structure détaillée : [CLAUDE.md](CLAUDE.md).
Décisions d'architecture : [docs/architecture.md](docs/architecture.md).
