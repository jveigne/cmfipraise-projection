/**
 * Jetons du système visuel — source unique, reprise de design/Tokens.dc.html.
 *
 * Les couleurs « reprises » sont identiques au mobile (cmfipraise-app/constants/theme.ts) ;
 * les « nouvelles » sont celles qu'imposent la projection et la régie. Chaque couleur porte
 * UN emploi : l'employer ailleurs vide de son sens le seul signal qu'elle porte.
 *
 * Le même jeu de valeurs existe en variables CSS dans `jetons.css` ; un test vérifie que
 * les deux ne dérivent pas.
 */

/** Couleurs reprises du mobile, à l'identique. */
export const Couleurs = {
  /** Ce qui vient du mouvement : recueils officiels, Bible, navigation, boutons pleins, la diapositive « suivante ». */
  bleuCmfi: '#1668B8',
  /** Ce que l'utilisateur a créé : ses setlists (éditeur), ses chants et arrangements. */
  violet: '#6B3FD4',
  /** Texte principal. Contour des bascules activées (Écran noir, Masquer). */
  encre: '#12171C',
  /** Texte secondaire, métadonnées, raccourcis clavier. */
  ardoise: '#5C6873',
  /** Fond de l'application ; fond des éléments sélectionnés dans une liste. */
  page: '#F3F5F7',
  /** Cartes et panneaux. */
  surface: '#FFFFFF',
  /** Bordures et séparateurs. Délimite toute carte : aucune ombre. */
  filet: '#E4E9ED',
  /** Le seul geste sombre : aperçus Sortie et Suivant, sortie de projection, écran des musiciens. */
  nuit: '#0B2438',
  /** EN COURS, uniquement : diapositive projetée, élément de setlist en direct, partie en cours chez les musiciens. */
  or: '#B8862B',
  /** Suppression définitive (d'une setlist) et déconnexion. Jamais pour une panne réseau. */
  alerte: '#C4392E',
  /** Le bandeau de don, et lui seul (accueil, page Soutien) : fond or pâle. */
  orDon: '#F6E7B0',
  /** Or vif de la pastille du cœur, posée sur orDon. */
  orDonVif: '#D4AF37',
  /** Texte posé sur orDon : le blanc n'y est pas lisible. */
  encreDon: '#3B2F0B',
} as const;

/** Fonds teintés des pastilles d'icône, et uniquement d'elles. */
export const Teintes = {
  /** Pastille du recueil et de la Bible (icône bleuCmfi). */
  bleuClair: '#E7F0F9',
  /** Pastille de ce qui est à l'utilisateur (icône violet). */
  violetClair: '#F0EAFC',
} as const;

/** Nouveaux jetons, propres à la projection et à la régie. */
export const CouleursProjection = {
  /** Texte sur nuit et sur les fonds de projection : un blanc cassé, moins éblouissant en salle sombre. */
  ivoireProjection: '#F4F1EA',
  /** Seconde langue, référence biblique, métadonnées sur nuit. */
  brumeProjection: '#9FB3C8',
  /** Équivalent de brumeProjection sur un fond personnalisé chaud. */
  brumeChaude: '#C9BFAF',
  /** Accords sur l'écran des musiciens et diapositive « suivante » sur nuit (dérivé de bleuCmfi). */
  accordNuit: '#7FB6EA',
  /** Séparateurs et contours à l'intérieur des surfaces nuit. */
  filetNuit: '#1E3A52',
  /** Interrupteur éteint, pointillés « ajouter », zone de dépôt neutre (le filet n'atteint pas 3:1). */
  filetFort: '#C9D1D8',
  /** Points de la poignée de glisser-déposer et parties retirées d'un chant. */
  poignee: '#8B96A0',
  /** Survol et appui des liens bleus. */
  bleuAppuye: '#0F4F8F',
  /** Uniquement l'état « Écran noir » dans l'aperçu Sortie et le thème Noir des salles très lumineuses. */
  ecranNoir: '#000000',
  /** Derrière une fenêtre de dialogue (appairage) : encre à 42 %. Une mise en retrait, pas une couleur. */
  voile: 'rgba(18, 23, 28, 0.42)',
} as const;

