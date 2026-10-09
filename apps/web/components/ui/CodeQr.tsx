'use client';

/**
 * Code QR réel (lib qrcode), dessiné en SVG d'un seul tracé : net à toute taille, imprimable,
 * sans canvas, et quelques centaines de nœuds de moins qu'une grille de cases.
 *
 *  - `CodeQr`  : encre sur blanc dans un cadre à filet (partage de setlist, appairage).
 *  - `TraceQr` : le tracé seul, en `currentColor`, pour la sortie projetée qui pose son
 *    propre fond ivoire.
 * Pas de couleur de marque : un QR doit avant tout se lire.
 */
import { create } from 'qrcode';
import { useMemo } from 'react';

import styles from './CodeQr.module.css';

/** Tracé des modules sombres (une case = 1 unité du viewBox) ; null si le texte est trop long. */
export function tracerQr(valeur: string): { cote: number; trace: string } | null {
  try {
    // Niveau M : résiste à un reflet sur l'écran projeté sans grossir le code.
    const { modules } = create(valeur, { errorCorrectionLevel: 'M' });
    const morceaux: string[] = [];
    for (let l = 0; l < modules.size; l++) {
      for (let c = 0; c < modules.size; c++) {
        if (modules.get(l, c)) morceaux.push(`M${c} ${l}h1v1h-1z`);
      }
    }
    return { cote: modules.size, trace: morceaux.join('') };
  } catch {
    // Adresse trop longue pour un QR : rien plutôt qu'un code faux.
    return null;
  }
}

export interface PropsTraceQr {
  valeur: string;
  /** Libellé lu par les lecteurs d'écran ; sans lui, le code est décoratif. */
  libelle?: string;
  className?: string;
}

export function TraceQr({ valeur, libelle, className }: PropsTraceQr) {
  const qr = useMemo(() => tracerQr(valeur), [valeur]);
  if (!qr) return null;
  return (
    <svg
      className={className}
      viewBox={`0 0 ${qr.cote} ${qr.cote}`}
      shapeRendering="crispEdges"
      focusable="false"
      {...(libelle ? { role: 'img', 'aria-label': libelle } : { 'aria-hidden': true })}
    >
      <path d={qr.trace} fill="currentColor" />
    </svg>
  );
}

export interface PropsCodeQr {
  /** Texte encodé, en général une adresse. */
  valeur: string;
  /** Libellé lu par les lecteurs d'écran (« Code QR menant à … »). */
  libelle: string;
  /** Côté en px, cadre compris. */
  taille?: number;
  /** Marge blanche autour des modules, en px (zone de silence). */
  marge?: number;
  className?: string;
}

export function CodeQr({ valeur, libelle, taille = 220, marge = 12, className }: PropsCodeQr) {
  return (
    <div className={[styles.cadre, className ?? ''].filter(Boolean).join(' ')} style={{ width: taille, height: taille, padding: marge }}>
      <TraceQr valeur={valeur} libelle={libelle} className={styles.svg} />
    </div>
  );
}
