'use client';

/** Une ligne de la liste des chants : numéro, titre, premier vers ou origine. Un lien vers la lecture. */
import Link from 'next/link';

import styles from './LigneChant.module.css';

export interface PropsLigneChant {
  id: string;
  numero: string;
  titre: string;
  meta: string;
  selectionne: boolean;
  /** Chant de l'utilisateur : la méta passe en violet. */
  personnel?: boolean;
}

export function hrefLecture(id: string): string {
  return `/chants/lecture/?id=${encodeURIComponent(id)}`;
}

export function LigneChant({ id, numero, titre, meta, selectionne, personnel }: PropsLigneChant) {
  return (
    <li>
      <Link href={hrefLecture(id)} className={styles.ligne} aria-current={selectionne ? 'page' : undefined} scroll={false}>
        <span className={styles.numero}>{numero}</span>
        <span className={styles.corps}>
          <span className="titre-oeuvre-liste">{titre}</span>
          {meta && <span className={personnel ? styles.metaPerso : 'meta'}>{meta}</span>}
        </span>
      </Link>
    </li>
  );
}
