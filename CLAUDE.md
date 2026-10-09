# CMFIPraise Projection — documentation du projet

## Vue d'ensemble

Outil de projection pour le culte (paroles des chants + Bible), dans l'esprit de ProPresenter
mais pensé pour des **bénévoles** : une régie lisible d'un coup d'œil, des gestes peu nombreux,
rien de destructeur pendant le culte. Gratuit, comme l'app mobile CMFIPraise dont il reprend
le backend, le système visuel et les recueils.

- **Web** (`apps/web`) : Next.js App Router, **export statique** — découvrir, dépanner, rien à installer.
- **Bureau** (`apps/desktop`) : Electron, qui **embarque l'export statique** de la web app — le culte,
  hors-ligne complet, choix de l'écran de sortie.
- **Une seule base de code** : mêmes écrans, trois différences visibles seulement (barre de titre,
  choix de l'écran de sortie, étendue du hors-ligne — voir `design/WebBureau.dc.html`).

Maquettes de référence : `design/*.dc.html` (titres des écrans dans `design/canvas.json`).
Décisions d'architecture et leurs raisons : [docs/architecture.md](docs/architecture.md).

## Structure

```
cmfipraise-projection/
├── apps/
│   ├── web/                    # Next.js (export statique → out/)
│   │   ├── app/                # Routes (une par dossier, page.tsx)
│   │   │   ├── layout.tsx      # Polices, jetons, fournisseurs (langue, session)
│   │   │   ├── page.tsx        # /            accueil
│   │   │   ├── chants/         # /chants/     bibliothèque ; lecture/ (?id=)
│   │   │   ├── setlists/       # /setlists/   éditeur de setlist et partage
│   │   │   ├── soutien/        # /soutien/    don
│   │   │   ├── regie/          # /regie/      régie de projection
│   │   │   ├── sortie/         # /sortie/     sortie projetée (fenêtre / écran 2)
│   │   │   ├── musiciens/      # /musiciens/  écran des musiciens
│   │   │   ├── suivre/         # /suivre/     paroles en direct pour l'assemblée
│   │   │   ├── telecommande/   # /telecommande/
│   │   │   └── reglages/       # /reglages/   personnalisation
│   │   ├── components/ui/      # Primitives partagées (Bouton, Carte, Champ, Icone, Dialogue, CodeQr…)
│   │   ├── components/etats/   # États partagés (design 09) : IndicateurReseau, EtatRienAProjeter…
│   │   ├── components/compte/  # DialogueConnexion (accueil, bibliothèque, setlists)
│   │   ├── components/<module>/# Composants propres à un écran
│   │   └── lib/                # api.ts, plateforme.ts, session/, i18n/,
│   │                           # reseau/ (état du réseau, liaison téléphones), bureau/ (instantané)
│   └── desktop/                # Electron : src/ (principal, preload, protocole app://), scripts/
├── packages/
│   ├── design/                 # Jetons : TS (jetons.ts) + variables CSS (jetons.css)
│   ├── api/                    # Client HTTP, jetons visiteur/compte, DTO, cache IndexedDB
│   ├── plateforme/             # Interface web/bureau ; contrat.ts = contrat du preload Electron
│   └── projection/             # Diapositives, état, canal, Bible (références, source), accords
├── design/                     # Maquettes (ne pas modifier)
└── docs/architecture.md
```

Les paquets sont publiés **en TypeScript source** (`exports` → `src/index.ts`) : Next les compile
(`transpilePackages`), Vitest et tsc les lisent tels quels. Pas d'étape de build par paquet.

## Lancer

Node 20 (`.nvmrc`), npm workspaces. Tout se lance depuis la racine :

```bash
npm install            # une fois
npm run dev            # web : http://localhost:3000
npm run build          # export statique → apps/web/out/
npm run typecheck      # tsc sur tous les espaces de travail
npm run lint           # ESLint (règles Next dans apps/web, typescript-eslint ailleurs)
npm test               # Vitest (design, api, projection ; web : jsdom + Testing Library)
npm run verifier       # les quatre à la suite
npm run dev:bureau     # bureau : next dev + Electron (docs/bureau.md)
npm run build:bureau   # export web puis paquet Electron (le build du bureau refait l'export)
```

`NEXT_PUBLIC_API_RACINE` (facultatif, au build) pointe vers un autre backend, ex. un backend local.

## Conventions

- **Français** pour les identifiants et les commentaires, comme dans le mobile. Les champs des DTO
  gardent les noms du backend (anglais) : ce sont des contrats de sérialisation.
- Commentaires sobres qui expliquent le **pourquoi**, pas le quoi.
- **Alias** `@/` = `apps/web/` (ex. `@/components/ui`, `@/lib/i18n`).
- **Export statique** : pas de Server Actions, pas de routes API, pas de segment dynamique `[id]`.
  Les paramètres passent en query string (`/chants/lecture/?id=…`) et se lisent côté client
  (`useSearchParams` sous `<Suspense>`). Toutes les données se chargent côté client.
- Liens internes avec la **barre finale** (`/regie/`, `trailingSlash: true`).
- **i18n maison** FR/EN, FR par défaut : `const t = useT('regie')`. Un fichier par module dans
  `apps/web/lib/i18n/<module>.ts`, créé avec `definirModule(fr, en)` — le compilateur exige les
  mêmes clés dans les deux langues. `formater('{n} éléments', { n })`, `pluriel(n, sing, plur)`.
  Aucun texte visible en dur dans un composant.
- **Styles** : CSS modules + variables des jetons (`var(--bleu-cmfi)`, `var(--rayon-surface)`…).
  Aucune couleur codée en dur. Classes typographiques globales : `titre-ecran`, `titre-oeuvre`,
  `titre-oeuvre-liste`, `paroles`, `refrain`, `meta`, `accroche`, `etiquette-etat`, `accord`,
  `touche`, `visuellement-masque`. Pas de Tailwind.
- **Accessibilité** : vrais `<button>` / `<a>`, `aria-label` sur tout bouton icône, cibles ≥ 44 px,
  focus visible (anneau 2 px bleu décalé de 2 px, au clavier seulement), `role="status"` pour ce
  qui change seul.
- La web app **n'appelle jamais Electron** : seulement `usePlateforme()` / `obtenirPlateforme()`
  de `@cmfi/plateforme`.
- Stockage : contenus en **IndexedDB** (`@cmfi/api` : recueils, chants, catégories, setlists,
  préférences, médias) ; jetons d'authentification seuls en `localStorage` (préfixe `auth_`),
  préférences d'interface en `localStorage` préfixe `app_`. Le schéma IndexedDB ne change que
  dans `packages/api/src/cache.ts`.

## Règles de couleur — chaque couleur a UN emploi

| Jeton | Emploi, et rien d'autre |
|-------|-------------------------|
| `or` #B8862B | Ce qui est **en cours / projeté** : diapositive en direct, élément en direct, partie en cours chez les musiciens. |
| `nuit` #0B2438 | **Aperçus et sorties de projection**, écran des musiciens. Le seul geste sombre. |
| `alerte` #C4392E | **Suppression définitive** (d'une setlist) et **déconnexion**. Jamais une panne réseau, jamais une erreur de saisie. |
| `violet` #6B3FD4 | Ce que **l'utilisateur a créé** : ses setlists, ses chants, ses arrangements. |
| `bleuCmfi` #1668B8 | L'**officiel** (recueils, Bible), la **navigation**, les boutons pleins, la diapositive **suivante**. |
| `orDon` / `orDonVif` / `encreDon` | Le **bandeau de don**, et lui seul. |
| `bleuClair` / `violetClair` | Fonds de **pastille d'icône** uniquement. |

- **Aucune ombre** : toute surface se délimite par un filet (`--filet`). Seule exception : la
  ligne saisie pendant un glisser-déposer (`--ombre-glisser`).
- **Pas de mode sombre** de l'interface. Seules les surfaces de projection sont sombres.
- Bordure de diapositive : 3 px or = en direct, 2 px bleu = suivante, 1 px filet = les autres.
- Régie : « Suivant » 64 px, bascules 96 px. Aucun bouton destructeur dans la régie.

Polices : **Newsreader** (titres, paroles, projection — vraie italique pour les refrains) et
**Instrument Sans** (interface), via `next/font/google`, auto-hébergées au build.

## Architecture (résumé)

- **npm workspaces** : `apps/web`, `apps/desktop`, `packages/*`.
- **`@cmfi/plateforme`** : `ouvrirSortie`, `fermerSortie`, `listerEcrans`, `empecherVeille`,
  `estBureau`… Web : `window.open`, Window Management API (`getScreenDetails`) si disponible,
  `navigator.wakeLock`. Bureau : adaptateur vers `window.cmfi`, exposé par le preload Electron
  selon **`packages/plateforme/src/contrat.ts`** (canaux IPC compris).
- **Régie → sortie / musiciens** : `BroadcastChannel('cmfi-projection')` (`ouvrirCanal` de
  `@cmfi/projection`), même code web et bureau. La régie possède l'`EtatProjection` (réducteur
  pur `reduireProjection`) et le diffuse ; une sortie qui s'ouvre envoie `demande-etat`.
