'use client';

/**
 * La Bible dans la bibliothèque : une référence, une ou deux versions du domaine public,
 * le passage. Pour l'instant la source est l'ÉCHANTILLON de @cmfi/projection (Jean 3:16,
 * Psaume 23) : l'écran le dit, et ne remplace jamais un verset absent par autre chose.
 */
import {
  analyserReference,
  formaterReference,
  sourceEchantillon,
  type BibleSource,
  type IdVersion,
  type PassageBiblique,
  type ReferenceBiblique,
} from '@cmfi/projection';
import { useEffect, useState } from 'react';

import { Bouton, Champ, EtatCentre } from '@/components/ui';
import { formater, useLangue, useT } from '@/lib/i18n';

import { creerMagasin, useMagasin } from './magasin';
import styles from './VueBible.module.css';

/** La source branchée ici ; l'import complet implémentera la même interface. */
const SOURCE: BibleSource = sourceEchantillon;

/** Passages de l'échantillon, proposés en raccourci. */
const EXEMPLES = ['Jean 3:16', 'Psaume 23'];

interface EtatBible {
  saisie: string;
  version: IdVersion;
  seconde: IdVersion | null;
}

const magasin = creerMagasin<EtatBible>({ saisie: 'Psaume 23', version: 'LSG', seconde: null });

/** `?bible=Jean%203%3A16&version=LSG` : paramètres que la régie peut lire. */
export function hrefProjectionBible(ref: ReferenceBiblique, version: IdVersion, seconde: IdVersion | null): string {
  const params = new URLSearchParams({ bible: formaterReference(ref, 'fr'), version });
  if (seconde) params.set('seconde', seconde);
  return `/regie/?${params.toString()}`;
}

export function ColonneBible() {
  const t = useT('bibliotheque');
  const etat = useMagasin(magasin);
  const versions = SOURCE.versions();
  const reference = analyserReference(etat.saisie);

  return (
    <section aria-label={t.bible} className={styles.colonne}>
      <h2 className={`titre-oeuvre ${styles.titre}`}>{t.bible}</h2>
      <Champ
        libelle={t.reference}
        fond="surface"
        icone="bible"
        placeholder={t.referenceExemple}
        value={etat.saisie}
        onChange={(e) => magasin.ecrire({ ...etat, saisie: e.target.value })}
        autoComplete="off"
        aide={etat.saisie.trim() && !reference ? t.referenceInconnue : undefined}
      />
      <div className={styles.exemples}>
        {EXEMPLES.map((ex) => (
          <Bouton key={ex} taille="compacte" onClick={() => magasin.ecrire({ ...etat, saisie: ex })}>
            {ex}
          </Bouton>
        ))}
      </div>
      <fieldset className={styles.versions}>
        <legend className="meta">{t.version}</legend>
        {versions.map((v) => (
          <label key={v.id} className={styles.option}>
            <input
              type="radio"
              name="version-principale"
              checked={etat.version === v.id}
              onChange={() => magasin.ecrire({ ...etat, version: v.id, seconde: etat.seconde === v.id ? null : etat.seconde })}
            />
            {v.nom}
          </label>
        ))}
      </fieldset>
      <fieldset className={styles.versions}>
        <legend className="meta">{t.secondeVersion}</legend>
        <label className={styles.option}>
          <input type="radio" name="version-seconde" checked={etat.seconde === null} onChange={() => magasin.ecrire({ ...etat, seconde: null })} />
          {t.aucune}
        </label>
        {versions
          .filter((v) => v.id !== etat.version)
          .map((v) => (
            <label key={v.id} className={styles.option}>
              <input type="radio" name="version-seconde" checked={etat.seconde === v.id} onChange={() => magasin.ecrire({ ...etat, seconde: v.id })} />
              {v.nom}
            </label>
          ))}
      </fieldset>
      <p className={`meta ${styles.note}`}>{t.domainePublic}</p>
    </section>
  );
}

interface Passages {
  cle: string;
  principal: PassageBiblique | null;
  second: PassageBiblique | null;
}

export function LectureBible() {
  const t = useT('bibliotheque');
  const { langue } = useLangue();
  const etat = useMagasin(magasin);
  const reference = analyserReference(etat.saisie);
  const cle = reference ? `${formaterReference(reference, 'fr')}|${etat.version}|${etat.seconde ?? ''}` : '';
  const [passages, setPassages] = useState<Passages | null>(null);

  useEffect(() => {
    if (!reference) return;
    let actif = true;
    void Promise.all([
      SOURCE.lirePassage(etat.version, reference),
      etat.seconde ? SOURCE.lirePassage(etat.seconde, reference) : Promise.resolve(null),
    ]).then(([principal, second]) => actif && setPassages({ cle, principal, second }));
    return () => {
      actif = false;
    };
    // `cle` résume la référence et les versions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);

  if (!reference) {
    return <EtatCentre genre="vide" icone="bible" titre={t.bibleVide} texte={t.bibleVideTexte} />;
  }
  if (!passages || passages.cle !== cle) return <EtatCentre genre="chargement" />;

  const { principal, second } = passages;
  if (!principal) {
    return (
      <EtatCentre
        genre="vide"
        icone="bible"
        titre={formater(t.passageAbsent, { reference: formaterReference(reference, langue) })}
        texte={t.passageAbsentTexte}
      />
    );
  }

  const titre = formaterReference(reference, principal.version.langue);
  const echantillon = principal.version.echantillon || !!second?.version.echantillon;

  return (
    <>
      <div className={styles.entete}>
        <div className={styles.titres}>
          <div className={styles.origine}>{[principal.version.nom, second?.version.nom].filter(Boolean).join(' + ')}</div>
          <h1 className="titre-ecran">{titre}</h1>
          {echantillon && (
            <p className={styles.echantillon} role="note">
              <span className={`etiquette-etat ${styles.marque}`}>{t.echantillon}</span>
              {t.echantillonTexte}
            </p>
          )}
        </div>
        <Bouton variante="plein" icone="projeter" href={hrefProjectionBible(reference, etat.version, etat.seconde)}>
          {t.projeter}
        </Bouton>
      </div>
      <div className={[styles.corps, second ? styles.deuxColonnes : ''].filter(Boolean).join(' ')}>
        <Passage passage={principal} />
        {second && <Passage passage={second} />}
        {etat.seconde && !second && <p className="meta">{t.secondeAbsente}</p>}
      </div>
      {principal.incomplet && <p className={`meta ${styles.incomplet}`}>{t.passageIncomplet}</p>}
    </>
  );
}

function Passage({ passage }: { passage: PassageBiblique }) {
  return (
    <div lang={passage.version.langue} className={styles.passage}>
      {passage.versets.map((v) => (
        <p key={`${v.chapitre}:${v.numero}`} className={styles.verset}>
          {v.suscription && <span className={styles.suscription}>{v.suscription}</span>}
          <sup className={styles.numero}>{v.numero}</sup>
          {v.texte}
        </p>
      ))}
    </div>
  );
}
