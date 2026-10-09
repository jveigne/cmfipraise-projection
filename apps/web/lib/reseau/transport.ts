/**
 * Transport « distant » : ce qui relie la régie aux téléphones (télécommande du responsable,
 * paroles pour l'assemblée).
 *
 * Le BroadcastChannel de la projection ne quitte pas le navigateur : il ne peut pas joindre
 * un téléphone. Il faudra un relais réseau, que le backend ne fournit pas encore. Cette
 * interface fixe le contrat dès maintenant, pour que les écrans n'aient rien à changer le
 * jour où il arrivera. Trois implémentations sont prévues :
 *
 *  - `local`        : BroadcastChannel, même navigateur (local.ts). Sert aujourd'hui, pour
 *                     développer et démontrer : un « téléphone » est un autre onglet.
 *  - `relais`       : WebSocket vers le backend (Internet). Web et bureau.
 *  - `reseau-local` : serveur WebSocket ouvert par l'app de bureau sur le Wi-Fi de la salle,
 *                     sans Internet.
 *
 * Ce que le backend et le bureau devront fournir : docs/relais-distant.md.
 *
 * Règle de sécurité, garantie ici par les types et à garantir par le serveur : une
 * télécommande passe les diapositives, met l'écran au noir et lance des versets. Elle ne
 * peut ni supprimer ni modifier une setlist — aucune commande ne le permet.
 */
import type { IdVersion } from '@cmfi/projection';

export type ModeTransport = 'local' | 'relais' | 'reseau-local';

/** Télécommande du responsable (pilote, après acceptation) ou assemblée (lecture seule). */
export type RoleDistant = 'telecommande' | 'assemblee';

// ─── Ce que reçoivent les téléphones ─────────────────────────────────────────

/** Une diapositive réduite au texte : ni accords, ni identifiants internes. */
export interface DiapositiveDiffusee {
  libelle: string;
  genre: 'couplet' | 'refrain' | 'verset';
  lignes: string[];
  /** Seconde langue (chant bilingue) ou seconde version (Bible). */
  lignesSecondes: string[] | null;
  reference: string | null;
}

/**
 * L'état de projection tel que les téléphones le voient. Volontairement plus pauvre que
 * `EtatProjection` : il traverse Internet et arrive sur des appareils non maîtrisés.
 */
export interface EtatDiffuse {
  v: 1;
  /** Titre de l'élément en direct (« Grâce infinie »), null si rien n'est projeté. */
  titre: string | null;
  /** « Culte du dimanche · 2 / 5 ». */
  programme: { nom: string; position: number; total: number } | null;
  /** Partie d'avant, dans le même élément (contexte pour l'assemblée). */
  precedente: DiapositiveDiffusee | null;
  enDirect: DiapositiveDiffusee | null;
  suivante: (DiapositiveDiffusee & { titreElement: string; changeElement: boolean }) | null;
  ecranNoir: boolean;
  texteMasque: boolean;
  logo: boolean;
  /** Langues des paroles (« fr », « en ») ou versions bibliques (« LSG », « KJV »). */
  langues: { premiere: string; seconde: string | null };
  misAJourLe: number;
}

// ─── Ce que peut envoyer une télécommande ────────────────────────────────────

/** Liste fermée : rien ici ne supprime ni ne modifie la setlist. */
export type CommandeDistante =
  | { type: 'suivante' }
  | { type: 'precedente' }
  | { type: 'ecran-noir' }
  /** Verset demandé par le prédicateur : la régie le résout avec sa propre source biblique. */
  | { type: 'passage'; reference: string; version: IdVersion; quand: 'suivante' | 'maintenant' };

// ─── Appairage ───────────────────────────────────────────────────────────────

export interface AppareilDistant {
  /** Id tiré par le téléphone à son arrivée. */
  id: string;
  /** Prénom saisi sur le téléphone (« Paul »), ou vide. */
  nom: string;
  role: RoleDistant;
  /**
   * Code à 3 chiffres affiché par le téléphone ET par la régie : le responsable vérifie
   * qu'il accepte bien le téléphone qu'il a en main, pas un voisin qui aurait scanné le QR.
   */
  codeVerification: string;
  statut: 'en-attente' | 'accepte';
  arriveLe: number;
}

