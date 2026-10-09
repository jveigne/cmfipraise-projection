/**
 * Pastille d'icône. La teinte porte la même distinction que les couleurs pleines :
 * bleu pour ce qui vient du mouvement, violet pour ce que l'utilisateur a créé.
 */
import { Icone, type NomIcone } from './Icone';
import styles from './PastilleIcone.module.css';

export type TeintePastille = 'bleu' | 'violet' | 'plein' | 'don';

export interface PropsPastilleIcone {
  icone: NomIcone;
  teinte?: TeintePastille;
  /** Côté en px : 24, 30, 32 (défaut), 34, 36. */
  taille?: number;
  className?: string;
}

export function PastilleIcone({ icone, teinte = 'bleu', taille = 32, className }: PropsPastilleIcone) {
  const tailleIcone = Math.round(taille * 0.53);
  return (
    <span
      className={[styles.pastille, styles[teinte], taille <= 24 ? styles.petite : '', className ?? ''].filter(Boolean).join(' ')}
      style={{ width: taille, height: taille }}
      aria-hidden="true"
    >
      <Icone nom={icone} taille={tailleIcone} epaisseur={1.6} />
    </span>
  );
}
