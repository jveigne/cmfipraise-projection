'use client';

/**
 * Détails affichés pour chaque élément de la setlist : origine, parties (« 1. R. 2. R. »
 * ou numéros de versets), nombre de diapositives. Ils viennent du chant complet (copie
 * hors-ligne, sinon serveur) ou de la source biblique, et sont mémorisés : réordonner la
 * liste ne relit rien.
 */
import type { ElementSetlist } from '@cmfi/api';
import { analyserReference, decouperChant, nomTonalite, sourceEchantillon, type BibleSource } from '@cmfi/projection';
import { useEffect, useState } from 'react';

import { obtenirChant } from '@/components/bibliotheque/donnees';
import { formater } from '@/lib/i18n';

export interface PuceElement {
  libelle: string;
  refrain: boolean;
}

export type DetailElement =
  | { statut: 'pret'; genre: 'chant'; recueil: string | null; tonalite: number | null; personnel: boolean; puces: PuceElement[]; diapositives: number }
  | { statut: 'pret'; genre: 'bible'; versions: string[]; puces: PuceElement[]; diapositives: number; echantillon: boolean }
  /** Chant illisible (hors-ligne et jamais ouvert) ou passage absent de la source. */
  | { statut: 'absent' };

const SOURCE: BibleSource = sourceEchantillon;

export function cleElement(e: ElementSetlist): string {
  return e.type === 'chant' ? `chant:${e.chantId}` : `bible:${e.reference}|${e.version}|${e.secondeVersion ?? ''}`;
}

const memoire = new Map<string, DetailElement>();
const enCours = new Map<string, Promise<void>>();

async function calculer(e: ElementSetlist): Promise<DetailElement> {
  if (e.type === 'chant') {
    try {
      const { chant, recueil } = await obtenirChant(e.chantId);
      const parties = decouperChant(chant, { lignesMax: 0 }).diapositives;
      return {
        statut: 'pret',
        genre: 'chant',
        recueil: recueil ?? e.recueil ?? null,
        tonalite: e.tonalite ?? chant.keyRootIndex ?? null,
        personnel: !!chant.ownerId,
        puces: parties.map((p) => ({ libelle: p.libelle, refrain: p.genre === 'refrain' })),
        diapositives: decouperChant(chant).diapositives.length,
      };
    } catch {
      return { statut: 'absent' };
    }
  }
  const reference = analyserReference(e.reference);
  if (!reference) return { statut: 'absent' };
  const versions = SOURCE.versions();
  const version = versions.find((v) => v.id === e.version);
  if (!version) return { statut: 'absent' };
  const principal = await SOURCE.lirePassage(version.id, reference).catch(() => null);
  if (!principal) return { statut: 'absent' };
  const seconde = e.secondeVersion ? versions.find((v) => v.id === e.secondeVersion) : undefined;
  return {
    statut: 'pret',
    genre: 'bible',
    versions: [principal.version.nom, seconde?.nom].filter((n): n is string => !!n),
    puces: principal.versets.map((v) => ({ libelle: String(v.numero), refrain: false })),
    diapositives: principal.versets.length,
    echantillon: principal.version.echantillon,
  };
}

/** Détails des éléments, par clé (`cleElement`) ; absents tant qu'ils se chargent. */
export function useDetailsElements(elements: readonly ElementSetlist[]): Map<string, DetailElement> {
  const [, setVersion] = useState(0);
  const cles = elements.map(cleElement).join('\n');

  useEffect(() => {
    let actif = true;
    for (const e of elements) {
      const cle = cleElement(e);
      if (memoire.has(cle) || enCours.has(cle)) continue;
      const promesse = calculer(e).then((d) => {
        memoire.set(cle, d);
        enCours.delete(cle);
        if (actif) setVersion((n) => n + 1);
      });
      enCours.set(cle, promesse);
    }
    // Un calcul lancé par un autre rendu finit aussi par rafraîchir celui-ci.
    void Promise.all([...enCours.values()]).then(() => actif && setVersion((n) => n + 1));
    return () => {
      actif = false;
    };
    // `cles` résume `elements` : l'ordre seul ne relance rien.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cles]);

  return memoire;
}

/** « Recueil CMFI · n° 4 · Si♭ », « Louis Segond 1910 + King James ». */
export function metaElement(
  e: ElementSetlist,
  d: DetailElement | undefined,
  textes: { numero: string; monChant: string; absent: string; absentBible: string },
  langue: 'fr' | 'en'
): string {
  if (e.type === 'bible') {
    if (!d) return e.version;
    if (d.statut === 'absent') return textes.absentBible;
    return d.genre === 'bible' ? d.versions.join(' + ') : '';
  }
  if (d?.statut === 'absent') return textes.absent;
  const detail = d?.statut === 'pret' && d.genre === 'chant' ? d : null;
  const tonalite = detail?.tonalite ?? e.tonalite ?? null;
  return [
    detail?.personnel ? textes.monChant : (detail?.recueil ?? e.recueil),
    !detail?.personnel && e.numero ? formater(textes.numero, { n: e.numero }) : null,
    tonalite != null ? nomTonalite(tonalite, false, langue) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}
