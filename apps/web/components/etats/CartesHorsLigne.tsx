'use client';

/**
 * Hors-ligne · bureau et web (design 09). Le bureau a tout sur l'ordinateur ; le web dit
 * honnêtement ce qui reste projetable et ce qui attendra le réseau.
 */
import Link from 'next/link';

import { Icone } from '@/components/ui';
import { useT } from '@/lib/i18n';

import styles from './Etats.module.css';

export interface DisponibiliteHorsLigne {
  /** « Setlist du culte », « Louis Segond 1910 ». */
  libelle: string;
  disponible: boolean;
  /** Texte de statut ; par défaut « disponible » ou « au retour du réseau ». */
  statut?: string;
}

export function CarteHorsLigneBureau({ className }: { className?: string }) {
  const t = useT('etats');
  return (
    <div className={[styles.carteHorsLigne, className ?? ''].filter(Boolean).join(' ')}>
      <div className={styles.carteTitre}>
        <Icone nom="nuageOk" taille={20} className={styles.iconeBleue} />
        <span>{t.bureauTitre}</span>
      </div>
      <p className={styles.texte}>{t.bureauTexte}</p>
      <div className={styles.note}>{t.bureauNote}</div>
    </div>
  );
}

export interface PropsCarteHorsLigneWeb {
  disponibilites: readonly DisponibiliteHorsLigne[];
  /** Lien vers la page de l'app de bureau ; masqué sans lui. */
  hrefBureau?: string;
  className?: string;
}

export function CarteHorsLigneWeb({ disponibilites, hrefBureau, className }: PropsCarteHorsLigneWeb) {
  const t = useT('etats');
  return (
    <div className={[styles.carteHorsLigne, className ?? ''].filter(Boolean).join(' ')}>
      <div className={styles.carteTitre}>
        <Icone nom="nuageBarre" taille={20} className={styles.iconeArdoise} />
        <span>{t.webTitre}</span>
      </div>
      <p className={styles.texte}>{t.webTexte}</p>
      <ul className={styles.disponibilites}>
        {disponibilites.map((d) => (
          <li key={d.libelle} className={[styles.disponibilite, d.disponible ? '' : styles.indisponible].filter(Boolean).join(' ')}>
            <span className={styles.disponibiliteNom}>{d.libelle}</span>
            <span className={styles.statut}>{d.statut ?? (d.disponible ? t.disponible : t.auRetourReseau)}</span>
          </li>
        ))}
      </ul>
      {hrefBureau && (
        <Link href={hrefBureau} className={styles.lienBureau}>
          {t.installerBureau}
        </Link>
      )}
    </div>
  );
}

/** Les deux cartes côte à côte, comme dans la maquette. */
export function GrilleHorsLigne(props: PropsCarteHorsLigneWeb) {
  return (
    <div className={styles.grilleHorsLigne}>
      <CarteHorsLigneBureau />
      <CarteHorsLigneWeb disponibilites={props.disponibilites} hrefBureau={props.hrefBureau} />
    </div>
  );
}
