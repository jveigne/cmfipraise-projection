'use client';

/**
 * Paroles d'un chant dans l'ordre d'enchaînement : couplets numérotés « 1. », refrains
 * « R. » en vraie italique, accords au-dessus de la syllabe où ils tombent.
 *
 * Le découpage vient de @cmfi/projection (`decouperChant`, sans coupe des parties longues) :
 * la lecture et la projection montrent exactement le même ordre.
 */
import type { ChantDTO } from '@cmfi/api';
import { decouperChant, nomAccord, type Notation } from '@cmfi/projection';
import { useMemo, type CSSProperties } from 'react';

import { useT } from '@/lib/i18n';

import styles from './ParolesChant.module.css';
import { segmenterLigne } from './texte';

export interface PropsParolesChant {
  chant: ChantDTO;
  accords: boolean;
  /** Demi-tons. */
  transposition: number;
  /** Taille des paroles en px. */
  taille: number;
  notation: Exclude<Notation, 'nns'>;
}

export function ParolesChant({ chant, accords, transposition, taille, notation }: PropsParolesChant) {
  const t = useT('bibliotheque');
  const parties = useMemo(() => decouperChant(chant, { lignesMax: 0 }).diapositives, [chant]);
  const tonalite = chant.keyRootIndex ?? 0;

  if (parties.length === 0) {
    return <p className={styles.vide}>{t.parolesAbsentes}</p>;
  }

  return (
    <div className={styles.paroles} style={{ '--taille-lecture': `${taille}px` } as CSSProperties}>
      {parties.map((partie) => {
        const refrain = partie.genre === 'refrain';
        return (
          <section
            key={partie.id}
            className={[styles.partie, refrain ? styles.refrain : '', accords ? styles.avecAccords : ''].filter(Boolean).join(' ')}
            aria-label={refrain ? t.refrain : `${t.couplet} ${partie.numero ?? ''}`.trim()}
          >
            <span className={styles.libelle} aria-hidden="true">
              {partie.libelle}
            </span>
            <div className={styles.lignes}>
              {partie.lignes.map((ligne, i) => {
                if (!accords || !ligne.accords || ligne.accords.length === 0) {
                  return (
                    <p key={i} className={styles.ligne}>
                      {ligne.texte}
                    </p>
                  );
                }
                const segments = segmenterLigne(ligne.texte, ligne.accords);
                return (
                  <p key={i} className={styles.ligne}>
                    {/* Les lecteurs d'écran lisent la ligne entière, pas des syllabes coupées. */}
                    <span className="visuellement-masque">{ligne.texte}</span>
                    <span className={styles.segments} aria-hidden="true">
                      {segments.map((s, k) => (
                        <span key={k} className={styles.segment}>
                          <span className={`accord ${styles.accord}`}>
                            {s.accord ? nomAccord(s.accord, { tonalite, transposition, notation }) : ' '}
                          </span>
                          <span className={styles.texte}>{s.texte || ' '}</span>
                        </span>
                      ))}
                    </span>
                  </p>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
