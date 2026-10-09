'use client';

/**
 * La barre unique (Parcours-Saisie.dc.html) : le champ, dans l'en-tête, et le panneau
 * « ce que la barre a compris », à la place des diapositives tant qu'on tape.
 *
 * Accessibilité : motif combobox + listbox. ↑ ↓ déplacent l'option active (annoncée par
 * aria-activedescendant), Entrée ajoute, Échap ferme ; Tab entre dans les réglages d'une
 * option (autre résultat, seconde version, étendre).
 */
import { decouperChant, formaterReference, VERSIONS_ECHANTILLON } from '@cmfi/projection';
import { forwardRef, useState, type KeyboardEvent } from 'react';

import { Bouton, Icone } from '@/components/ui';
import { formater, pluriel, useLangue, useT } from '@/lib/i18n';
import { useEnLigne } from '@/lib/reseau';

import type { CandidatChant, RaisonCandidat } from './rechercheBarre';
import styles from './BarreUnique.module.css';
import type { Interpretation } from './interpretation';
import type { BarreUnique } from './useBarreUnique';

export const ID_LISTE_COMPRIS = 'regie-compris';
const idOption = (id: string) => `regie-compris-${id.replace(/[^a-z0-9]/gi, '_')}`;

// ─── Champ ───────────────────────────────────────────────────────────────────

export interface PropsChampBarreUnique {
  barre: BarreUnique;
  surAjouter: () => void;
}

export const ChampBarreUnique = forwardRef<HTMLInputElement, PropsChampBarreUnique>(function ChampBarreUnique({ barre, surAjouter }, ref) {
  const t = useT('regie');
  const active = barre.interpretations[barre.actif];

  function auClavier(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      if (barre.saisie) {
        e.preventDefault();
        e.stopPropagation();
        barre.vider();
      } else {
        e.currentTarget.blur();
      }
      return;
    }
    if (!barre.ouverte) return;
    const n = barre.interpretations.length;
    if (e.key === 'ArrowDown' && n > 0) {
      e.preventDefault();
      barre.setActif((barre.actif + 1) % n);
    } else if (e.key === 'ArrowUp' && n > 0) {
      e.preventDefault();
      barre.setActif((barre.actif - 1 + n) % n);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (barre.ajoutables.length > 0) surAjouter();
    }
  }

  return (
    <div className={styles.champ}>
      <label htmlFor="regie-barre" className="visuellement-masque">
        {t.barreLibelle}
      </label>
      <Icone nom="recherche" className={`${styles.loupe} ${barre.ouverte ? styles.loupeActive : ''}`} />
      <input
        ref={ref}
        id="regie-barre"
        type="text"
        role="combobox"
        aria-expanded={barre.ouverte}
        aria-controls={ID_LISTE_COMPRIS}
        aria-autocomplete="list"
        aria-activedescendant={barre.ouverte && active ? idOption(active.id) : undefined}
        aria-describedby="regie-barre-aide"
        autoComplete="off"
        spellCheck={false}
        placeholder={t.barreIndication}
        value={barre.saisie}
        onChange={(e) => barre.changerSaisie(e.target.value)}
        onKeyDown={auClavier}
        className={`${styles.saisie} ${barre.ouverte ? styles.saisieOuverte : ''}`}
      />
      <span id="regie-barre-aide" className="visuellement-masque">
        {t.barreAide}
      </span>
      {!barre.ouverte && (
        <span className={`touche ${styles.raccourci}`} aria-hidden="true">
          /
        </span>
      )}
    </div>
  );
});

// ─── Panneau « ce que la barre a compris » ───────────────────────────────────

const RAISONS: Record<RaisonCandidat, 'raisonTitreExact' | 'raisonNumero' | 'raisonDebutTitre' | 'raisonTitre' | 'raisonPremierVers' | 'raisonVers' | 'raisonServeur'> = {
  'titre-exact': 'raisonTitreExact',
  numero: 'raisonNumero',
  'debut-titre': 'raisonDebutTitre',
  titre: 'raisonTitre',
  'premier-vers': 'raisonPremierVers',
  vers: 'raisonVers',
  serveur: 'raisonServeur',
};

function MetaCandidat({ c }: { c: CandidatChant }) {
  const t = useT('regie');
  const morceaux = [c.recueil, c.numero ? formater(t.numero, { n: c.numero }) : null, t[RAISONS[c.raison]]].filter(Boolean);
  return <span className="meta">{morceaux.join(' · ')}</span>;
}

