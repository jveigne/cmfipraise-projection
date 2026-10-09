'use client';

/**
 * Bandeau de don : or pâle, cœur or vif, encre de don. Ces trois couleurs ne servent qu'à
 * lui. Sur l'accueil il mène à /soutien/ ; sur la page Soutien il n'a pas de bouton.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';

import { PastilleIcone } from '@/components/ui';

import styles from './BandeauDon.module.css';

export interface PropsBandeauDon {
  children: ReactNode;
  /** Libellé du bouton vers /soutien/ ; aucun bouton si absent. */
  action?: string;
  /** Pleine largeur (page Soutien) ou carte arrondie (accueil). */
  forme?: 'carte' | 'bande';
}

export function BandeauDon({ children, action, forme = 'carte' }: PropsBandeauDon) {
  return (
    <div className={[styles.bandeau, styles[forme]].join(' ')}>
      <div className={styles.contenu}>
        <PastilleIcone icone="coeur" teinte="don" taille={36} />
        <p className={styles.texte}>{children}</p>
        {action && (
          <Link href="/soutien/" className={styles.action}>
            {action}
          </Link>
        )}
      </div>
    </div>
  );
}