/**
 * Familles de polices. Les variables `--font-newsreader` et `--font-instrument-sans` sont
 * posées par next/font dans le layout racine ; les replis servent si elles manquent
 * (tests, fenêtre ouverte avant le chargement).
 */
export const Polices = {
  serif: "var(--font-newsreader), 'Newsreader', Georgia, serif",
  sans: "var(--font-instrument-sans), 'Instrument Sans', system-ui, sans-serif",
} as const;

/** Un style typographique, exprimé en valeurs CSS. */
export interface StyleTypo {
  famille: 'serif' | 'sans';
  graisse: 400 | 500 | 600;
  /** Taille en px. */
  taille: number;
  /** Interligne (multiplicateur). */
  interligne: number;
  /** Interlettrage en px, ou en em si la chaîne se termine par « em ». */
  interlettrage?: number | string;
  italique?: boolean;
  capitales?: boolean;
}

/** Échelle typographique de l'interface. Un nouveau rôle se discute, il ne s'improvise pas. */
export const TypoInterface = {
  /** Titre d'écran — Newsreader 600 / 28, -0,5. */
  titreEcran: { famille: 'serif', graisse: 600, taille: 28, interligne: 1.2, interlettrage: -0.5 },
  /** Titre de chant — Newsreader 600 / 20 (17 en liste, 15 en vignette). */
  titreOeuvre: { famille: 'serif', graisse: 600, taille: 20, interligne: 1.2 },
  titreOeuvreListe: { famille: 'serif', graisse: 600, taille: 17, interligne: 1.25 },
  titreOeuvreVignette: { famille: 'serif', graisse: 600, taille: 15, interligne: 1.3 },
  /** Paroles — Newsreader 400 / 19, interligne 1,62 : c'est ce qui les rend chantables. */
  paroles: { famille: 'serif', graisse: 400, taille: 19, interligne: 1.62 },
  /** Refrain : vraie italique Newsreader, préfixé « R. ». */
  refrain: { famille: 'serif', graisse: 400, taille: 19, interligne: 1.62, italique: true },
  /** Corps — Instrument Sans 400 / 15. */
  corps: { famille: 'sans', graisse: 400, taille: 15, interligne: 1.45 },
  /** Métadonnées — Instrument Sans 500 / 13, ardoise. */
  meta: { famille: 'sans', graisse: 500, taille: 13, interligne: 1.4 },
  /** Bouton plein — 600 / 15 (17 pour « Suivant » dans la régie). */
  libelleBouton: { famille: 'sans', graisse: 600, taille: 15, interligne: 1.2 },
  libelleBoutonSuivant: { famille: 'sans', graisse: 600, taille: 17, interligne: 1.2 },
  /** NOUVEAU — Accroche 600 / 48 : accueil et page Soutien seulement. */
  accroche: { famille: 'serif', graisse: 600, taille: 48, interligne: 1.12, interlettrage: -1 },
  /** NOUVEAU — Étiquette d'état 600 / 11–13, capitales, +0,06 em (EN DIRECT, SUIVANTE). */
  etiquetteEtat: { famille: 'sans', graisse: 600, taille: 13, interligne: 1.2, interlettrage: '0.06em', capitales: true },
  etiquetteEtatPetite: { famille: 'sans', graisse: 600, taille: 11, interligne: 1.2, interlettrage: '0.06em', capitales: true },
  /** NOUVEAU — Accord 600 / 13 Instrument Sans, bleuCmfi (20 sur l'écran des musiciens). */
  accord: { famille: 'sans', graisse: 600, taille: 13, interligne: 1.4 },
  accordMusiciens: { famille: 'sans', graisse: 600, taille: 20, interligne: 1.4 },
} as const satisfies Record<string, StyleTypo>;

