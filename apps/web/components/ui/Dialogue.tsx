'use client';

/**
 * Fenêtre de dialogue modale sur <dialog> natif : piège du focus, Échap, fond inerte et
 * retour du focus au bouton d'origine sont fournis par le navigateur. Voile `--voile`,
 * filet, aucune ombre. Un clic sur le voile ferme, comme Échap.
 *
 * Deux dispositions :
 *  - « compacte » (défaut) : titre, texte, contenu et boutons dans une seule marge
 *    (connexion, ajout à une setlist, confirmation de suppression) ;
 *  - « sections » : en-tête séparé par un filet, contenu sans marge que l'appelant découpe
 *    lui-même (appairage du téléphone, design 06).
 */
import { useEffect, useId, useRef, type ReactNode } from 'react';

import { useT } from '@/lib/i18n';

import { Bouton } from './Bouton';
import styles from './Dialogue.module.css';

export interface PropsDialogue {
  ouvert: boolean;
  surFermeture: () => void;
  titre: ReactNode;
  /** Texte d'introduction sous le titre (disposition compacte). */
  description?: ReactNode;
  children?: ReactNode;
  /** Boutons du pied (disposition compacte). La croix de l'en-tête ferme toujours. */
  actions?: ReactNode;
  /** 440, 560 ou 760 px au plus. */
  largeur?: 'etroite' | 'normale' | 'large';
  disposition?: 'compacte' | 'sections';
}

export function Dialogue({
  ouvert,
  surFermeture,
  titre,
  description,
  children,
  actions,
  largeur = 'etroite',
  disposition = 'compacte',
}: PropsDialogue) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitre = useId();
  const idDescription = useId();
  const t = useT('commun');
  const sections = disposition === 'sections';

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (ouvert && !d.open) {
      // jsdom n'implémente pas showModal : repli sur l'attribut, suffisant pour les tests.
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
    } else if (!ouvert && d.open) {
      if (typeof d.close === 'function') d.close();
      else d.removeAttribute('open');
    }
  }, [ouvert]);

  return (
    <dialog
      ref={ref}
      className={[styles.dialogue, styles[largeur]].join(' ')}
      aria-labelledby={idTitre}
      aria-describedby={description ? idDescription : undefined}
      onClose={surFermeture}
      onCancel={(e) => {
        e.preventDefault();
        surFermeture();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) surFermeture();
      }}
    >
      {ouvert && (
        <div className={sections ? styles.boiteSections : styles.boite}>
          <div className={sections ? styles.enteteSections : styles.entete}>
            <h2 id={idTitre} className={sections ? `titre-ecran ${styles.titreSections}` : styles.titre}>
              {titre}
            </h2>
            <Bouton variante={sections ? 'secondaire' : 'discret'} iconeSeule icone="fermer" aria-label={t.fermer} onClick={surFermeture} />
          </div>
          {description && (
            <p id={idDescription} className={styles.description}>
              {description}
            </p>
          )}
          {children}
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
    </dialog>
  );
}
