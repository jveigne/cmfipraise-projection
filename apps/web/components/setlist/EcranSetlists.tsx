'use client';

/**
 * Écran des setlists (design 07) : liste, éditeur, partage. Paramètres en query string
 * (export statique) : `?id=` setlist de cet appareil, `?code=` code reçu, `?partagee=`
 * setlist rejointe.
 */
import { nouvelleSetlist } from '@cmfi/api';
import { useRouter, useSearchParams } from 'next/navigation';

import { IndicateurReseau } from '@/components/etats';
import { Bouton, EtatCentre } from '@/components/ui';
import { useT } from '@/lib/i18n';

import { ApercuPartagee } from './ApercuPartagee';
import styles from './EcranSetlists.module.css';
import { EditeurSetlist } from './EditeurSetlist';
import { sauverSetlist, useSetlistsLocales } from './magasinSetlists';
import { NavSetlists } from './NavSetlists';
import { PanneauPartage } from './PanneauPartage';

export function EcranSetlists() {
  const t = useT('setlist');
  const parametres = useSearchParams();
  const router = useRouter();
  const { setlists, statut } = useSetlistsLocales();
  const id = parametres.get('id');
  const code = parametres.get('code');
  const partagee = parametres.get('partagee');
  const setlist = id ? setlists.find((s) => s.id === id) : undefined;

  async function creer() {
    const s = await sauverSetlist(nouvelleSetlist(t.nouvelleNom));
    router.push(`/setlists/?id=${encodeURIComponent(s.id)}`);
  }

  let centre;
  if (code) centre = <ApercuPartagee key={`code:${code}`} source={{ genre: 'code', code: code.toUpperCase() }} />;
  else if (partagee) centre = <ApercuPartagee key={`partagee:${partagee}`} source={{ genre: 'partagee', id: partagee }} />;
  else if (id && statut === 'chargement') centre = <EtatCentre genre="chargement" />;
  else if (id && !setlist) centre = <EtatCentre genre="vide" icone="liste" titre={t.introuvable} texte={t.introuvableTexte} />;
  else if (setlist) centre = <EditeurSetlist key={setlist.id} setlist={setlist} />;
  else
    centre = (
      <EtatCentre
        genre="vide"
        icone="liste"
        titre={t.choisir}
        texte={t.choisirTexte}
        actions={
          <Bouton variante="secondaire" icone="plus" onClick={() => void creer()}>
            {t.nouvelle}
          </Bouton>
        }
      />
    );

  return (
    <div className={styles.ecran} data-partage={setlist ? '' : undefined}>
      <NavSetlists idActif={setlist?.id ?? null} partageeActive={partagee} />
      <main className={styles.centre}>
        <div className={styles.horsLigne}>
          <IndicateurReseau />
        </div>
        {centre}
      </main>
      {setlist && <PanneauPartage setlist={setlist} />}
    </div>
  );
}