- **Données** : API Railway `https://cmfipraise-prod-production.up.railway.app` (`/api/cmfipraise/…`).
  Mode **visiteur sans compte** par jeton visiteur (`/private/generate-token`), obtenu et renouvelé
  par `ClientApi`. **Compte** requis seulement pour le contenu créé ou partagé (setlists du serveur).
  Setlists **locales** (IndexedDB) pour les visiteurs ; elles seules mêlent chants et passages bibliques.
- **Bible** : domaine public uniquement (Louis Segond 1910, King James). Pour l'instant un
  **échantillon** (Jean 3:16, Psaume 23) derrière l'interface `BibleSource`. Ne jamais écrire un
  verset de mémoire.

## Bureau (apps/desktop)

Processus principal, preload conforme à `contrat.ts`, protocole `app://cmfi` qui sert l'export
web et les données embarquées (`/_donnees/`), relais CORS vers le backend, paquet
electron-builder : tout est décrit dans [docs/bureau.md](docs/bureau.md). Côté web app, seul
`lib/bureau/instantane.ts` en dépend (recopie de `/_donnees/` dans IndexedDB au premier
lancement), toujours derrière `obtenirPlateforme().estBureau()`.

## Intégration entre écrans (contrats)

- **Régie** : `/regie/?setlist=<id local>`, `?serveur=<id>` (compte), `?exemple`, `?chant=<id>`,
  `?bible=<réf>&version=LSG&seconde=KJV`. Un ajout par l'adresse est fait une fois, puis
  l'adresse redevient `/regie/`. La régie monte `useRelaisRegie` (téléphones) une fois pour le
  culte, ouvre `DialogueAppairage`, joint à l'état l'ordre du culte (`definirProgramme`) et le
  code de la salle (`definirSalle`, pour le QR de la sortie).
- **Réglages** (`useReglages`, localStorage `app_reglages`) : la régie s'y abonne (thème de sortie,
  versions bibliques, bilingue, langue des paroles) ; un changement fait dans une autre fenêtre
  arrive par l'évènement `storage`. Écrans : préférence plateforme `affectationsEcrans`
  (`{ [idEcran]: 'sortie' | 'musiciens' | 'rien' }`), partagée par la régie et les réglages.
- **Réseau** : `lib/api.ts` signale chaque réussite ou panne du serveur à `lib/reseau/etat` ;
  `IndicateurReseau` (components/etats) en fait le bandeau. Jamais en couleur alerte.
