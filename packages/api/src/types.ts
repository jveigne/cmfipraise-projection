/**
 * Types DTO de l'API CMFIPraise, tels que le backend les sérialise.
 *
 * Les NOMS DE CHAMPS sont ceux du backend (anglais, camelCase Jackson) : ne pas les
 * traduire, ce sont des contrats de sérialisation. Les noms de types, eux, sont en
 * français comme le reste du code. Sources : cmfipraise-backend (song/dto, book/dto,
 * setlist/dto, category, auth/dto) et les types du mobile (utils/praise/praiseTypes.ts).
 */

/** Langue d'un recueil, d'un chant ou d'une catégorie. */
export type LangueContenu = 'fr' | 'en';

/** Identifiant UUID sérialisé. */
export type Uuid = string;

// ─── Chants ──────────────────────────────────────────────────────────────────

/**
 * Accord posé sur une ligne de paroles.
 *
 * `rootNoteIndex` et `bassNoteIndex` sont des indices de note 0–11 (Do = 0) : c'est ce qui
 * rend la transposition exacte. `name` est calculé par le backend et ne sert que de repli.
 */
export interface AccordDTO {
  id: Uuid;
  rootNoteIndex?: number;
  /** "", "m", "7", "m7", "maj7"… */
  quality?: string;
  /** Accord renversé (G/B → 11), sinon null. */
  bassNoteIndex?: number | null;
  name?: string;
  /** Index du CARACTÈRE de la ligne où l'accord est ancré, 0-based. */
  charIndex?: number | null;
  /** Déprécié : anciennes données seulement. */
  wordIndex?: number;
}

/** Une ligne de paroles, avec ses accords éventuels. */
export interface LigneParolesDTO {
  /** lyricsId en base. */
  id?: number;
  line: string;
  lineNumber?: number;
  chords?: AccordDTO[];
}

/** Type d'une partie de chant côté backend. */
export type TypePartie = 'VERSE' | 'CHORUS';

/**
 * Partie de l'arrangement d'un chant, dans l'ordre d'enchaînement.
 *
 * Un refrain chanté trois fois apparaît trois fois avec le MÊME `partId` : c'est ce qui
 * permet de reconnaître une répétition.
 */
export interface PartieChantDTO {
  /** Rang dans l'arrangement (1, 2, 3…). */
  position: number;
  type: TypePartie;
  /** Id du couplet ou du refrain en base. */
  partId: number;
  lines: LigneParolesDTO[];
}

/** Ancien format (cache du mobile sans `parts`) : couplets et refrains séparés. */
export interface StropheDTO {
  lines: LigneParolesDTO[];
}

/** Chant complet (GET /song/{id}, /song?songTitle=…, /songbook?…&isDetailed=true). */
export interface ChantDTO {
  id: Uuid;
  /** null = catalogue global ; sinon chant personnel de cet utilisateur. */
  ownerId?: Uuid | null;
  /** Numéro dans le recueil. */
  position: number;
  title: string;
  artist?: string | null;
  /** Certaines réponses de recueil renvoient `author` à la place d'`artist`. */
  author?: string | null;
  language?: LangueContenu | string;
  /** Arrangement ordonné : source de vérité. */
  parts?: PartieChantDTO[];
  audioUrl?: string | null;
  /** Tonalité originale 0–11, null = aucune. */
  keyRootIndex?: number | null;
  keyIsMinor?: boolean;
  hasChord?: boolean;
  songbookId?: Uuid;
  /** Repli legacy. */
  verses?: StropheDTO[];
  /** Repli legacy. */
  choruses?: StropheDTO[];
}

// ─── Recueils ────────────────────────────────────────────────────────────────

/** Recueil (GET /all-songbook?language=…). */
export interface RecueilDTO {
  id: Uuid;
  title: string;
  language: LangueContenu | string;
  isPublic?: boolean;
  version?: number;
  songs?: ChantDTO[];
}

/** Version d'un recueil (GET /songbook-versions?language=…) : sert à ne retélécharger que ce qui a changé. */
export interface VersionRecueilDTO {
  id: Uuid;
  title: string;
  version: number;
}

/** Réponse de GET /search-engine. */
export interface ResultatRechercheDTO {
  songBookDTOS?: RecueilDTO[];
  songDTOS?: ChantDTO[];
}

// ─── Catégories ──────────────────────────────────────────────────────────────

/** Chant d'une catégorie : ni recueil ni numéro, les paroles s'ouvrent par `songId`. */
export interface ChantCategorieDTO {
  songId: Uuid;
  title: string;
  author: string | null;
  hasChord: boolean;
}

/**
 * Catégorie (GET /categories?language=…). Une catégorie a UNE langue : les listes `fr` et
 * `en` sont indépendantes, ce ne sont pas des traductions. Déjà triées par le backend.
 */
export interface CategorieDTO {
  id: Uuid;
  name: string;
  language: LangueContenu;
  position: number;
  songs: ChantCategorieDTO[];
}

// ─── Setlists (compte requis) ────────────────────────────────────────────────

/**
 * Chant d'une setlist. Le détail (GET /setlists/{id} ou /share/{code}) renvoie le chant
 * COMPLET ; les réponses de liste ne renseignent que id/title/position/artist.
 */
export interface ChantSetlistDTO {
  id: Uuid;
  title: string;
  position: number;
  artist?: string | null;
  language?: string;
  keyRootIndex?: number | null;
  keyIsMinor?: boolean;
  audioUrl?: string | null;
  parts?: PartieChantDTO[];
}

/** Setlist du serveur. Ne contient que des chants : les passages bibliques restent locaux. */
export interface SetlistDTO {
  id: Uuid;
  name: string;
  /** null pour une setlist orpheline (propriétaire parti, abonnés restants). */
  userId: Uuid | null;
  shareCode?: string | null;
  songs?: ChantSetlistDTO[];
}

export interface CreationSetlistDTO {
  name: string;
  songIds?: Uuid[];
}

export interface AjoutChantSetlistDTO {
  songId: Uuid;
  position?: number;
}

/** Réponse de POST /setlists/{id}/songs : le LIEN setlist ↔ chant (`id` = id de la setlist). */
export interface LienSetlistChantDTO {
  id: Uuid;
  songId: Uuid;
  position: number;
}

// ─── Authentification ────────────────────────────────────────────────────────

export interface UtilisateurDTO {
  id: Uuid;
  email: string;
  fullName: string;
  phoneNumber?: string;
  countryCode?: string;
  createdAt?: string;
}

/** Réponse de POST /auth/login et /auth/register. */
export interface ReponseAuthDTO {
  token: string;
  user: UtilisateurDTO;
}

/** Réponse de GET /private/generate-token (jeton visiteur). */
export interface JetonDTO {
  token: string;
}
