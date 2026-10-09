'use client';

/**
 * Réseau perdu en plein culte (design 09) : le bandeau rassurant, l'aperçu de ce qui est
 * toujours projeté, et l'état de chaque service. La sortie, la Bible et les musiciens
 * tournent en local ; seuls les téléphones attendent le réseau.
 */
import type { ReactNode } from 'react';

import { BandeauHorsLigne, EtiquetteEtat } from '@/components/ui';
import { useEstBureau } from '@/lib/plateforme';
import { useT } from '@/lib/i18n';

import styles from './Etats.module.css';

export interface ServiceHorsLigne {
  libelle: string;
  local: boolean;
  statut?: string;
}

/** Liste « Sortie et Bible · en local », « Télécommande · en attente »… */
export function ServicesHorsLigne({ services }: { services?: readonly ServiceHorsLigne[] }) {
  const t = useT('etats');
  const bureau = useEstBureau();
  const liste: readonly ServiceHorsLigne[] = services ?? [
    { libelle: t.serviceSortieBible, local: true },
    { libelle: t.serviceMusiciens, local: true, statut: bureau ? t.enLocalBureau : t.enLocal },
    { libelle: t.serviceTelecommande, local: false },
    { libelle: t.serviceAssemblee, local: false },
  ];
  return (
    <ul className={styles.services} aria-label={t.servicesAria}>
      {liste.map((s) => (
        <li key={s.libelle} className={styles.service}>
          <span>{s.libelle}</span>
          <span className={s.local ? styles.serviceLocal : styles.serviceAttente}>{s.statut ?? (s.local ? t.enLocal : t.enAttente)}</span>
        </li>
      ))}
    </ul>
  );
}

export interface PropsReseauPerduEnCulte {
  /** Aperçu de la sortie en direct (surface nuit), fourni par la régie. */
  apercu?: ReactNode;
  /** Vrai si l'aperçu montre une diapositive en direct (étiquette or). */
  enDirect?: boolean;
  services?: readonly ServiceHorsLigne[];
  /** Forcer l'affichage du bandeau (aperçu de maquette) ; sinon il suit le navigateur. */
  enLigne?: boolean;
}

export function ReseauPerduEnCulte({ apercu, enDirect, services, enLigne }: PropsReseauPerduEnCulte) {
  const t = useT('etats');
  return (
    <div className={styles.reseauPerdu}>
      <BandeauHorsLigne enLigne={enLigne ?? false} />
      <div className={styles.reseauPerduCorps}>
        {apercu && (
          <div className={styles.apercu}>
            <div className={styles.apercuEntete}>
              <span className="etiquette-etat">{t.sortie}</span>
              {enDirect && <EtiquetteEtat etat="direct" />}
            </div>
            {apercu}
          </div>
        )}
        <ServicesHorsLigne services={services} />
      </div>
    </div>
  );
}
