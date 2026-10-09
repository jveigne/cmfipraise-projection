'use client';

/**
 * Étiquette d'état de la régie : EN DIRECT (or, et nulle part ailleurs) ou SUIVANTE (bleu).
 * Capitales 600, +0,06 em : on doit la lire d'un coup d'œil.
 */
import type { ReactNode } from 'react';

import { useT } from '@/lib/i18n';

import styles from './EtiquetteEtat.module.css';

export interface PropsEtiquetteEtat {
  etat: 'direct' | 'suivante';
  /** petite = 11 px (cartes de diapositive), normale = 13 px. */
  taille?: 'petite' | 'normale';
  /** Point devant le libellé (« ● EN DIRECT »). */
  point?: boolean;
  /** Libellé ; « En direct » / « Suivante » par défaut. */
  children?: ReactNode;
  className?: string;
}

export function EtiquetteEtat({ etat, taille = 'petite', point, children, className }: PropsEtiquetteEtat) {
  const t = useT('commun');
  return (
    <span className={[styles.etiquette, styles[etat], styles[taille], className ?? ''].filter(Boolean).join(' ')}>
      {point && <span className={styles.point} aria-hidden="true" />}
      {children ?? (etat === 'direct' ? t.enDirect : t.suivante)}
    </span>
  );
}
