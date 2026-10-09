'use client';

/**
 * Chargement · découpage des diapositives (design 09). Le titre est déjà là — il est
 * projetable — et les cartes de diapositives arrivent en squelette, sans roue qui tourne :
 * la mise en page ne saute pas quand le contenu arrive.
 */
import { Squelette } from '@/components/ui';
import { formater, useT } from '@/lib/i18n';

import styles from './Etats.module.css';

export interface PropsChargementDiapositives {
  /** Titre de l'élément en préparation (« Grâce infinie »). */
  titre: string;
  /** Nombre de diapositives attendues, s'il est connu ; 4 cartes squelettes sinon. */
  nombre?: number | null;
  className?: string;
}

export function ChargementDiapositives({ titre, nombre, className }: PropsChargementDiapositives) {
  const t = useT('etats');
  const texte =
    nombre == null ? t.preparationInconnue : formater(nombre < 2 ? t.preparationUne : t.preparationPlusieurs, { n: nombre });
  const cartes = Math.min(Math.max(nombre ?? 4, 1), 6);

  return (
    <div className={[styles.chargement, className ?? ''].filter(Boolean).join(' ')} aria-busy="true">
      <div className={styles.chargementEntete}>
        <span className="titre-ecran">{titre}</span>
        <span className="meta" role="status">
          {texte}
        </span>
      </div>
      <div className={styles.grilleSquelettes} aria-hidden="true">
        {Array.from({ length: cartes }, (_, i) => (
          <div key={i} className={styles.carteSquelette}>
            <Squelette largeur={22} hauteur={14} />
            <Squelette largeur="92%" />
            <Squelette largeur="74%" />
            <Squelette largeur="86%" />
            <Squelette largeur="58%" />
          </div>
        ))}
      </div>
    </div>
  );
}
