/**
 * Icônes SVG en trait fin, style Ionicons « outline », recopiées des maquettes (design/*.dc.html).
 * Grille 24 × 24, trait `currentColor` : la couleur vient du parent, donc des jetons.
 *
 * Décoratives par défaut (aria-hidden). Une icône qui porte seule un sens prend `titre`.
 */
import type { ReactNode, SVGProps } from 'react';

const TRACES = {
  /** Note de musique : chant, logo de l'app. */
  musique: (
    <>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </>
  ),
  /** Livre : recueils. */
  livre: (
    <>
      <path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z" />
      <path d="M5 17a3 3 0 013-3h11" />
    </>
  ),
  /** Livre à la croix : Bible. */
  bible: (
    <>
      <path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z" />
      <path d="M5 17a3 3 0 013-3h11" />
      <path d="M12 6.5v5M9.5 8.5h5" />
    </>
  ),
  /** Liste à puces : setlist. */
  liste: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1" />
      <circle cx="4.5" cy="12" r="1" />
      <circle cx="4.5" cy="18" r="1" />
    </>
  ),
  recherche: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  moins: <path d="M5 12h14" />,
  coche: <path d="M5 12l5 5 9-10" />,
  fermer: <path d="M6 6l12 12M18 6L6 18" />,
  coeur: <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" />,
  /** Quatre coins : projeter, régie. */
  projeter: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  /** Moniteur : écran de sortie. */
  ecran: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  /** Écran plein : Écran noir. */
  ecranNoir: <rect x="3" y="5" width="18" height="13" rx="2" fill="currentColor" />,
  telephone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </>
  ),
  qr: (
    <>
      <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1" />
      <rect x="14" y="3.5" width="6.5" height="6.5" rx="1" />
      <rect x="3.5" y="14" width="6.5" height="6.5" rx="1" />
      <path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5" />
    </>
  ),
  /** Œil barré : masquer le texte. */
  masquer: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 6.1A9.7 9.7 0 0112 6c5 0 9 6 9 6a17 17 0 01-2.6 3.2M6.3 7.6A17 17 0 003 12s4 6 9 6a9 9 0 004.1-1" />
    </>
  ),
  /** Image : logo, fond personnalisé. */
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="M21 17l-5-5-9 8" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
    </>
  ),
  /** Nuage coché : hors-ligne prêt. */
  nuageOk: (
    <>
      <path d="M7 18a4.5 4.5 0 01-.6-9A6 6 0 0118 8.5a4.5 4.5 0 01-1 9.5z" />
      <path d="M9.5 13l2 2 3.5-4" />
    </>
  ),
  /** Nuage barré : réseau perdu. */
  nuageBarre: (
    <>
      <path d="M7 18a4.5 4.5 0 01-.6-9A6 6 0 0118 8.5a4.5 4.5 0 01-1 9.5z" />
      <path d="M4 4l16 16" />
    </>
  ),
  partager: (
    <>
      <path d="M12 3v12M7 8l5-5 5 5" />
      <path d="M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" />
    </>
  ),
  /** Carte bancaire : don. */
  carte: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
  flecheDroite: <path d="M5 12h14M13 6l6 6-6 6" />,
  flecheGauche: <path d="M19 12H5M11 6l-6 6 6 6" />,
  chevronGauche: <path d="M15 6l-6 6 6 6" />,
  chevronDroite: <path d="M9 6l6 6-6 6" />,
  chevronBas: <path d="M6 9l6 6 6-6" />,
  // Ajoutées dans le même trait, absentes des maquettes mais prévisibles.
  reglages: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  utilisateur: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0116 0" />
    </>
  ),
  deconnexion: (
    <>
      <path d="M10 4H6a2 2 0 00-2 2v12a2 2 0 002 2h4" />
      <path d="M15 8l4 4-4 4M9 12h10" />
    </>
  ),
  lien: (
    <>
      <path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" />
    </>
  ),
  copier: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" />
    </>
  ),
  telecharger: (
    <>
      <path d="M12 4v11M7 10l5 5 5-5" />
      <path d="M5 20h14" />
    </>
  ),
  pleinEcran: <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type NomIcone = keyof typeof TRACES;

export const NOMS_ICONES = Object.keys(TRACES) as NomIcone[];

export interface PropsIcone extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  nom: NomIcone;
  /** Côté en px (18 par défaut, comme les boutons de la régie). */
  taille?: number;
  /** Épaisseur du trait (1,5 par défaut ; 1,1 pour les grandes icônes d'état). */
  epaisseur?: number;
  /** Libellé si l'icône porte seule un sens ; sinon elle est masquée aux lecteurs d'écran. */
  titre?: string;
}

export function Icone({ nom, taille = 18, epaisseur = 1.5, titre, ...reste }: PropsIcone) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={epaisseur}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...(titre ? { role: 'img', 'aria-label': titre } : { 'aria-hidden': true })}
      {...reste}
    >
      {TRACES[nom]}
    </svg>
  );
}

/** Poignée de glisser-déposer : six points couleur `poignee`. */
export function PoigneeGlisser({ className }: { className?: string }) {
  return (
    <svg width="14" height="18" viewBox="0 0 14 18" fill="var(--poignee)" aria-hidden="true" focusable="false" className={className}>
      <circle cx="4" cy="4" r="1.4" />
      <circle cx="10" cy="4" r="1.4" />
      <circle cx="4" cy="9" r="1.4" />
      <circle cx="10" cy="9" r="1.4" />
      <circle cx="4" cy="14" r="1.4" />
      <circle cx="10" cy="14" r="1.4" />
    </svg>
  );
}
