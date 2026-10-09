# Relais distant — télécommande et paroles sur les téléphones

Ce document dit ce que le **backend** (et, pour le Wi-Fi de la salle, l'**app de bureau**)
devra fournir pour que la télécommande du responsable et les paroles de l'assemblée
fonctionnent sur de vrais téléphones. Le contrat côté web app existe déjà :
`apps/web/lib/reseau/transport.ts` (`TransportDistant`). Aujourd'hui seule l'implémentation
**locale** existe (`local.ts`, BroadcastChannel) : elle relie des onglets d'un même navigateur,
pas un téléphone.

## Pourquoi un relais

La régie diffuse son état sur `BroadcastChannel('cmfi-projection')`, qui ne quitte pas le
navigateur (ou l'app de bureau). Un téléphone est un autre appareil : il faut un intermédiaire
réseau. Les écrans (`/telecommande/`, `/suivre/`, la boîte d'appairage) ne parlent qu'à
`TransportDistant` ; brancher le relais = écrire une implémentation de plus et la choisir dans
`obtenirTransportDistant()` (`lib/reseau/distant.ts`). Aucun écran ne change.

## Ce que le relais transporte

| Sens | Message | Contenu |
|------|---------|---------|
| régie → téléphones | `etat` | `EtatDiffuse` : titre, position « 2 / 5 », diapositive d'avant, en direct, suivante (texte seul, **sans accords**), écran noir / texte masqué / logo, langues. Quelques Ko. |
| téléphone → régie | `arrivee` | id d'appareil, prénom, rôle (`telecommande` ou `assemblee`), code de vérification à 3 chiffres |
| régie → téléphone | `recue` | demande de télécommande reçue, en attente du responsable (le téléphone affiche son code) |
| régie → téléphone | `decision` | acceptée / refusée |
| régie → téléphone | `retrait` | la régie retire une télécommande |
| télécommande → régie | `commande` | **liste fermée** : `suivante`, `precedente`, `ecran-noir`, `passage` (référence + version + « suivante » ou « maintenant ») |
| régie → tous | `fin` | la salle est fermée (fin du culte) |

Les types exacts sont dans `transport.ts` ; le protocole local (`local.ts`) en est la
référence exécutable, à reproduire message pour message.

## Backend — à fournir

1. **Un canal temps réel** : WebSocket (Spring : `spring-boot-starter-websocket`, STOMP ou
   WebSocket brut), par exemple `wss://…/ws/projection`. Le SSE ne suffit pas : la
   télécommande émet. Garder la connexion vivante (ping toutes les 20–30 s) : les réseaux
   d'église coupent les connexions muettes.
2. **Des salles éphémères** :
   - `POST /api/cmfipraise/salles` (jeton visiteur ou JWT) → `{ codeSalle, jetonRegie, expireLe }`.
     `codeSalle` : 6 caractères dans `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (pas de 0/O, 1/I/L :
     il se dicte). Durée de vie : la durée d'un culte (ex. 6 h), renouvelable tant que la
     régie est connectée.
   - La régie se connecte au WebSocket avec `jetonRegie` ; elle seule peut diffuser `etat`,
     répondre `decision`, envoyer `retrait` et `fin`.
   - Un téléphone se connecte avec `codeSalle` seul (pas de compte : l'assemblée n'en a pas).
3. **Appairage par code, décision par la régie** :
   - `assemblee` : admis directement, **lecture seule** (reçoit `etat`, n'émet rien d'autre
     qu'`arrivee`/`depart`).
   - `telecommande` : le serveur relaie l'`arrivee` à la régie et **n'accepte aucune commande**
     de cet appareil avant une `decision` positive de la régie. Le code de vérification à
     3 chiffres est affiché des deux côtés : le responsable vérifie qu'il accepte bien son
     téléphone, pas celui d'un voisin qui aurait scanné le QR projeté.
   - À l'acceptation, le serveur remet au téléphone un **jeton de télécommande** (lié à la
     salle et à l'appareil, révoqué par `retrait` ou `fin`), pour qu'un rechargement de page
     ne demande pas de réappairer.
4. **Rôle télécommande sans droit de suppression** : le serveur **valide** chaque `commande`
   contre la liste fermée ci-dessus et rejette tout le reste. Une télécommande ne touche jamais
   aux endpoints de setlist (`SetlistController`) : son jeton ne doit donner accès à aucune
   route REST, seulement à la salle.
5. **Limites** : nombre de téléphones `assemblee` par salle (ex. 500), une à trois
   télécommandes, débit de commandes (ex. 5/s par appareil), taille d'`etat` (ex. 16 Ko).
   L'`etat` n'est pas stocké : le serveur garde seulement le dernier pour le servir à un
   téléphone qui arrive.
6. **CORS / origines** : autoriser l'origine de la web app (dev et production) et celle du
   bureau sur la route WebSocket comme sur `/salles` (voir le bloquant CORS de
   `docs/architecture.md`).
7. **Rien de personnel** : le prénom saisi sur le téléphone n'est relayé qu'à la régie, jamais
   stocké.

## Bureau — option réseau local (Wi-Fi de la salle, sans Internet)

La maquette le promet : « Sur l'app de bureau, l'appairage fonctionne aussi sans Internet,
par le Wi-Fi de la salle. » Implémentation `reseau-local` :

- Le processus principal Electron ouvre un petit serveur HTTP + WebSocket sur le réseau local
  (port fixe, ex. 47 800, repli sur un port libre), qui sert **les mêmes pages statiques**
  `/telecommande/` et `/suivre/` (export de la web app) et le même protocole que le relais.
- Le QR encode alors `http://<ip-locale>:<port>/telecommande/?salle=…`. Le contrat du preload
  (`packages/plateforme/src/contrat.ts`) devra exposer : démarrer/arrêter le serveur, l'adresse
  locale, et un pont de messages (le serveur vit dans le processus principal, la régie dans le
  renderer).
- Le pare-feu du système demandera une autorisation au premier lancement : l'expliquer dans
  l'interface avant de déclencher la demande.
- Pas de TLS sur le réseau local : le code de vérification et l'acceptation explicite par la
  régie restent la protection. Le serveur n'écoute que pendant qu'une salle est ouverte.
- Choix automatique : `reseau-local` si l'app de bureau a une adresse locale, sinon `relais`.
  L'en-tête de la télécommande dit lequel est utilisé (« Wi-Fi de la salle » / « Internet »).

## Comportement attendu en cas de coupure

Si le relais tombe, **la projection continue** (elle ne passe jamais par lui). Les téléphones
passent en `interrompu` et se reconnectent seuls ; la régie affiche « Télécommande : en
attente », « Paroles de l'assemblée : en attente » (`design/Etats.dc.html`).
