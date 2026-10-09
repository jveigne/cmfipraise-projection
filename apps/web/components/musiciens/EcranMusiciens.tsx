'use client';

/**
 * Écran des musiciens (design 05) : paroles ET accords de la partie en cours, la partie
 * suivante, la structure du chant et l'ordre du culte. Surface nuit — c'est une sortie de
 * projection, pas l'interface. L'or ne marque que la partie en cours ; le bleu de nuit
 * (accordNuit) marque les accords et la suivante.
 *
 * Il ne possède rien : il écoute la régie sur le canal de projection et demande l'état à
 * l'ouverture. Si la régie se tait, il garde la dernière image (le culte continue).
 */
import type { AccordDTO } from '@cmfi/api';
import {
  nomAccord,
  nomTonalite,
  ouvrirCanal,
  tonaliteJouee,
  type Diapositive,
  type ElementProjete,
  type EtatProjection,
  type Notation,
} from '@cmfi/projection';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { useReglages } from '@/components/reglages/stockage';
import { Icone } from '@/components/ui';
import { formater, useLangue, useT, type Langue } from '@/lib/i18n';
import { usePlateforme } from '@/lib/plateforme';

import styles from './EcranMusiciens.module.css';
import { aDesAccords, joliNomMusical, segmenterLigne } from './segments';

type Nommer = (a: AccordDTO) => string;

function nommeurPour(element: Pick<ElementProjete, 'tonalite' | 'transposition'> | null, notation: Notation): Nommer {
  const tonalite = element?.tonalite?.racine ?? 0;
  const transposition = element?.transposition ?? 0;
  return (a) => joliNomMusical(nomAccord(a, { tonalite, transposition, notation }));
}

function nomTon(t: { racine: number; mineur: boolean } | null, langue: Langue): string | null {
  return t ? joliNomMusical(nomTonalite(t.racine, t.mineur, langue)) : null;
}

