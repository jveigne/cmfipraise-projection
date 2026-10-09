'use client';

/**
 * État centré d'un panneau (design 09 · États) : vide, chargement, erreur.
 * Le chargement annonce son texte (role="status") et montre des barres de squelette
 * plutôt qu'une roue : la mise en page ne saute pas quand le contenu arrive.
 */
import type { ReactNode } from 'react';

import { useT } from '@/lib/i18n';

import styles from './EtatCentre.module.css';
import { Icone, type NomIcone } from './Icone';

export interface PropsEtatCentre {
  genre: 'vide' | 'chargement' | 'erreur';
  titre?: ReactNode;
  texte?: ReactNode;
  icone?: NomIcone;
  /** Boutons (Bouton) sous le texte. */
  actions?: ReactNode;
  className?: string;
}

const ICONES: Record<PropsEtatCentre['genre'], NomIcone> = {
  vide: 'projeter',
  chargement: 'projeter',
  erreur: 'nuageBarre',
};

export function EtatCentre({ genre, titre, texte, icone, actions, className }: PropsEtatCentre) {
  const tc = useT('commun');
  const te = useT('etats');
  const classes = [styles.etat, styles[genre], className ?? ''].filter(Boolean).join(' ');

  if (genre === 'chargement') {
    return (
      <div className={classes} role="status" aria-busy="true">
        <div className={styles.barres} aria-hidden="true">
          <Squelette largeur="92%" />
          <Squelette largeur="74%" />
          <Squelette largeur="58%" />
        </div>
        <p className="meta">{titre ?? tc.chargement}</p>
      </div>
    );
  }

  return (
    <div className={classes} role={genre === 'erreur' ? 'alert' : undefined}>
      <Icone nom={icone ?? ICONES[genre]} taille={48} epaisseur={1.1} className={styles.icone} />
      <h2 className="titre-ecran">{titre ?? (genre === 'erreur' ? te.erreurTitre : te.videTitre)}</h2>
      {(texte ?? (genre === 'erreur' ? te.erreurTexte : null)) && (
        <p className={styles.texte}>{texte ?? te.erreurTexte}</p>
      )}
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}

/** Barre de squelette (fond page, rayon 4) pour les cartes en chargement. */
export function Squelette({ largeur = '100%', hauteur = 12 }: { largeur?: string | number; hauteur?: number }) {
  return <span className={styles.squelette} style={{ width: largeur, height: hauteur }} aria-hidden="true" />;
}
