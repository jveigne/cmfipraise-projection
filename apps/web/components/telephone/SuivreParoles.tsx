'use client';

/**
 * Paroles en direct pour l'assemblée (design 06, téléphone de droite). Lecture seule, sans
 * compte : la partie d'avant et la suivante en ardoise pour le contexte, la partie chantée
 * en grand. Langue et taille du texte se règlent sur le téléphone et y restent.
 */
import { useEffect, useState } from 'react';

import { EtiquetteEtat } from '@/components/ui';
import { formater, useT } from '@/lib/i18n';
import type { DiapositiveDiffusee } from '@/lib/reseau/transport';

import { EcranLiaison, Rejoindre, ecrireLocal, extrait, lireLocal } from './communs';
import { useSessionTelephone } from './session';
import styles from './Telephone.module.css';

type ChoixLangue = 'premiere' | 'seconde' | 'deux';

const CLE_LANGUE = 'app_suivre_langue';
const CLE_ECHELLE = 'app_suivre_echelle';
const ECHELLE_MIN = 0.8;
const ECHELLE_MAX = 1.6;

/** Fiche Play Store de l'app mobile (org.cmfi.cmfipraise). L'App Store n'a pas encore de lien connu. */
const LIEN_ANDROID = 'https://play.google.com/store/apps/details?id=org.cmfi.cmfipraise';

function lignesPour(d: DiapositiveDiffusee, choix: ChoixLangue): { premieres: string[]; secondes: string[] | null } {
  if (!d.lignesSecondes) return { premieres: d.lignes, secondes: null };
  if (choix === 'seconde') return { premieres: d.lignesSecondes, secondes: null };
  if (choix === 'deux') return { premieres: d.lignes, secondes: d.lignesSecondes };
  return { premieres: d.lignes, secondes: null };
}

function Contexte({ d, choix, complet }: { d: DiapositiveDiffusee; choix: ChoixLangue; complet: boolean }) {
  const { premieres } = lignesPour(d, choix);
  return (
    <div className={`${styles.partie} ${styles.partieContexte}`}>
      <span className={styles.libellePartie}>{d.libelle}</span>
      <span className={[styles.texteContexte, d.genre === 'refrain' ? styles.italique : ''].filter(Boolean).join(' ')}>
        {complet ? premieres.join(' ') : extrait(premieres)}
      </span>
    </div>
  );
}

