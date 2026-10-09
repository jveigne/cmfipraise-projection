'use client';

/**
 * Une ligne de l'éditeur (design 07) : poignée, rang, titre et origine, parties dans
 * l'ordre de projection, « Retirer ». Retirer n'est pas supprimer : pas de couleur alerte,
 * le chant reste intact dans le recueil.
 *
 * La poignée porte seule le glisser-déposer (souris, toucher, et clavier : Espace pour
 * saisir, flèches pour déplacer, Espace pour poser).
 */
import type { ElementSetlist } from '@cmfi/api';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties, HTMLAttributes } from 'react';

import { PoigneeGlisser } from '@/components/ui';
import { formater, useLangue, useT } from '@/lib/i18n';

import { metaElement, type DetailElement } from './details';
import styles from './LigneElement.module.css';

interface PropsContenu {
  element: ElementSetlist;
  rang: number;
  detail: DetailElement | undefined;
  surRetirer?: () => void;
  /** Attributs et écouteurs de la poignée (dnd-kit). */
  poignee?: HTMLAttributes<HTMLButtonElement>;
  refPoignee?: (el: HTMLButtonElement | null) => void;
}

function titreElement(e: ElementSetlist): string {
  return e.type === 'chant' ? e.titre : e.reference;
}

export function ContenuElement({ element, rang, detail, surRetirer, poignee, refPoignee }: PropsContenu) {
  const t = useT('setlist');
  const { langue } = useLangue();
  const titre = titreElement(element);
  const meta = metaElement(element, detail, { numero: t.numero, monChant: t.monChant, absent: t.chantIndisponible, absentBible: t.passageAbsent }, langue);
  const puces = detail?.statut === 'pret' ? detail.puces : [];
  const personnel = detail?.statut === 'pret' && detail.genre === 'chant' && detail.personnel;

  return (
    <div className={styles.contenu}>
      <button type="button" ref={refPoignee} className={styles.poignee} aria-label={formater(t.deplacer, { titre })} {...poignee}>
        <PoigneeGlisser />
      </button>
      <span className={styles.rang}>{rang}</span>
      <span className={styles.corps}>
        <span className="titre-oeuvre-liste">{titre}</span>
        <span className={personnel ? styles.metaPerso : 'meta'}>{meta}</span>
      </span>
      {puces.length > 0 && (
        <span className={styles.puces} aria-label={t.ordreProjection}>
          {puces.map((p, i) => (
            <span key={i} className={[styles.puce, p.refrain ? styles.puceRefrain : ''].filter(Boolean).join(' ')}>
              {p.libelle}
            </span>
          ))}
        </span>
      )}
      {surRetirer && (
        <button type="button" className={styles.retirer} onClick={surRetirer} aria-label={formater(t.retirerTitre, { titre })}>
          {t.retirer}
        </button>
      )}
    </div>
  );
}

export function LigneElement(props: Omit<PropsContenu, 'poignee' | 'refPoignee'>) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: props.element.id });
  const t = useT('setlist');
  const style: CSSProperties = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li ref={setNodeRef} style={style} className={isDragging ? styles.depot : styles.ligne}>
      {isDragging ? (
        <span className={styles.texteDepot}>{t.deposerIci}</span>
      ) : (
        <ContenuElement {...props} poignee={{ ...attributes, ...listeners }} refPoignee={setActivatorNodeRef} />
      )}
    </li>
  );
}

/** La ligne saisie, sous le pointeur : la seule ombre de l'interface (`--ombre-glisser`). */
export function LigneSoulevee(props: Omit<PropsContenu, 'poignee' | 'refPoignee' | 'surRetirer'>) {
  return (
    <div className={styles.soulevee}>
      <ContenuElement {...props} />
    </div>
  );
}
