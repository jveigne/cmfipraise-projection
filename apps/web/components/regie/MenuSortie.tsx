'use client';

/**
 * Menu du bouton « Sortie » de l'en-tête : ouvrir ou ramener la sortie, choisir l'écran
 * (bureau ; web avec la Window Management API), ouvrir l'écran des musiciens.
 *
 * « Fermer la sortie » n'y figure pas pendant le direct : fermer couperait la salle. Le lien
 * vers les réglages non plus : quitter la régie interromprait la télécommande.
 */
import type { Ecran } from '@cmfi/plateforme';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { Icone } from '@/components/ui';
import { formater, useT } from '@/lib/i18n';

import styles from './Regie.module.css';

export interface PropsMenuSortie {
  id: string;
  ouvert: boolean;
  sortieOuverte: boolean;
  peutChoisirEcran: boolean;
  ecrans: readonly Ecran[] | null;
  ecranRetenu: string | null;
  peutFermer: boolean;
  surFermerMenu: () => void;
  surOuvrirSortie: () => void;
  surListerEcrans: () => void;
  surChoisirEcran: (id: string) => void;
  surOuvrirMusiciens: () => void;
  surFermerSortie: () => void;
}

export function MenuSortie(p: PropsMenuSortie) {
  const t = useT('regie');
  const ref = useRef<HTMLDivElement>(null);
  const { ouvert, surFermerMenu } = p;

  useEffect(() => {
    if (!ouvert) return;
    const premier = ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)');
    premier?.focus();
    const dehors = (e: PointerEvent) => {
      const cible = e.target as Node;
      if (ref.current?.contains(cible)) return;
      if ((cible as Element).closest?.('[data-menu-sortie]')) return;
      surFermerMenu();
    };
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        surFermerMenu();
      }
    };
    document.addEventListener('pointerdown', dehors);
    ref.current?.addEventListener('keydown', auClavier);
    const noeud = ref.current;
    return () => {
      document.removeEventListener('pointerdown', dehors);
      noeud?.removeEventListener('keydown', auClavier);
    };
  }, [ouvert, surFermerMenu]);

  if (!p.ouvert) return null;

  const action = (f: () => void) => () => {
    f();
    p.surFermerMenu();
  };

  return (
    <div ref={ref} id={p.id} className={styles.menu} role="group" aria-label={t.menuSortie} data-clavier-libre="">
      <button type="button" className={styles.menuEntree} onClick={action(p.surOuvrirSortie)}>
        <Icone nom="ecran" />
        {p.sortieOuverte ? t.ramenerSortie : t.ouvrirSortie}
      </button>

      {p.peutChoisirEcran && (
        <div className={styles.menuGroupe} role={p.ecrans ? 'radiogroup' : undefined} aria-labelledby="regie-menu-ecrans">
          <span id="regie-menu-ecrans" className={styles.menuTitre}>
            {t.ecranDeSortie}
          </span>
          {p.ecrans === null ? (
            <button type="button" className={styles.menuEntree} onClick={p.surListerEcrans}>
              <Icone nom="projeter" />
              {t.choisirEcran}
            </button>
          ) : (
            p.ecrans.map((e) => (
              <button
                key={e.id}
                type="button"
                role="radio"
                aria-checked={e.id === p.ecranRetenu}
                className={styles.menuEntree}
                onClick={action(() => p.surChoisirEcran(e.id))}
              >
                <span className={styles.menuRadio} aria-hidden="true" />
                <span className={styles.menuTextes}>
                  <span>{e.libelle}</span>
                  <span className="meta">
                    {formater(t.dimensions, { largeur: e.largeur, hauteur: e.hauteur })}
                    {e.principal ? ` · ${t.ecranPrincipal}` : ''}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}

      <button type="button" className={styles.menuEntree} onClick={action(p.surOuvrirMusiciens)}>
        <Icone nom="musique" />
        {t.ouvrirMusiciens}
      </button>

      {p.peutFermer && (
        <Link href="/reglages/" className={styles.menuEntree} onClick={p.surFermerMenu}>
          <Icone nom="reglages" />
          {t.personnaliserSortie}
        </Link>
      )}

      {p.peutFermer && p.sortieOuverte && (
        <button type="button" className={styles.menuEntree} onClick={action(p.surFermerSortie)}>
          <Icone nom="fermer" />
          {t.fermerSortie}
        </button>
      )}
    </div>
  );
}
