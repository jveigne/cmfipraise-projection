'use client';

/**
 * Ce que voit la salle. Le MÊME composant rend la sortie plein écran, l'aperçu « Sortie »
 * de la régie et la vignette « À suivre » : l'aperçu est donc exactement la sortie.
 *
 * Toutes les tailles sont en unités de conteneur (`cqh`, `cqw`) calculées depuis l'échelle
 * de projection de @cmfi/design (72 px pour 1080 de haut) : proportionnelles à la hauteur
 * de l'écran, quelle que soit sa résolution, et identiques en miniature.
 *
 * Écran noir = noir pur, sans rien : ni QR, ni référence, ni logo.
 */
import { HAUTEUR_REFERENCE_PROJECTION, TypoProjection } from '@cmfi/design';
import {
  contenuSortie,
  diapositiveEnDirect,
  VERSIONS_ECHANTILLON,
  type ContenuSortie,
  type Diapositive,
  type EtatProjection,
  type IdVersion,
  type ThemeSortie,
} from '@cmfi/projection';
import type { CSSProperties, ReactNode } from 'react';

import { TraceQr } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { useUrlMedia } from '@/lib/medias';

import styles from './SurfaceProjection.module.css';
import { useAjustementTexte } from './useAjustementTexte';

export type ModeSurface = 'sortie' | 'apercu' | 'miniature';

export interface PropsSurfaceProjection {
  contenu: ContenuSortie;
  diapositive: Diapositive | null;
  /** Titre de l'élément (« Grâce infinie »), pour l'étiquette d'un chant. */
  titreElement: string | null;
  theme: ThemeSortie;
  bilingue: boolean;
  mode: ModeSurface;
  /** Adresse du QR « suivre » ; null = pas de QR. */
  urlQr?: string | null;
  /** Aperçu seulement : texte posé sur l'écran noir (« Écran noir — B pour rétablir »). */
  messageEcranNoir?: ReactNode;
  className?: string;
}

/** Props d'une surface qui montre l'état de projection tel quel. */
export function propsDepuisEtat(etat: EtatProjection): Pick<PropsSurfaceProjection, 'contenu' | 'diapositive' | 'titreElement' | 'theme' | 'bilingue'> {
  return {
    contenu: contenuSortie(etat),
    diapositive: diapositiveEnDirect(etat),
    titreElement: etat.element?.titre ?? null,
    theme: etat.theme,
    bilingue: etat.bilingue,
  };
}

/** Taille d'un rôle de projection en unités de hauteur de conteneur. */
function cqh(role: keyof typeof TypoProjection, facteur = 1): string {
  return `${((TypoProjection[role].taille / HAUTEUR_REFERENCE_PROJECTION) * 100 * facteur).toFixed(3)}cqh`;
}

/** « Jean 3:16 · LSG » → { lieu: « Jean 3:16 », version: « Louis Segond 1910 » }. */
function decomposerReference(reference: string | null): { lieu: string; version: string } | null {
  if (!reference) return null;
  const separateur = reference.lastIndexOf(' · ');
  if (separateur < 0) return { lieu: reference, version: '' };
  const lieu = reference.slice(0, separateur);
  const abrege = reference.slice(separateur + 3);
  const version = VERSIONS_ECHANTILLON[abrege as IdVersion]?.nom ?? abrege;
  return { lieu, version };
}

function Lignes({ lignes }: { lignes: Diapositive['lignes'] }) {
  return (
    <>
      {lignes.map((l, i) => (
        <span key={i} className={styles.ligne}>
          {l.texte}
        </span>
      ))}
    </>
  );
}

type Disposition = 'paroles' | 'bilingue' | 'verset' | 'double';

function disposition(d: Diapositive, bilingue: boolean): Disposition {
  const seconde = bilingue && !!d.lignesSecondes && d.lignesSecondes.length > 0;
  if (d.genre === 'verset') return seconde ? 'double' : 'verset';
  return seconde ? 'bilingue' : 'paroles';
}

