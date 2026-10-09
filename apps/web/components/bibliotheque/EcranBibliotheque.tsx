'use client';

/**
 * Écran de la bibliothèque (design 02), commun à /chants/ et /chants/lecture/?id=… :
 * barre latérale, colonne des chants, lecture. Sur un téléphone, une seule colonne :
 * la liste sur /chants/, le chant sur /chants/lecture/.
 *
 * L'identifiant passe en query string (export statique : pas de segment [id]).
 */
import { useSearchParams } from 'next/navigation';

import { IndicateurReseau } from '@/components/etats';
import { Bouton, EtatCentre } from '@/components/ui';
import { useT } from '@/lib/i18n';

import { BarreLaterale } from './BarreLaterale';
import { ColonneChants } from './ColonneChants';
import styles from './EcranBibliotheque.module.css';
import { useFiltres } from './etat';
import { LectureChant } from './LectureChant';
import { ColonneBible, LectureBible } from './VueBible';

export function EcranBibliotheque({ lecture }: { lecture: boolean }) {
  const t = useT('bibliotheque');
  const parametres = useSearchParams();
  const id = lecture ? parametres.get('id') : null;
  const { vue } = useFiltres();
  const bible = vue === 'bible';

  return (
    <div className={styles.ecran} data-vue={bible ? 'bible' : lecture ? 'lecture' : 'liste'}>
      <BarreLaterale />
      <div className={styles.colonne}>{bible ? <ColonneBible /> : <ColonneChants idSelectionne={id} />}</div>
      <main className={styles.lecture} id="contenu">
        <div className={styles.horsLigne}>
          <IndicateurReseau />
        </div>
        {lecture && !bible && (
          <Bouton variante="discret" icone="chevronGauche" href="/chants/" className={styles.retour}>
            {t.retourListe}
          </Bouton>
        )}
        {bible ? (
          <LectureBible />
        ) : id ? (
          <LectureChant key={id} id={id} />
        ) : lecture ? (
          <EtatCentre genre="vide" icone="musique" titre={t.chantIntrouvable} texte={t.lienSansChant} />
        ) : (
          <EtatCentre genre="vide" icone="musique" titre={t.choisirChant} texte={t.choisirChantTexte} />
        )}
      </main>
    </div>
  );
}
