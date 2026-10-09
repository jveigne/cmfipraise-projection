'use client';

/**
 * Ajuste la taille du texte projeté pour qu'il tienne dans sa zone.
 *
 * L'échelle de projection (72 px à 1080) vaut pour un texte normal ; un verset long ou une
 * partie de six longues lignes peut déborder. On réduit alors, par dichotomie, un facteur
 * `--ajustement` posé sur la zone (jamais sous `minimum`), directement dans le DOM : aucun
 * rendu React supplémentaire, aucune boucle. Comme les tailles sont en unités de conteneur,
 * l'aperçu de la régie et la sortie trouvent le même facteur.
 */
import { useLayoutEffect, useRef, type RefObject } from 'react';

const ETAPES = 7;

function deborde(el: HTMLElement): boolean {
  return el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
}

function ajuster(el: HTMLElement, minimum: number) {
  el.style.setProperty('--ajustement', '1');
  if (!deborde(el)) return;
  let bas = minimum;
  let haut = 1;
  for (let i = 0; i < ETAPES; i++) {
    const milieu = (bas + haut) / 2;
    el.style.setProperty('--ajustement', String(milieu));
    if (deborde(el)) haut = milieu;
    else bas = milieu;
  }
  el.style.setProperty('--ajustement', String(bas));
}

export function useAjustementTexte<T extends HTMLElement>(cle: string, minimum = 0.55): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    ajuster(el, minimum);
    if (typeof ResizeObserver === 'undefined') return;
    // La fenêtre de sortie change de taille quand on la glisse sur le projecteur.
    let largeur = el.clientWidth;
    let hauteur = el.clientHeight;
    const observateur = new ResizeObserver(() => {
      if (el.clientWidth === largeur && el.clientHeight === hauteur) return;
      largeur = el.clientWidth;
      hauteur = el.clientHeight;
      ajuster(el, minimum);
    });
    observateur.observe(el);
    // Les polices arrivent après le premier rendu : la mesure change avec elles.
    void document.fonts?.ready.then(() => ref.current && ajuster(ref.current, minimum));
    return () => observateur.disconnect();
  }, [cle, minimum]);

  return ref;
}
