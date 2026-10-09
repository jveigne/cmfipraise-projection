'use client';

/**
 * Lecture d'un chant (design 02) : en-tête (recueil et numéro, titre, ordre), actions
 * (favori, ajouter à une setlist, projeter), barre d'outils (accords, tonalité, taille),
 * puis les paroles.
 */
import { decouperChant, nomTonalite } from '@cmfi/projection';
import { useMemo, useState } from 'react';

import { Bouton, EtatCentre, Icone, Interrupteur } from '@/components/ui';
import { formater, useT } from '@/lib/i18n';

import { DialogueAjoutSetlist } from './DialogueAjoutSetlist';
import { useChant } from './donnees';
import { changerLecture, TAILLE_LECTURE, usePreferencesLecture } from './etat';
import { useFavoris } from './favoris';
import styles from './LectureChant.module.css';
import { ParolesChant } from './ParolesChant';
import { aDesAccords } from './texte';

export function LectureChant({ id }: { id: string }) {
  const t = useT('bibliotheque');
  const tc = useT('commun');
  const { statut, ouvert, reessayer } = useChant(id);
  const { accords, taille } = usePreferencesLecture();
  const { estFavori, basculer } = useFavoris();
  // Transposition propre au chant ouvert : elle repart de zéro quand on en change.
  const [transposition, setTransposition] = useState<{ id: string; demiTons: number }>({ id, demiTons: 0 });
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const demiTons = transposition.id === id ? transposition.demiTons : 0;

  const chant = ouvert?.chant ?? null;
  const ordre = useMemo(() => (chant ? decouperChant(chant, { lignesMax: 0 }).ordre : ''), [chant]);
  const avecAccords = useMemo(() => (chant ? aDesAccords(chant) : false), [chant]);

  if (statut === 'chargement') return <EtatCentre genre="chargement" titre={t.chargementChant} />;
  if (statut === 'erreur' || !chant || !ouvert) {
    return (
      <EtatCentre
        genre="erreur"
        titre={t.chantIntrouvable}
        texte={t.chantIntrouvableTexte}
        actions={
          <Bouton variante="secondaire" onClick={reessayer}>
            {tc.reessayer}
          </Bouton>
        }
      />
    );
  }

  const personnel = !!chant.ownerId;
  const favori = estFavori(chant.id);
  const tonaliteDeBase = chant.keyRootIndex;
  const libelleTonalite =
    tonaliteDeBase == null
      ? t.tonaliteInconnue
      : `${nomTonalite(tonaliteDeBase + demiTons, !!chant.keyIsMinor, 'fr')} (${nomTonalite(tonaliteDeBase + demiTons, !!chant.keyIsMinor, 'en')})`;
  const transpositionPossible = accords && avecAccords;

  const origine = personnel
    ? t.mesChants
    : [ouvert.recueil, chant.position > 0 ? formater(t.numero, { n: chant.position }) : null].filter(Boolean).join(' · ');
  const auteur = chant.artist ?? chant.author;
  const sousTitre = [auteur, ordre ? formater(t.ordre, { ordre }) : null].filter(Boolean).join(' · ');

  const transposer = (pas: number) => setTransposition({ id, demiTons: demiTons + pas });

  return (
    <>
      <div className={styles.entete}>
        <div className={styles.titres}>
          {origine && <div className={personnel ? styles.originePerso : styles.origine}>{origine}</div>}
          <h1 className="titre-ecran">{chant.title}</h1>
          {sousTitre && <div className={`meta ${styles.sousTitre}`}>{sousTitre}</div>}
        </div>
        <div className={styles.actions}>
          <Bouton
            iconeSeule
            aria-label={favori ? t.retirerFavori : t.ajouterFavori}
            aria-pressed={favori}
            onClick={() =>
              void basculer({
                id: chant.id,
                titre: chant.title,
                recueil: ouvert.recueil,
                numero: chant.position > 0 ? chant.position : null,
                langue: chant.language ?? null,
                personnel,
              })
            }
          >
            <Icone nom="coeur" taille={20} fill={favori ? 'currentColor' : 'none'} />
          </Bouton>
          <Bouton onClick={() => setAjoutOuvert(true)}>{t.ajouterSetlist}</Bouton>
          <Bouton variante="plein" icone="projeter" href={`/regie/?chant=${encodeURIComponent(chant.id)}`}>
            {t.projeter}
          </Bouton>
        </div>
      </div>

      <div className={styles.outils}>
        <Interrupteur
          coche={accords && avecAccords}
          surChangement={(coche) => changerLecture({ accords: coche })}
          libelle={t.accords}
          disposition="piste-avant"
          disabled={!avecAccords}
          aria-describedby={!avecAccords ? `${id}-sans-accords` : undefined}
        />
        {!avecAccords && (
          <span id={`${id}-sans-accords`} className="meta">
            {t.sansAccords}
          </span>
        )}
        <div role="group" aria-label={t.transposition} className={styles.groupe}>
          <span className="meta">{t.tonalite}</span>
          <button
            type="button"
            className={styles.pas}
            onClick={() => transposer(-1)}
            aria-label={t.transposerBas}
            disabled={!transpositionPossible}
          >
            −
          </button>
          <span className={styles.tonalite} aria-live="polite">
            {libelleTonalite}
          </span>
          <button
            type="button"
            className={styles.pas}
            onClick={() => transposer(1)}
            aria-label={t.transposerHaut}
            disabled={!transpositionPossible}
          >
            +
          </button>
        </div>
        <div role="group" aria-label={t.tailleTexte} className={styles.groupe}>
          <span className="meta">{t.taille}</span>
          <button
            type="button"
            className={`${styles.pas} ${styles.petitA}`}
            onClick={() => changerLecture({ taille: taille - TAILLE_LECTURE.pas })}
            aria-label={t.reduire}
            disabled={taille <= TAILLE_LECTURE.min}
          >
            A−
          </button>
          <button
            type="button"
            className={`${styles.pas} ${styles.grandA}`}
            onClick={() => changerLecture({ taille: taille + TAILLE_LECTURE.pas })}
            aria-label={t.agrandir}
            disabled={taille >= TAILLE_LECTURE.max}
          >
            A+
          </button>
        </div>
      </div>

      <div className={styles.corps}>
        <ParolesChant
          chant={chant}
          accords={accords && avecAccords}
          transposition={demiTons}
          taille={taille}
          // Accords en lettres (G, C, D7) comme sur le design, la tonalité en toutes lettres
          // au-dessus (« Sol (G) ») : c'est ce que lisent les musiciens des deux langues.
          notation="en"
        />
      </div>

      <DialogueAjoutSetlist ouvert={ajoutOuvert} surFermeture={() => setAjoutOuvert(false)} chant={chant} recueil={ouvert.recueil} />
    </>
  );
}