export function SurfaceProjection({
  contenu,
  diapositive,
  titreElement,
  theme,
  bilingue,
  mode,
  urlQr,
  messageEcranNoir,
  className,
}: PropsSurfaceProjection) {
  const t = useT('sortie');
  const urlFond = useUrlMedia(theme.fond === 'image' ? theme.imageId : null);
  const fondImage = theme.fond === 'image' && !!urlFond;

  const d = contenu === 'texte' ? diapositive : null;
  const dispo = d ? disposition(d, bilingue) : null;
  const echelle = theme.echelleTexte * (mode === 'miniature' ? 1.35 : 1);
  const cleAjustement = `${d?.id ?? contenu}|${dispo}|${echelle}|${d?.lignes.map((l) => l.texte).join('/') ?? ''}`;
  const zone = useAjustementTexte<HTMLDivElement>(cleAjustement);

  const variables = {
    '--t-paroles': cqh('paroles', echelle),
    '--t-paroles-bilingue': cqh('parolesBilingue', echelle),
    '--t-seconde': cqh('secondeLangue', echelle),
    '--t-verset-double': cqh('versetDouble', echelle),
    '--t-reference': cqh('reference'),
    '--interligne-paroles': TypoProjection.paroles.interligne,
    '--interligne-seconde': TypoProjection.secondeLangue.interligne,
    '--interligne-verset': TypoProjection.versetDouble.interligne,
    ...(urlFond ? { '--image-fond': `url("${urlFond}")`, '--voile': String(theme.voile) } : {}),
  } as CSSProperties;

  const classes = [
    styles.surface,
    styles[mode],
    contenu === 'noir' ? styles.noir : theme.fond === 'noir' ? styles.fondNoir : fondImage ? styles.fondImage : styles.fondNuit,
    theme.graisse === 'grasse' ? styles.grasse : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  // Écran noir : rien d'autre que du noir. L'aperçu de la régie peut seulement le dire.
  if (contenu === 'noir') {
    return (
      <div className={classes} style={variables}>
        {mode === 'apercu' && messageEcranNoir && <span className={styles.messageNoir}>{messageEcranNoir}</span>}
      </div>
    );
  }

  const decor = mode !== 'miniature';
  const refs = d?.genre === 'verset' ? decomposerReference(d.reference) : null;
  const refsSecondes = d?.genre === 'verset' ? decomposerReference(d.referenceSeconde) : null;
  const montrerQr = decor && contenu === 'texte' && theme.afficherQr && !!urlQr && dispo !== 'double';

  return (
    <div className={classes} style={variables}>
      {fondImage && <span className={styles.voile} aria-hidden="true" />}

      {contenu === 'logo' && (
        <p className={styles.logo}>{t.logo}</p>
      )}

      {d && dispo && (
        <div ref={zone} className={`${styles.zone} ${styles[dispo]}`} aria-live={mode === 'sortie' ? 'polite' : undefined}>
          {dispo === 'paroles' && (
            <p className={`${styles.paroles} ${d.genre === 'refrain' ? styles.refrain : ''}`}>
              <Lignes lignes={d.lignes} />
            </p>
          )}

          {dispo === 'bilingue' && (
            <>
              <p className={`${styles.paroles} ${styles.principale} ${d.genre === 'refrain' ? styles.refrain : ''}`}>
                <Lignes lignes={d.lignes} />
              </p>
              <span className={styles.separateur} aria-hidden="true" />
              <p className={`${styles.seconde} ${d.genre === 'refrain' ? styles.refrain : ''}`}>
                <Lignes lignes={d.lignesSecondes ?? []} />
              </p>
            </>
          )}

          {dispo === 'verset' && (
            <div className={styles.verset}>
              {d.suscription && <p className={styles.suscription}>{d.suscription}</p>}
              <p className={styles.texteVerset}>
                <Lignes lignes={d.lignes} />
              </p>
            </div>
          )}

          {dispo === 'double' && (
            <div className={styles.colonnes}>
              <div className={styles.colonne}>
                {refs?.version && <p className={styles.version}>{refs.version}</p>}
                {d.suscription && <p className={styles.suscription}>{d.suscription}</p>}
                <p className={styles.texteDouble}>
                  <Lignes lignes={d.lignes} />
                </p>
              </div>
              <div className={`${styles.colonne} ${styles.colonneSeconde}`}>
                {refsSecondes?.version && <p className={styles.version}>{refsSecondes.version}</p>}
                <p className={styles.texteDouble}>
                  <Lignes lignes={d.lignesSecondes ?? []} />
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {decor && d && theme.afficherReference && d.genre !== 'verset' && titreElement && (
        <p className={styles.etiquette}>
          {titreElement} · {d.libelle}
        </p>
      )}

      {decor && d && theme.afficherReference && refs && (
        <p className={styles.reference}>
          {dispo === 'double' && refsSecondes ? `${refs.lieu} · ${refsSecondes.lieu}` : d.reference}
        </p>
      )}

      {montrerQr && urlQr && (
        <div className={`${styles.qr} ${dispo === 'bilingue' ? styles.qrCompact : ''}`}>
          {dispo !== 'bilingue' && (
            <p className={styles.qrTexte}>
              <span className={styles.ligne}>{t.suivezLigne1}</span>
              <span className={styles.ligne}>{t.suivezLigne2}</span>
            </p>
          )}
          <span className={styles.qrCadre}>
            <TraceQr valeur={urlQr} libelle={t.qrLibelle} className={styles.qrCode} />
          </span>
        </div>
      )}
    </div>
  );
}
