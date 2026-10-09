'use client';

import { Bouton } from '@/components/ui';
import { useT } from '@/lib/i18n';

import styles from './not-found.module.css';

/** 404 de l'export statique (out/404.html). */
export default function PageIntrouvable() {
  const t = useT('commun');
  return (
    <main className={styles.page}>
      <h1 className="titre-ecran">{t.pageIntrouvable}</h1>
      <p className="meta">{t.pageIntrouvableTexte}</p>
      <Bouton href="/" variante="plein">
        {t.retourAccueil}
      </Bouton>
    </main>
  );
}