export function SuivreParoles() {
  const t = useT('telephone');
  const session = useSessionTelephone('assemblee');
  const { etat, liaison } = session;
  const [choix, setChoix] = useState<ChoixLangue>('premiere');
  const [echelle, setEchelle] = useState(1);
  const [android, setAndroid] = useState(false);

  useEffect(() => {
    const l = lireLocal(CLE_LANGUE);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- préférences lues après hydratation, voulu
    if (l === 'premiere' || l === 'seconde' || l === 'deux') setChoix(l);
    const e = Number(lireLocal(CLE_ECHELLE));
    if (e >= ECHELLE_MIN && e <= ECHELLE_MAX) setEchelle(e);
    setAndroid(/android/i.test(navigator.userAgent));
  }, []);

  function changerEchelle(pas: number) {
    const e = Math.round(Math.min(ECHELLE_MAX, Math.max(ECHELLE_MIN, echelle + pas)) * 10) / 10;
    setEchelle(e);
    ecrireLocal(CLE_ECHELLE, String(e));
  }

  function choisir(c: ChoixLangue) {
    setChoix(c);
    ecrireLocal(CLE_LANGUE, c);
  }

  if (!session.rejoint) {
    return (
      <main className={`${styles.telephone} ${styles.surface}`}>
        <Rejoindre role="assemblee" codeConnu={null} nomInitial="" surRejoindre={session.rejoindre} />
      </main>
    );
  }

  if (liaison !== 'connecte') {
    return (
      <main className={`${styles.telephone} ${styles.surface}`}>
        <EcranLiaison liaison={liaison} codeVerification={null} surRedemander={session.redemander} surChangerSalle={session.changerSalle} />
      </main>
    );
  }

  const enDirect = etat?.enDirect ?? null;
  const pause = !!etat && (etat.ecranNoir || etat.logo || etat.texteMasque);
  const langues = etat?.langues ?? null;
  const optionsLangue: { id: ChoixLangue; libelle: string }[] =
    langues?.seconde
      ? [
          { id: 'premiere', libelle: langues.premiere.toUpperCase() },
          { id: 'seconde', libelle: langues.seconde.toUpperCase() },
          { id: 'deux', libelle: formater(t.deuxLangues, { a: langues.premiere.toUpperCase(), b: langues.seconde.toUpperCase() }) },
        ]
      : [];
  const actuel = enDirect ? lignesPour(enDirect, choix) : null;

  return (
    <main className={`${styles.telephone} ${styles.surface}`}>
      <header className={styles.enteteColonne}>
        <div className={styles.ligneDirect}>
          {enDirect && !pause && <EtiquetteEtat etat="direct" />}
          {etat?.programme && (
            <span className="meta">
              {formater(t.enDirectPosition, { nom: etat.programme.nom, position: etat.programme.position, total: etat.programme.total })}
            </span>
          )}
        </div>
        {etat?.titre && <h1 className={styles.titreChant}>{etat.titre}</h1>}
        <div className={styles.reglagesLecture}>
          {optionsLangue.length > 0 && (
            <div role="radiogroup" aria-label={t.langueAria} className={styles.langues}>
              {optionsLangue.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={choix === o.id}
                  className={styles.langue}
                  onClick={() => choisir(o.id)}
                >
                  {o.libelle}
                </button>
              ))}
            </div>
          )}
          <span className={styles.enteteTexte} />
          <button
            type="button"
            className={`${styles.taille} ${styles.taillePetite}`}
            aria-label={t.textePlusPetit}
            disabled={echelle <= ECHELLE_MIN}
            onClick={() => changerEchelle(-0.1)}
          >
            A−
          </button>
          <button
            type="button"
            className={`${styles.taille} ${styles.tailleGrande}`}
            aria-label={t.textePlusGrand}
            disabled={echelle >= ECHELLE_MAX}
            onClick={() => changerEchelle(0.1)}
          >
            A+
          </button>
        </div>
      </header>

      <div className={styles.paroles} style={{ ['--echelle' as string]: echelle }}>
        {!etat || !enDirect || !actuel ? (
          <p className={styles.texteCentre} role="status">
            {t.attenteParoles}
          </p>
        ) : pause ? (
          <div className={styles.centre} role="status">
            <h2 className="titre-ecran">{t.pauseTitre}</h2>
            <p className={styles.texteCentre}>{t.pauseTexte}</p>
          </div>
        ) : (
          <>
            {etat.precedente && <Contexte d={etat.precedente} choix={choix} complet={false} />}
            <div className={styles.maintenant}>
              <span className={styles.motMaintenant}>
                <span className={`${styles.point} ${styles.pointOr}`} aria-hidden="true" />
                {t.maintenant}
              </span>
              <div className={styles.partie} aria-live="polite">
                <span className={styles.libelleMaintenant}>{enDirect.libelle}</span>
                <div className={[styles.texteMaintenant, enDirect.genre === 'refrain' ? styles.italique : ''].filter(Boolean).join(' ')}>
                  {actuel.premieres.map((l, i) => (
                    <span key={i}>{l}</span>
                  ))}
                  {actuel.secondes?.map((l, i) => (
                    <span key={`s${i}`} className={styles.secondeLangue}>
                      {l}
                    </span>
                  ))}
                  {enDirect.reference && <span className={styles.reference}>{enDirect.reference}</span>}
                </div>
              </div>
            </div>
            {etat.suivante && !etat.suivante.changeElement && <Contexte d={etat.suivante} choix={choix} complet />}
          </>
        )}
      </div>

      <footer className={styles.pied}>
        <span className="meta">{t.promoApp}</span>
        {android && (
          <a href={LIEN_ANDROID} className={styles.lienApp} target="_blank" rel="noopener noreferrer">
            {t.ouvrirApp}
          </a>
        )}
      </footer>
    </main>
  );
}
