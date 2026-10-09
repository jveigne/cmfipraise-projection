'use client';

/** « Hors-ligne prêt » : barre de titre du bureau (design WebBureau, États). */
import { Icone } from '@/components/ui';
import { useT } from '@/lib/i18n';

import styles from './Etats.module.css';

export function PastilleHorsLignePret({ className }: { className?: string }) {
  const t = useT('etats');
  return (
    <span className={[styles.pastillePret, className ?? ''].filter(Boolean).join(' ')}>
      <Icone nom="nuageOk" taille={16} />
      {t.horsLignePret}
    </span>
  );
}