/** Une partie : rangée d'accords au-dessus de chaque morceau de vers. */
function Lignes({ diapositive, nommer, variante }: { diapositive: Diapositive; nommer: Nommer | null; variante: 'courante' | 'suivante' }) {
  const avecAccords = !!nommer && aDesAccords(diapositive.lignes);
  const refrain = diapositive.genre === 'refrain';
  return (
    <div className={variante === 'courante' ? styles.lignesCourantes : styles.lignesSuivantes}>
      {diapositive.lignes.map((ligne, i) => {
        const segments = avecAccords && nommer ? segmenterLigne(ligne, nommer) : [{ accord: '', texte: ligne.texte }];
        return (
          <div key={i} className={styles.ligne}>
            {segments.map((s, k) => (
              <span key={k} className={styles.segment}>
                {avecAccords && (
                  <span className={styles.accord} aria-hidden={s.accord === '' ? true : undefined}>
                    {s.accord || ' '}
                  </span>
                )}
                <span className={[styles.texte, refrain ? styles.italique : ''].filter(Boolean).join(' ')}>{s.texte}</span>
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function usePleinEcran(): boolean {
  return useSyncExternalStore(
    (r) => {
      document.addEventListener('fullscreenchange', r);
      return () => document.removeEventListener('fullscreenchange', r);
    },
    () => !!document.fullscreenElement,
    () => false
  );
}

export function EcranMusiciens() {
  const t = useT('musiciens');
  const { langue } = useLangue();
  const [reglages] = useReglages();
  const plateforme = usePlateforme();
  const pleinEcran = usePleinEcran();
  const [etat, setEtat] = useState<EtatProjection | null>(null);
  const [canalDisponible, setCanalDisponible] = useState(true);

  // Écoute de la régie : demande l'état à l'ouverture, garde le plus récent.
  useEffect(() => {
    const canal = ouvrirCanal('musiciens');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- BroadcastChannel n'existe que côté client
    setCanalDisponible(canal.disponible);
    const arreter = canal.ecouter((m, enveloppe) => {
      // Régie (re)lancée : on se réannonce et on redemande l'état, comme la sortie.
      if (m.type === 'presence' && enveloppe.role === 'regie' && m.present) {
        canal.envoyer({ type: 'presence', present: true, largeur: window.innerWidth, hauteur: window.innerHeight });
        canal.envoyer({ type: 'demande-etat' });
        return;
      }
      if (m.type !== 'etat') return;
      setEtat((avant) => (!avant || m.etat.misAJourLe >= avant.misAJourLe ? m.etat : avant));
    });
    canal.envoyer({ type: 'presence', present: true, largeur: window.innerWidth, hauteur: window.innerHeight });
    canal.envoyer({ type: 'demande-etat' });
    const auDepart = () => canal.envoyer({ type: 'presence', present: false });
    window.addEventListener('pagehide', auDepart);
    return () => {
      window.removeEventListener('pagehide', auDepart);
      auDepart();
      arreter();
      canal.fermer();
    };
  }, []);

  // Un écran de scène ne doit pas s'éteindre au milieu d'un chant.
  useEffect(() => {
    let verrou: { liberer(): Promise<void> } | null = null;
    let actif = true;
    void plateforme.empecherVeille().then((v) => {
      if (actif) verrou = v;
      else void v?.liberer();
    });
    return () => {
      actif = false;
      void verrou?.liberer();
    };
  }, [plateforme]);

  const element = etat?.element ?? null;
  const courante = element?.diapositives[etat?.index ?? 0] ?? null;
  const suivante = etat?.suivante ?? null;
  const programme = etat?.programme ?? null;

  useEffect(() => {
    document.title = element ? formater(t.titreDocument, { titre: element.titre }) : t.musiciens;
  }, [element, t]);

  const nommer = useMemo(() => (element ? nommeurPour(element, reglages.notationAccords) : null), [element, reglages.notationAccords]);

  if (!element || !courante || !etat) {
    return (
      <main className={`${styles.ecran} ${styles.attente}`}>
        <Icone nom="musique" taille={48} epaisseur={1.1} className={styles.iconeAttente} />
        <h1 className={styles.titreAttente}>{t.attenteTitre}</h1>
        <p className={styles.texteAttente}>{canalDisponible ? t.attenteTexte : t.canalIndisponible}</p>
      </main>
    );
  }

  const tonJouee = nomTon(tonaliteJouee(element), langue);
  const tonOriginale = element.transposition ? nomTon(element.tonalite, langue) : null;
  const indexSuivante = suivante && !suivante.changeElement ? element.diapositives.findIndex((d) => d.id === suivante.diapositive.id) : -1;
  const etatSalle = etat.ecranNoir ? t.salleEcranNoir : etat.logo ? t.salleLogo : etat.texteMasque ? t.salleTexteMasque : null;
  const finDeSetlist = !suivante && programme && programme.position === programme.elements.length - 1;

  return (
    <main className={styles.ecran}>
      <header className={styles.entete}>
        <div className={styles.titreBloc}>
          <span className={styles.sousTitre}>
            {programme && programme.position >= 0
              ? formater(t.musiciensPosition, { position: programme.position + 1, total: programme.elements.length })
              : t.musiciens}
          </span>
          <h1 className={styles.titre}>{element.titre}</h1>
        </div>
        <span className={styles.espace} />
        {etatSalle && (
          <span className={styles.etatSalle} role="status">
            {etatSalle}
          </span>
        )}
        {tonJouee && (
          <div className={styles.cases}>
            <div className={styles.case}>
              <span className={styles.caseLibelle}>{t.tonalite}</span>
              <span className={`${styles.caseValeur} ${styles.caseAccord}`}>{tonJouee}</span>
            </div>
            {tonOriginale && (
              <div className={styles.case}>
                <span className={styles.caseLibelle}>{t.original}</span>
                <span className={`${styles.caseValeur} ${styles.caseDiscrete}`}>{tonOriginale}</span>
              </div>
            )}
          </div>
        )}
        {!pleinEcran && (
          <button
            type="button"
            className={styles.boutonPleinEcran}
            aria-label={t.pleinEcran}
            title={t.pleinEcran}
            onClick={() => void document.documentElement.requestFullscreen?.().catch(() => {})}
          >
            <Icone nom="pleinEcran" taille={20} />
          </button>
        )}
      </header>

      <div className={styles.corps}>
        <div className={styles.principal}>
          <section className={styles.partieCourante} aria-labelledby="musiciens-partie-courante">
            <div className={styles.partieEntete}>
              <span className={styles.badgeEnCours}>{t.enCours}</span>
              <h2 id="musiciens-partie-courante" className={styles.libelleCourant} aria-live="polite">
                {courante.libelle}
              </h2>
              {courante.reference && <span className={styles.reference}>{courante.reference}</span>}
            </div>
            <Lignes diapositive={courante} nommer={nommer} variante="courante" />
          </section>

          {(suivante || finDeSetlist) && (
            <section className={styles.partieSuivante} aria-labelledby="musiciens-partie-suivante">
              <div className={styles.partieEntete}>
                <span id="musiciens-partie-suivante" className={styles.badgeSuivante}>
                  {suivante ? t.partieSuivante : t.finSetlist}
                </span>
                {suivante && <span className={styles.libelleSuivant}>{suivante.diapositive.libelle}</span>}
                {suivante?.changeElement && (
                  <span className={styles.ensuite}>{formater(t.ensuite, { titre: suivante.titreElement })}</span>
                )}
              </div>
              {suivante && (
                // Les accords d'un AUTRE chant dépendent de sa tonalité, que l'état ne porte pas :
                // on n'en montre que le texte.
                <Lignes diapositive={suivante.diapositive} nommer={suivante.changeElement ? null : nommer} variante="suivante" />
              )}
            </section>
          )}
        </div>

        <aside className={styles.cote}>
          {element.diapositives.length > 1 && (
            <div className={styles.bloc}>
              <h2 className={styles.blocTitre}>{t.structure}</h2>
              <ol className={styles.structure}>
                {element.diapositives.map((d, i) => {
                  const etatPilule = i === etat.index ? 'courante' : i === indexSuivante ? 'suivante' : i < etat.index ? 'passee' : 'avenir';
                  const libelle = d.morceau ? `${d.libelle}${d.morceau.index}` : d.libelle;
                  const aria =
                    etatPilule === 'courante' ? t.partieEnCoursAria : etatPilule === 'suivante' ? t.partieSuivanteAria : t.partieAria;
                  return (
                    <li
                      key={d.id}
                      className={[styles.pilule, styles[`pilule_${etatPilule}`], d.genre === 'refrain' ? styles.italique : ''].filter(Boolean).join(' ')}
                      aria-label={formater(aria, { libelle: d.libelle })}
                      aria-current={etatPilule === 'courante' ? 'step' : undefined}
                    >
                      {libelle}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {programme && programme.elements.length > 0 && (
            <div className={styles.bloc}>
              <h2 className={styles.blocTitre}>{t.ordreCulte}</h2>
              <ol className={styles.ordre}>
                {programme.elements.map((e, i) => {
                  const enCours = i === programme.position;
                  const passe = programme.position >= 0 && i < programme.position;
                  const ton = nomTon(e.tonalite, langue);
                  const meta =
                    e.genre === 'bible'
                      ? `${t.lecture} · ${t.pasAccords}`
                      : [ton, enCours ? t.enCoursMeta : passe ? t.fait : e.meta].filter(Boolean).join(' · ');
                  return (
                    <li key={e.id} className={styles.ordreLigne} aria-current={enCours ? 'step' : undefined}>
                      <span className={styles.ordreNumero}>{i + 1}</span>
                      <span className={styles.ordreCorps}>
                        <span className={[styles.ordreTitre, passe ? styles.ordrePasse : ''].filter(Boolean).join(' ')}>{e.titre}</span>
                        <span className={styles.ordreMeta}>{meta}</span>
                      </span>
                      {enCours && <span className={styles.pointEnCours} aria-hidden="true" />}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
