/**
 * Stockage des jetons d'authentification.
 *
 * Synchrone et minuscule (trois chaînes) : `localStorage` suffit et reste disponible avant
 * même qu'IndexedDB soit ouverte. Les CONTENUS, eux, vont dans IndexedDB (voir cache.ts).
 */
export type CleJeton = 'compte' | 'visiteur' | 'utilisateur';

export interface StockageJetons {
  lire(cle: CleJeton): string | null;
  /** `null` efface. */
  ecrire(cle: CleJeton, valeur: string | null): void;
}

/** Stockage en mémoire : tests, rendu statique, ou navigateur qui refuse localStorage. */
export function stockageMemoire(initial: Partial<Record<CleJeton, string>> = {}): StockageJetons {
  const valeurs = new Map<CleJeton, string>(Object.entries(initial) as [CleJeton, string][]);
  return {
    lire: (cle) => valeurs.get(cle) ?? null,
    ecrire: (cle, valeur) => {
      if (valeur === null) valeurs.delete(cle);
      else valeurs.set(cle, valeur);
    },
  };
}

/** Noms des clés localStorage : préfixe `auth_` comme sur le mobile. */
const CLES_NAVIGATEUR: Record<CleJeton, string> = {
  compte: 'auth_jeton',
  visiteur: 'auth_jeton_visiteur',
  utilisateur: 'auth_utilisateur',
};

/**
 * Stockage dans `localStorage`, avec repli en mémoire : en navigation privée stricte ou
 * site bloqué, `localStorage` lève une exception, et l'app doit continuer de projeter.
 */
export function stockageNavigateur(): StockageJetons {
  const memoire = stockageMemoire();
  const ls = (): Storage | null => {
    try {
      return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
      return null;
    }
  };
  return {
    lire(cle) {
      try {
        return ls()?.getItem(CLES_NAVIGATEUR[cle]) ?? memoire.lire(cle);
      } catch {
        return memoire.lire(cle);
      }
    },
    ecrire(cle, valeur) {
      memoire.ecrire(cle, valeur);
      try {
        const s = ls();
        if (!s) return;
        if (valeur === null) s.removeItem(CLES_NAVIGATEUR[cle]);
        else s.setItem(CLES_NAVIGATEUR[cle], valeur);
      } catch {
        // Quota ou accès refusé : la copie en mémoire suffit pour la session.
      }
    },
  };
}