export interface InvitationAppairage {
  /** Code de salle à 6 caractères (sans 0/O ni 1/I), lisible à voix haute. */
  codeSalle: string;
  /** Adresse encodée dans le QR, selon le rôle. */
  adresse(role: RoleDistant): string;
}

export type EtatLiaison =
  /** Pas encore relié (ou fermé). */
  | 'deconnecte'
  /** Recherche de la régie. */
  | 'connexion'
  /** Télécommande en attente d'acceptation par la régie. */
  | 'en-attente'
  | 'connecte'
  | 'refuse'
  /** La régie a retiré ce téléphone, ou fermé la salle. */
  | 'termine'
  /** Réseau perdu : la liaison reprendra seule. */
  | 'interrompu';

// ─── Les deux côtés ──────────────────────────────────────────────────────────

/** Côté régie : une « salle » ouverte pour la durée du culte. */
export interface CoteRegie {
  readonly invitation: InvitationAppairage;
  appareils(): AppareilDistant[];
  surAppareils(rappel: (appareils: AppareilDistant[]) => void): () => void;
  accepter(idAppareil: string): void;
  refuser(idAppareil: string): void;
  /** Retire un téléphone déjà accepté (il repasse en lecture seule… ou nulle part). */
  retirer(idAppareil: string): void;
  /** À appeler à chaque changement de l'état de projection. */
  diffuser(etat: EtatDiffuse): void;
  /** Commandes des télécommandes ACCEPTÉES seulement. */
  surCommande(rappel: (commande: CommandeDistante, appareil: AppareilDistant) => void): () => void;
  fermer(): void;
}

export interface OptionsRejoindre {
  codeSalle: string;
  role: RoleDistant;
  nom: string;
}

/** Côté téléphone. */
export interface CoteTelephone {
  readonly role: RoleDistant;
  readonly codeVerification: string;
  liaison(): EtatLiaison;
  surLiaison(rappel: (etat: EtatLiaison) => void): () => void;
  /** Dernier état reçu, ou null. */
  etat(): EtatDiffuse | null;
  surEtat(rappel: (etat: EtatDiffuse) => void): () => void;
  /** Faux si le téléphone n'est pas une télécommande acceptée : rien n'est envoyé. */
  envoyer(commande: CommandeDistante): boolean;
  fermer(): void;
}

export interface TransportDistant {
  readonly mode: ModeTransport;
  /** Faux pendant le rendu statique ou si le navigateur n'offre pas le moyen de transport. */
  readonly disponible: boolean;
  ouvrirRegie(): CoteRegie;
  rejoindre(options: OptionsRejoindre): CoteTelephone;
}

// ─── Outils communs aux implémentations ──────────────────────────────────────

/** Sans 0, O, 1, I, L : un code qu'on peut dicter et retaper sans erreur. */
const ALPHABET_SALLE = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function aleatoire(n: number): number {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    return crypto.getRandomValues(new Uint32Array(1))[0]! % n;
  }
  return Math.floor(Math.random() * n);
}

export function nouveauCodeSalle(): string {
  return Array.from({ length: 6 }, () => ALPHABET_SALLE[aleatoire(ALPHABET_SALLE.length)]).join('');
}

/** Majuscules, sans espaces ni tirets ; null si ce n'est pas un code de salle. */
export function normaliserCodeSalle(saisie: string): string | null {
  const code = saisie.toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== 6) return null;
  for (const c of code) if (!ALPHABET_SALLE.includes(c)) return null;
  return code;
}

export function nouveauCodeVerification(): string {
  return String(aleatoire(1000)).padStart(3, '0');
}

export function nouvelIdAppareil(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

/** Adresse de la page téléphone pour un rôle : /telecommande/?salle=… ou /suivre/?salle=… */
export function adresseTelephone(origine: string, role: RoleDistant, codeSalle: string): string {
  const route = role === 'telecommande' ? '/telecommande/' : '/suivre/';
  const url = new URL(route, origine);
  url.searchParams.set('salle', codeSalle);
  return url.toString();
}