/**
 * Échelle de projection — Newsreader seule. Valeurs pour une sortie 1920 × 1080 : tout
 * s'échelonne avec la hauteur de l'écran (voir {@link tailleProjection}).
 */
export const TypoProjection = {
  /** Paroles projetées 400 / 72 px, interligne 1,42, centrées, ivoire. */
  paroles: { famille: 'serif', graisse: 400, taille: 72, interligne: 1.42 },
  /** Refrain projeté : même taille, italique. */
  refrain: { famille: 'serif', graisse: 400, taille: 72, interligne: 1.42, italique: true },
  /** En bilingue, les paroles principales sont réduites à 66 px. */
  parolesBilingue: { famille: 'serif', graisse: 400, taille: 66, interligne: 1.42 },
  /** Seconde langue 400 / 44 px (≈ 0,62 ×), brumeProjection. */
  secondeLangue: { famille: 'serif', graisse: 400, taille: 44, interligne: 1.38 },
  /** Verset, deux versions côte à côte 400 / 52 px, interligne 1,45. */
  versetDouble: { famille: 'serif', graisse: 400, taille: 52, interligne: 1.45 },
  /** Référence 400 / 28 px, +0,04 em, en bas, discrète. */
  reference: { famille: 'serif', graisse: 400, taille: 28, interligne: 1.3, interlettrage: '0.04em' },
} as const satisfies Record<string, StyleTypo>;

/** Hauteur de référence de l'échelle de projection. */
export const HAUTEUR_REFERENCE_PROJECTION = 1080;

/**
 * Taille d'un rôle de projection pour une sortie de hauteur donnée.
 * Exemple : paroles (72 px à 1080) → 48 px sur une sortie 720 px de haut.
 */
export function tailleProjection(role: keyof typeof TypoProjection, hauteurSortie: number): number {
  return (TypoProjection[role].taille * hauteurSortie) / HAUTEUR_REFERENCE_PROJECTION;
}

/**
 * Même échelle exprimée en unités de hauteur de fenêtre (`vh`), pour la page de sortie :
 * 72 px à 1080 → 6,667vh, quelle que soit la résolution du projecteur.
 */
export function tailleProjectionVh(role: keyof typeof TypoProjection): string {
  const vh = (TypoProjection[role].taille / HAUTEUR_REFERENCE_PROJECTION) * 100;
  return `${Math.round(vh * 1000) / 1000}vh`;
}

/** Constantes de structure. */
export const Structure = {
  rayon: {
    /** Cartes, panneaux, cartes de diapositive. */
    surface: 14,
    /** Boutons, champs, aperçus de sortie. */
    bouton: 8,
    /** Mini-aperçus, étiquettes d'état, QR. */
    vignette: 4,
  },
  /** Entre panneaux de la régie et entre cartes. */
  gouttiere: 12,
  /** Marge latérale d'une page sur téléphone. */
  marge: 16,
  cible: {
    /** NOUVEAU — tout contrôle. */
    minimale: 44,
    /** Régie : « Suivant », pour un bénévole stressé. */
    suivant: 64,
    /** Régie : bascules Écran noir, Masquer, Logo. */
    bascule: 96,
  },
  bordure: {
    /** NOUVEAU — la diapositive projetée : 3 px or. */
    direct: 3,
    /** « Suivante » : 2 px bleuCmfi. */
    suivante: 2,
    /** Les autres : 1 px filet. */
    normale: 1,
  },
  focus: {
    /** NOUVEAU — anneau de focus 2 px bleu, décalé de 2 px, visible au clavier seulement. */
    epaisseur: 2,
    decalage: 2,
  },
} as const;

/**
 * L'UNIQUE ombre admise : la ligne saisie pendant un glisser-déposer. Tout le reste se
 * délimite par un filet.
 */
export const OmbreGlisser = '0 8px 24px rgba(11, 36, 56, 0.18)';

export const Jetons = {
  Couleurs,
  Teintes,
  CouleursProjection,
  Polices,
  TypoInterface,
  TypoProjection,
  Structure,
  OmbreGlisser,
} as const;
