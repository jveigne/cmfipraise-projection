'use client';

/**
 * Barre latérale de la bibliothèque (design 02). Recueils, Favoris, Mes chants et Bible
 * changent la colonne du milieu sans quitter la page ; Setlists et la Régie sont d'autres
 * écrans, donc de vrais liens. Les icônes violettes signalent ce qui est à l'utilisateur.
 */
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { Icone, PastilleIcone, type NomIcone } from '@/components/ui';
import { useT } from '@/lib/i18n';

import styles from './BarreLaterale.module.css';
import { CarteCompte } from './CarteCompte';
import { changerFiltres, useFiltres, type FiltresBibliotheque } from './etat';

interface Entree {
  cle: string;
  libelle: string;
  icone: NomIcone;
  teinte: 'ardoise' | 'violet';
  actif: boolean;
  filtres: Partial<FiltresBibliotheque>;
}

export function BarreLaterale() {
  const t = useT('bibliotheque');
  const tc = useT('commun');
  const filtres = useFiltres();
  const router = useRouter();
  const chemin = usePathname();

  const entrees: Entree[] = [
    {
      cle: 'recueils',
      libelle: t.recueils,
      icone: 'livre',
      teinte: 'ardoise',
      actif: filtres.vue === 'recueils' && filtres.onglet !== 'favoris',
      filtres: { vue: 'recueils', onglet: 'langue' },
    },
    {
      cle: 'favoris',
      libelle: t.favoris,
      icone: 'coeur',
      teinte: 'ardoise',
      actif: filtres.vue === 'recueils' && filtres.onglet === 'favoris',
      filtres: { vue: 'recueils', onglet: 'favoris' },
    },
    { cle: 'mes-chants', libelle: t.mesChants, icone: 'musique', teinte: 'violet', actif: filtres.vue === 'mes-chants', filtres: { vue: 'mes-chants' } },
  ];

  function choisir(e: Entree) {
    changerFiltres({ ...e.filtres, recherche: '' });
    // Sur un petit écran, la lecture cache la liste : on y revient.
    if (chemin?.startsWith('/chants/lecture') && window.matchMedia('(max-width: 759px)').matches) router.push('/chants/');
  }

  const bible: Entree = { cle: 'bible', libelle: t.bible, icone: 'bible', teinte: 'ardoise', actif: filtres.vue === 'bible', filtres: { vue: 'bible' } };

  const bouton = (e: Entree) => (
    <button
      key={e.cle}
      type="button"
      className={styles.entree}
      aria-current={e.actif ? 'page' : undefined}
      onClick={() => choisir(e)}
    >
      <Icone nom={e.icone} className={e.actif ? undefined : styles[e.teinte]} />
      {e.libelle}
    </button>
  );

  return (
    <nav aria-label={t.navigation} className={styles.barre}>
      <Link href="/" className={styles.marque}>
        <PastilleIcone icone="musique" teinte="plein" taille={32} />
        <span className={styles.nom}>{tc.nomApp}</span>
      </Link>
      <div className={styles.entrees}>
        {entrees.map(bouton)}
        <Link href="/setlists/" className={styles.entree}>
          <Icone nom="liste" className={styles.violet} />
          {t.setlists}
        </Link>
        {bouton(bible)}
        <span className={styles.separateur} aria-hidden="true" />
        <Link href="/regie/" className={styles.entree}>
          <Icone nom="projeter" className={styles.ardoise} />
          {t.regie}
        </Link>
      </div>
      <span className={styles.ressort} />
      <div className={styles.compte}>
        <CarteCompte />
      </div>
    </nav>
  );
}
