'use client';

/** Interrupteur (role="switch") : un vrai bouton, le libellé fait partie de la cible. */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Icone, type NomIcone } from './Icone';
import styles from './Interrupteur.module.css';

export interface PropsInterrupteur extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'children'> {
  coche: boolean;
  surChangement: (coche: boolean) => void;
  libelle: string;
  /** Explication sous le libellé (réglages) ; le libellé passe alors en gras. */
  description?: ReactNode;
  icone?: NomIcone;
  /**
   * piste-apres (régie : « Bilingue FR + EN » … ●) ou piste-avant (bibliothèque :
   * ● Accords).
   */
  disposition?: 'piste-apres' | 'piste-avant';
}

export function Interrupteur({
  coche,
  surChangement,
  libelle,
  description,
  icone,
  disposition = 'piste-apres',
  className,
  ...reste
}: PropsInterrupteur) {
  const piste = (
    <span className={styles.piste} aria-hidden="true">
      <span className={styles.bouton} />
    </span>
  );
  return (
    <button
      type="button"
      role="switch"
      aria-checked={coche}
      onClick={() => surChangement(!coche)}
      className={[styles.interrupteur, disposition === 'piste-avant' ? styles.pisteAvant : '', className ?? ''].filter(Boolean).join(' ')}
      {...reste}
    >
      {disposition === 'piste-avant' && piste}
      {icone && <Icone nom={icone} taille={20} className={styles.icone} />}
      {description ? (
        <span className={styles.libelle}>
          <span className={styles.titre}>{libelle}</span>
          <span className="meta">{description}</span>
        </span>
      ) : (
        <span className={styles.libelle}>{libelle}</span>
      )}
      {disposition === 'piste-apres' && piste}
    </button>
  );
}