/** Puces de l'ordre d'enchaînement : « 1. R. 2. R. ». */
function PucesChant({ c }: { c: CandidatChant }) {
  const t = useT('regie');
  const { langue } = useLangue();
  if (!c.chant) return <span className="meta">{t.parolesALAjout}</span>;
  const { diapositives } = decouperChant(c.chant);
  const parties = diapositives.filter((d) => !d.morceau || d.morceau.index === 1);
  return (
    <div className={styles.puces}>
      {parties.map((d) => (
        <span key={d.id} className={`${styles.puce} ${d.genre === 'refrain' ? styles.puceRefrain : ''}`}>
          {d.libelle}
        </span>
      ))}
      <span className={`meta ${styles.puceTexte}`}>{pluriel(diapositives.length, t.diapositiveOrdreUne, t.diapositivesOrdre, langue)}</span>
    </div>
  );
}

function OptionChant({ i, barre }: { i: Extract<Interpretation, { genre: 'chant' }>; barre: BarreUnique }) {
  const t = useT('regie');
  const [autres, setAutres] = useState(false);
  const c = i.candidats[i.choix];
  if (!c) return null;
  return (
    <>
      <div className={styles.ligneCompris}>
        <span className="meta">« {i.segment} »</span>
        <span className={styles.fleche} aria-hidden="true">
          →
        </span>
        <span className="titre-oeuvre-liste">{c.titre}</span>
        <MetaCandidat c={c} />
      </div>
      {c.vers && c.raison !== 'premier-vers' && <p className={styles.extrait}>{c.vers}</p>}
      <PucesChant c={c} />
      {i.candidats.length > 1 && (
        <div className={styles.reglages}>
          <button type="button" className={styles.lien} aria-expanded={autres} onClick={() => setAutres((a) => !a)}>
            {formater(t.autresResultats, { n: i.candidats.length - 1 })}
          </button>
          {autres && (
            <ul className={styles.autres}>
              {i.candidats.map((x) => (
                <li key={x.id}>
                  <button
                    type="button"
                    aria-pressed={x.id === c.id}
                    className={styles.autre}
                    onClick={() => {
                      barre.choisirCandidat(i.id, x.id);
                      setAutres(false);
                    }}
                  >
                    <span className={styles.autreTitre}>{x.titre}</span>
                    <MetaCandidat c={x} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

function OptionBible({ i, barre }: { i: Extract<Interpretation, { genre: 'bible' }>; barre: BarreUnique }) {
  const t = useT('regie');
  const { langue } = useLangue();
  const version = VERSIONS_ECHANTILLON[i.version];
  const seconde = i.seconde ? VERSIONS_ECHANTILLON[i.seconde] : null;
  const autre = VERSIONS_ECHANTILLON[i.version === 'LSG' ? 'KJV' : 'LSG'];
  const p = i.passage;
  const premier = p?.versets[0]?.texte ?? '';
  const extrait = premier.length > 90 ? `${premier.slice(0, 88).trimEnd()}…` : premier;

  return (
    <>
      <div className={styles.ligneCompris}>
        <span className="meta">« {i.segment} »</span>
        <span className={styles.fleche} aria-hidden="true">
          →
        </span>
        <span className="titre-oeuvre-liste">{formaterReference(i.reference, langue)}</span>
        <span className="meta">
          {[version.nom, seconde?.nom].filter(Boolean).join(' + ')}
          {version.echantillon ? ` · ${t.echantillon}` : ''}
        </span>
      </div>
      {p ? (
        <>
          <p className={styles.extrait}>{extrait}</p>
          <span className="meta">
            {pluriel(p.versets.length, t.diapositiveVersetUne, t.diapositivesVerset, langue)}
            {p.incomplet ? ` · ${formater(t.passageIncomplet, { versets: p.versets.map((v) => v.numero).join(', ') })}` : ''}
          </span>
          <div className={styles.reglages}>
            <button type="button" className={styles.lien} onClick={() => barre.basculerSeconde(i.id)}>
              {seconde ? formater(t.retirerSeconde, { version: seconde.abrege }) : formater(t.ajouterSeconde, { version: autre.abrege })}
            </button>
            {i.extension && (
              <button type="button" className={styles.lien} onClick={() => void barre.etendre(i.id)}>
                {formater(t.etendreA, { reference: formaterReference(i.extension, langue, { abrege: true }) })}
              </button>
            )}
          </div>
        </>
      ) : (
        <p className={styles.indisponible}>{t.horsEchantillon}</p>
      )}
    </>
  );
}

function OptionInconnue({ i }: { i: Extract<Interpretation, { genre: 'inconnu' }> }) {
  const t = useT('regie');
  const enLigne = useEnLigne();
  return (
    <>
      <div className={styles.ligneCompris}>
        <span className="meta">« {i.segment} »</span>
        <span className={styles.fleche} aria-hidden="true">
          →
        </span>
        <span className={styles.rien}>{i.complet || !enLigne ? t.rienTrouve : t.rechercheServeur}</span>
      </div>
      {!enLigne && <p className="meta">{t.rechercheHorsLigne}</p>}
      {enLigne && i.complet && <p className="meta">{t.rienTrouveAide}</p>}
    </>
  );
}

export interface PropsPanneauCompris {
  barre: BarreUnique;
  surAjouter: () => void;
}

export function PanneauCompris({ barre, surAjouter }: PropsPanneauCompris) {
  const t = useT('regie');
  const { langue } = useLangue();
  const n = barre.ajoutables.length;
  const diapositives = barre.ajoutables.reduce((total, i) => {
    if (i.genre === 'bible') return total + (i.passage?.versets.length ?? 0);
    if (i.genre === 'chant') {
      const c = i.candidats[i.choix];
      return total + (c?.chant ? decouperChant(c.chant).diapositives.length : 0);
    }
    return total;
  }, 0);

  return (
    <div className={styles.colonne}>
      <section className={styles.panneau} aria-labelledby="regie-compris-titre">
        <div className={styles.entete}>
          <h2 id="regie-compris-titre" className="etiquette-etat">
            {pluriel(barre.interpretations.length, t.elementCompris, t.elementsCompris, langue)}
          </h2>
          <span className={styles.espace} />
          <span className="meta" role="status">
            {barre.enCours ? t.rechercheEnCours : pluriel(diapositives, t.diapositiveTotal, t.diapositivesTotal, langue)}
          </span>
        </div>

        <ul id={ID_LISTE_COMPRIS} role="listbox" aria-multiselectable="true" aria-label={t.comprisLibelle} className={styles.options}>
          {barre.interpretations.map((i, index) => {
            const ajoutable = i.genre === 'bible' ? !!i.passage : i.genre === 'chant';
            const inclus = ajoutable && !barre.exclus.has(i.id);
            const personnel = i.genre === 'chant' && !!i.candidats[i.choix]?.chant?.ownerId;
            return (
              <li
                key={i.id}
                id={idOption(i.id)}
                role="option"
                aria-selected={inclus}
                aria-disabled={!ajoutable || undefined}
                className={`${styles.option} ${index === barre.actif ? styles.optionActive : ''} ${inclus ? '' : styles.optionExclue}`}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={inclus}
                  disabled={!ajoutable}
                  aria-label={formater(inclus ? t.exclureOption : t.inclureOption, { segment: i.segment })}
                  className={`${styles.case} ${personnel ? styles.caseViolet : ''}`}
                  onClick={() => barre.basculerInclusion(i.id)}
                >
                  <Icone nom={i.genre === 'bible' ? 'bible' : i.genre === 'chant' ? 'musique' : 'info'} taille={18} />
                  {inclus && (
                    <span className={styles.coche} aria-hidden="true">
                      <Icone nom="coche" taille={12} epaisseur={2.4} />
                    </span>
                  )}
                </button>
                <div className={styles.corpsOption}>
                  {i.genre === 'chant' && <OptionChant i={i} barre={barre} />}
                  {i.genre === 'bible' && <OptionBible i={i} barre={barre} />}
                  {i.genre === 'inconnu' && <OptionInconnue i={i} />}
                </div>
              </li>
            );
          })}
        </ul>

        <div className={styles.pied}>
          <Bouton variante="plein" taille="grande" disabled={n === 0} onClick={surAjouter}>
            {n <= 1 ? t.ajouterUn : formater(t.ajouterN, { n })}
            <span className={styles.toucheEntree} aria-hidden="true">
              {t.toucheEntree}
            </span>
          </Bouton>
          <span className="meta">{t.barreAideVisible}</span>
        </div>
      </section>

      <section className={styles.aideComprend} aria-labelledby="regie-comprend-titre">
        <h2 id="regie-comprend-titre" className={`etiquette-etat ${styles.ardoise}`}>
          {t.comprendAussi}
        </h2>
        <div className={styles.exemples}>
          {(
            [
              ['exempleNumero', 'exempleNumeroAide'],
              ['exempleVers', 'exempleVersAide'],
              ['exempleReference', 'exempleReferenceAide'],
              ['exempleAbreviations', 'exempleAbreviationsAide'],
            ] as const
          ).map(([titre, aide]) => (
            <div key={titre} className={styles.exemple}>
              <span className={styles.exempleTitre}>{t[titre]}</span>
              <span className="meta">{t[aide]}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
