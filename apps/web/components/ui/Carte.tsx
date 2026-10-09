/** Carte / panneau : surface blanche délimitée par un filet (aucune ombre). */
import type { ElementType, HTMLAttributes, ReactNode } from 'react';

import styles from './Carte.module.css';

export interface PropsCarte extends HTMLAttributes<HTMLElement> {
  /** Élément rendu : div par défaut, section ou article pour un panneau titré. */
  as?: ElementType;
  /** aucun · normal (16) · large (20). */
  remplissage?: 'aucun' | 'normal' | 'large';
  /** Ligne d'en-tête en étiquette d'état ardoise (« VIDE · PREMIÈRE OUVERTURE »). */
  entete?: ReactNode;
}

export function Carte({ as: Element = 'div', remplissage = 'aucun', entete, className, children, ...reste }: PropsCarte) {
  const classes = [styles.carte, remplissage !== 'aucun' ? styles[remplissage] : '', className ?? ''].filter(Boolean).join(' ');
  if (entete) {
    return (
      <Element className={[styles.carte, className ?? ''].filter(Boolean).join(' ')} {...reste}>
        <div className={`${styles.entete} etiquette-etat`}>{entete}</div>
        <div className={remplissage !== 'aucun' ? styles[remplissage] : undefined}>{children}</div>
      </Element>
    );
  }
  return (
    <Element className={classes} {...reste}>
      {children}
    </Element>
  );
}
