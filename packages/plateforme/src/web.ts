/**
 * Implémentation navigateur de la plateforme.
 *
 * Un onglet ne possède pas les écrans : la sortie est une fenêtre que l'on place sur le
 * projecteur. Avec la Window Management API (Chrome, Edge), on sait l'y ouvrir directement ;
 * sans elle, l'utilisateur la glisse puis passe en plein écran depuis la page de sortie.
 */
import type { NomSortie } from './contrat';
import { ErreurPlateforme, type Ecran, type OptionsSortie, type Plateforme, type VerrouVeille } from './types';

// ─── Window Management API (absente de lib.dom) ──────────────────────────────

interface EcranDetaille {
  label?: string;
  isPrimary: boolean;
  isInternal: boolean;
  left: number;
  top: number;
  width: number;
  height: number;
  availLeft: number;
  availTop: number;
  availWidth: number;
  availHeight: number;
}

interface DetailsEcrans extends EventTarget {
  readonly screens: readonly EcranDetaille[];
  readonly currentScreen: EcranDetaille;
}

type FenetreAvecEcrans = Window & { getScreenDetails?: () => Promise<DetailsEcrans> };

function identifiantEcran(e: EcranDetaille, index: number): string {
  // Pas d'identifiant stable dans l'API : la position dans le bureau virtuel en tient lieu.
  return `${e.left},${e.top},${e.width}x${e.height}#${index}`;
}

function versEcrans(details: DetailsEcrans): Ecran[] {
  return details.screens.map((e, i) => ({
    id: identifiantEcran(e, i),
    libelle: e.label || `Écran ${i + 1}`,
    largeur: e.width,
    hauteur: e.height,
    principal: e.isPrimary,
    interne: e.isInternal,
  }));
}

const PREFIXE_PREFERENCES = 'app_plateforme_';

export function creerPlateformeWeb(): Plateforme {
  const fenetres = new Map<NomSortie, Window>();
  const rappelsFermeture = new Set<(nom: NomSortie) => void>();
  let surveillance: ReturnType<typeof setInterval> | null = null;
  let details: DetailsEcrans | null = null;

  const navigateur = typeof window !== 'undefined';

  /** Une fenêtre fermée à la main ne prévient pas son ouvreur : on la surveille. */
  function surveiller() {
    if (surveillance) return;
    surveillance = setInterval(() => {
      for (const [nom, f] of fenetres) {
        if (f.closed) {
          fenetres.delete(nom);
          rappelsFermeture.forEach((r) => r(nom));
        }
      }
      if (fenetres.size === 0 && surveillance) {
        clearInterval(surveillance);
        surveillance = null;
      }
    }, 1000);
  }

  async function obtenirDetails(): Promise<DetailsEcrans | null> {
    if (details) return details;
    const w = window as FenetreAvecEcrans;
    if (!w.getScreenDetails) return null;
    try {
      details = await w.getScreenDetails();
      return details;
    } catch {
      // Autorisation « gestion des fenêtres » refusée : on retombe sur l'écran courant.
      return null;
    }
  }

  return {
    type: 'web',
    estBureau: () => false,

    peutChoisirEcran: () => navigateur && typeof (window as FenetreAvecEcrans).getScreenDetails === 'function',

    async listerEcrans() {
      if (!navigateur) return [];
      const d = await obtenirDetails();
      if (d) return versEcrans(d);
      return [
        { id: 'courant', libelle: 'Cet écran', largeur: window.screen.width, hauteur: window.screen.height, principal: true },
      ];
    },

    surChangementEcrans(rappel) {
      if (!navigateur) return () => {};
      let actif = true;
      let cible: DetailsEcrans | null = null;
      const ecouteur = () => {
        if (cible && actif) rappel(versEcrans(cible));
      };
      // On n'appelle pas getScreenDetails ici (demande d'autorisation) : seulement si déjà obtenue.
      if (details) {
        cible = details;
        cible.addEventListener('screenschange', ecouteur);
      }
      return () => {
        actif = false;
        cible?.removeEventListener('screenschange', ecouteur);
      };
    },

    async ouvrirSortie(options: OptionsSortie) {
      if (!navigateur) throw new ErreurPlateforme('non-pris-en-charge', 'Pas de fenêtre hors navigateur');
      const nom = options.nom ?? 'sortie';
      const url = new URL(options.route, window.location.href).toString();

      let geometrie = 'width=1280,height=720';
      if (options.ecranId) {
        const d = await obtenirDetails();
        const index = d?.screens.findIndex((e, i) => identifiantEcran(e, i) === options.ecranId) ?? -1;
        const ecran = index >= 0 ? d?.screens[index] : undefined;
        if (!ecran) throw new ErreurPlateforme('ecran-introuvable', 'Cet écran n’est plus branché');
        geometrie = `left=${ecran.availLeft},top=${ecran.availTop},width=${ecran.availWidth},height=${ecran.availHeight}`;
      }

      const existante = fenetres.get(nom);
      if (existante && !existante.closed) {
        existante.location.href = url;
        existante.focus();
        return;
      }
      // Pas de « noopener » : la sortie doit rester du même contexte de navigation pour
      // partager le BroadcastChannel et pouvoir être refermée par la régie.
      const f = window.open(url, `cmfi-${nom}`, `popup,${geometrie}`);
      if (!f) throw new ErreurPlateforme('fenetre-bloquee', 'Le navigateur a bloqué la fenêtre de sortie');
      fenetres.set(nom, f);
      surveiller();
    },

    async fermerSortie(nom = 'sortie') {
      const f = fenetres.get(nom);
      if (f && !f.closed) f.close();
      fenetres.delete(nom);
    },

    async sortieOuverte(nom = 'sortie') {
      const f = fenetres.get(nom);
      return !!f && !f.closed;
    },

    surFermetureSortie(rappel) {
      rappelsFermeture.add(rappel);
      return () => rappelsFermeture.delete(rappel);
    },

    async empecherVeille(): Promise<VerrouVeille | null> {
      if (!navigateur || !('wakeLock' in navigator)) return null;
      let sentinelle: WakeLockSentinel | null = null;
      let tenu = true;
      const acquerir = async () => {
        try {
          sentinelle = await navigator.wakeLock.request('screen');
        } catch {
          sentinelle = null;
        }
      };
      // Le navigateur relâche le verrou quand l'onglet passe en arrière-plan : on le reprend au retour.
      const auRetour = () => {
        if (tenu && document.visibilityState === 'visible') void acquerir();
      };
      await acquerir();
      if (!sentinelle) return null;
      document.addEventListener('visibilitychange', auRetour);
      return {
        async liberer() {
          tenu = false;
          document.removeEventListener('visibilitychange', auRetour);
          await (sentinelle as WakeLockSentinel | null)?.release().catch(() => {});
          sentinelle = null;
        },
      };
    },

    async lirePreference<T>(cle: string) {
      try {
        const brut = window.localStorage.getItem(PREFIXE_PREFERENCES + cle);
        return brut === null ? undefined : (JSON.parse(brut) as T);
      } catch {
        return undefined;
      }
    },

    async ecrirePreference<T>(cle: string, valeur: T) {
      try {
        window.localStorage.setItem(PREFIXE_PREFERENCES + cle, JSON.stringify(valeur));
      } catch {
        // Stockage refusé : la préférence ne survivra pas à la session, rien de plus.
      }
    },

    async ouvrirLienExterne(url: string) {
      if (navigateur) window.open(url, '_blank', 'noopener,noreferrer');
    },
  };
}
