'use client';

/**
 * Bandeau « Réseau perdu. La projection continue. » Rassurer, pas alarmer : fond page,
 * icône encre, jamais la couleur alerte (une panne réseau n'est pas une faute).
 *
 * Sans `enLigne`, il suit lui-même l'état du navigateur et note l'heure de la coupure.
 */
import { useEffect, useState, type ReactNode } from 'react';

import { formater, useLangue, useT } from '@/lib/i18n';
import { useEnLigne } from '@/lib/reseau';

import styles from './BandeauHorsLigne.module.css';
import { Icone } from './Icone';

export interface PropsBandeauHorsLigne {
  /** Forcer l'état (aperçu, tests) ; sinon `navigator.onLine`. */
  enLigne?: boolean;
  titre?: ReactNode;
  texte?: ReactNode;
  className?: string;
}

export function BandeauHorsLigne({ enLigne, titre, texte, className }: PropsBandeauHorsLigne) {
  const reseau = useEnLigne();
  const enLigneEffectif = enLigne ?? reseau;
  const t = useT('etats');
  const { langue } = useLangue();
  const [coupureA, setCoupureA] = useState<Date | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- on mémorise l'instant de la coupure
    setCoupureA(enLigneEffectif ? null : (precedente) => precedente ?? new Date());
  }, [enLigneEffectif]);

  if (enLigneEffectif) return null;

  const heure = coupureA
    ? coupureA.toLocaleTimeString(langue === 'fr' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' }).replace(':', langue === 'fr' ? ' h ' : ':')
    : null;

  return (
    <div role="status" className={[styles.bandeau, className ?? ''].filter(Boolean).join(' ')}>
      <Icone nom="nuageBarre" taille={22} className={styles.icone} />
      <div className={styles.corps}>
        <span className={styles.titre}>{titre ?? (heure ? formater(t.horsLigneTitreHeure, { heure }) : t.horsLigneTitre)}</span>
        <span className={styles.texte}>{texte ?? t.horsLigneTexte}</span>
      </div>
    </div>
  );
}
