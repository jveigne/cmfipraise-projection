'use client';

/**
 * Onglets accessibles (role tablist) : flèches gauche/droite, Début, Fin ; un seul onglet
 * dans l'ordre de tabulation (tabindex mobile). Le panneau est rendu par l'appelant, avec
 * `id={idPanneau(idBase, id)}` et `aria-labelledby={idOnglet(idBase, id)}`.
 */
import { useRef, type KeyboardEvent } from 'react';

import styles from './Onglets.module.css';

export interface Onglet<T extends string> {
  id: T;
  libelle: string;
}

export interface PropsOnglets<T extends string> {
  onglets: readonly Onglet<T>[];
  actif: T;
  surChangement: (id: T) => void;
  /** Préfixe des ids d'onglets et de panneaux. */
  idBase: string;
  'aria-label': string;
  variante?: 'souligne' | 'pastilles';
  className?: string;
}

export const idOnglet = (idBase: string, id: string) => `${idBase}-onglet-${id}`;
export const idPanneau = (idBase: string, id: string) => `${idBase}-panneau-${id}`;

export function Onglets<T extends string>({
  onglets,
  actif,
  surChangement,
  idBase,
  variante = 'souligne',
  className,
  ...aria
}: PropsOnglets<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function auClavier(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const dernier = onglets.length - 1;
    const cible =
      e.key === 'ArrowRight' ? (index === dernier ? 0 : index + 1)
      : e.key === 'ArrowLeft' ? (index === 0 ? dernier : index - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? dernier
      : null;
    if (cible === null) return;
    e.preventDefault();
    const onglet = onglets[cible];
    if (!onglet) return;
    surChangement(onglet.id);
    refs.current[cible]?.focus();
  }

  return (
    <div role="tablist" aria-label={aria['aria-label']} className={[styles.liste, styles[variante], className ?? ''].filter(Boolean).join(' ')}>
      {onglets.map((o, i) => {
        const selectionne = o.id === actif;
        return (
          <button
            key={o.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={idOnglet(idBase, o.id)}
            aria-selected={selectionne}
            aria-controls={idPanneau(idBase, o.id)}
            tabIndex={selectionne ? 0 : -1}
            className={styles.onglet}
            onClick={() => surChangement(o.id)}
            onKeyDown={(e) => auClavier(e, i)}
          >
            {o.libelle}
          </button>
        );
      })}
    </div>
  );
}
