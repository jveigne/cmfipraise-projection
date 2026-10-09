/**
 * Bouton du design : plein (bleuCmfi), secondaire (filet), discret (lien), pointillés
 * (ajouter), alerte (suppression définitive, déconnexion). Rendu en <a> via next/link
 * quand `href` est donné, sinon en vrai <button type="button">.
 *
 * Un bouton sans texte visible (icône seule) DOIT recevoir `aria-label`.
 */
import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

import styles from './Bouton.module.css';
import { Icone, type NomIcone } from './Icone';

export type VarianteBouton = 'plein' | 'secondaire' | 'discret' | 'pointilles' | 'alerte';
/** normale 44 px · grande 48 px · suivant 64 px (régie) · compacte 44 px texte 13. */
export type TailleBouton = 'normale' | 'grande' | 'suivant' | 'compacte';

interface PropsCommunes {
  variante?: VarianteBouton;
  taille?: TailleBouton;
  icone?: NomIcone;
  /** Icône après le libellé (flèche de « Suivant »). */
  iconeFin?: NomIcone;
  pleineLargeur?: boolean;
  /** Bouton carré sans libellé : `aria-label` obligatoire. */
  iconeSeule?: boolean;
  children?: ReactNode;
  className?: string;
}

type PropsBouton = PropsCommunes & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> & { href?: undefined };
type PropsLien = PropsCommunes & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'className' | 'href'> & { href: string };

export function Bouton(props: PropsBouton | PropsLien) {
  const {
    variante = 'secondaire',
    taille = 'normale',
    icone,
    iconeFin,
    pleineLargeur,
    iconeSeule,
    children,
    className,
    ...reste
  } = props;

  const classes = [
    styles.bouton,
    styles[variante],
    taille !== 'normale' ? styles[taille] : '',
    iconeSeule ? styles.icone : '',
    pleineLargeur ? styles.pleineLargeur : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const tailleIcone = taille === 'suivant' ? 22 : iconeSeule ? 20 : 18;
  const contenu = (
    <>
      {icone && <Icone nom={icone} taille={tailleIcone} epaisseur={1.6} />}
      {children}
      {iconeFin && <Icone nom={iconeFin} taille={tailleIcone} epaisseur={1.7} />}
    </>
  );

  if (reste.href !== undefined) {
    const { href, ...lien } = reste as Omit<PropsLien, keyof PropsCommunes>;
    return (
      <Link href={href} className={classes} {...lien}>
        {contenu}
      </Link>
    );
  }

  const { type = 'button', ...bouton } = reste as Omit<PropsBouton, keyof PropsCommunes>;
  return (
    <button type={type} className={classes} {...bouton}>
      {contenu}
    </button>
  );
}
