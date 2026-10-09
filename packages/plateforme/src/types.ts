/**
 * L'interface unique que la web app utilise pour tout ce qui dépend de la plateforme.
 * Deux implémentations : web.ts (navigateur) et bureau.ts (adaptateur vers window.cmfi).
 */
import type { NomSortie } from './contrat';

export type { NomSortie } from './contrat';

export type TypePlateforme = 'web' | 'bureau';

export interface Ecran {
  id: string;
  libelle: string;
  largeur: number;
  hauteur: number;
  principal: boolean;
  interne?: boolean;
}

export interface OptionsSortie {
  /** « sortie » par défaut. */
  nom?: NomSortie;
  /** Route de la web app, barre finale comprise : « /sortie/ », « /musiciens/ ». */
  route: string;
  /** Écran cible si la plateforme sait choisir (voir peutChoisirEcran). */
  ecranId?: string | null;
  pleinEcran?: boolean;
}

/** Verrou anti-veille : tant qu'il est tenu, l'écran ne s'éteint pas. */
export interface VerrouVeille {
  liberer(): Promise<void>;
}

/** Erreur de plateforme dont l'interface peut expliquer la cause. */
export class ErreurPlateforme extends Error {
  readonly code: 'fenetre-bloquee' | 'ecran-introuvable' | 'non-pris-en-charge' | 'permission-refusee';

  constructor(code: ErreurPlateforme['code'], message: string) {
    super(message);
    this.name = 'ErreurPlateforme';
    this.code = code;
  }
}

export interface Plateforme {
  readonly type: TypePlateforme;
  estBureau(): boolean;

  /**
   * Vrai si l'on peut placer la sortie sur un écran précis. Bureau : toujours. Web :
   * seulement avec la Window Management API (Chrome, Edge) — sinon l'utilisateur glisse la
   * fenêtre sur le projecteur lui-même.
   */
  peutChoisirEcran(): boolean;
  /** Web : peut déclencher la demande d'autorisation « gestion des fenêtres ». */
  listerEcrans(): Promise<Ecran[]>;
  surChangementEcrans(rappel: (ecrans: Ecran[]) => void): () => void;

  /** Doit être appelé dans un geste utilisateur (clic) : sinon le navigateur bloque la fenêtre. */
  ouvrirSortie(options: OptionsSortie): Promise<void>;
  fermerSortie(nom?: NomSortie): Promise<void>;
  sortieOuverte(nom?: NomSortie): Promise<boolean>;
  surFermetureSortie(rappel: (nom: NomSortie) => void): () => void;

  /** Empêche la mise en veille de l'écran pendant le culte ; null si impossible. */
  empecherVeille(): Promise<VerrouVeille | null>;

  /** Préférences propres à la plateforme (écran retenu…). Web : localStorage. */
  lirePreference<T>(cle: string): Promise<T | undefined>;
  ecrirePreference<T>(cle: string, valeur: T): Promise<void>;

  ouvrirLienExterne(url: string): Promise<void>;
}
