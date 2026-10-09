'use client';

/**
 * Champ de saisie du design : 44 px, rayon 8, filet. Le libellé est toujours présent
 * pour les lecteurs d'écran ; `libelleMasque` le cache à l'œil quand la maquette n'en
 * montre pas (barre unique, recherche).
 */
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

import styles from './Champ.module.css';
import { Icone, type NomIcone } from './Icone';

export interface PropsChamp extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  libelle: string;
  libelleMasque?: boolean;
  icone?: NomIcone;
  /** Touche qui donne le focus, affichée à droite (« / »). */
  raccourci?: string;
  /** Fond page (barre de la régie) ou surface (recherche de la bibliothèque). */
  fond?: 'page' | 'surface';
  aide?: ReactNode;
  /** Message d'erreur : rend le champ invalide et l'annonce. */
  erreur?: ReactNode;
  className?: string;
}

export const Champ = forwardRef<HTMLInputElement, PropsChamp>(function Champ(
  { libelle, libelleMasque, icone, raccourci, fond = 'page', aide, erreur, className, id, type = 'text', ...reste },
  ref
) {
  const genere = useId();
  const idChamp = id ?? genere;
  const idAide = aide || erreur ? `${idChamp}-aide` : undefined;

  const classes = [
    styles.saisie,
    fond === 'page' ? styles.fondPage : styles.fondSurface,
    icone ? styles.avecIcone : '',
    raccourci ? styles.avecRaccourci : '',
    erreur ? styles.invalide : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={[styles.champ, className ?? ''].filter(Boolean).join(' ')}>
      <label htmlFor={idChamp} className={libelleMasque ? 'visuellement-masque' : styles.libelle}>
        {libelle}
      </label>
      <div className={styles.cadre}>
        {icone && <Icone nom={icone} className={styles.icone} />}
        <input
          ref={ref}
          id={idChamp}
          type={type}
          className={classes}
          aria-invalid={erreur ? true : undefined}
          aria-describedby={idAide}
          {...reste}
        />
        {raccourci && (
          <span className={`touche ${styles.raccourci}`} aria-hidden="true">
            {raccourci}
          </span>
        )}
      </div>
      {(erreur || aide) && (
        <span id={idAide} className={styles.aide} role={erreur ? 'alert' : undefined}>
          {erreur ?? aide}
        </span>
      )}
    </div>
  );
});
