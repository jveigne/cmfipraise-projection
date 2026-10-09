/**
 * Client HTTP de l'API CMFIPraise (Railway), sur `fetch`.
 *
 * Deux jetons coexistent, comme sur le mobile (contexts/AuthContext.tsx) :
 *  - le jeton VISITEUR, obtenu sans compte par GET /private/generate-token. Il suffit pour
 *    lire et projeter tout le contenu officiel (recueils, chants, catégories) ;
 *  - le JWT du COMPTE, obtenu par POST /auth/login. Il n'est exigé que pour ce que
 *    l'utilisateur a créé ou partagé (setlists du serveur, chants personnels).
 *
 * Un jeton refusé (401/403) est renouvelé une fois puis la requête rejouée : le secret JWT
 * du serveur change parfois, et un visiteur ne doit jamais rester bloqué pour autant.
 *
 * Le client ne masque jamais un échec derrière une valeur vide : un tableau vide voudrait
 * dire « rien sur le serveur », et l'appelant écraserait sa copie hors-ligne avec.
 */
import { CONFIG_PRODUCTION, type ConfigApi } from './config';
import { ErreurApi } from './erreurs';
import { stockageMemoire, type StockageJetons } from './jetons';
import type {
  AjoutChantSetlistDTO,
  CategorieDTO,
  ChantDTO,
  CreationSetlistDTO,
  JetonDTO,
  LangueContenu,
  LienSetlistChantDTO,
  RecueilDTO,
  ReponseAuthDTO,
  ResultatRechercheDTO,
  SetlistDTO,
  UtilisateurDTO,
  VersionRecueilDTO,
} from './types';

/**
 * Niveau d'accès d'une requête :
 *  - `public`  : sans en-tête Authorization ;
 *  - `jeton`   : JWT du compte s'il existe, sinon jeton visiteur (contenu officiel) ;
 *  - `compte`  : JWT du compte obligatoire (contenu de l'utilisateur).
 */
export type Acces = 'public' | 'jeton' | 'compte';

export interface OptionsRequete {
  methode?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  corps?: unknown;
  acces?: Acces;
  /** Forme attendue de la réponse. `vide` ignore le corps. */
  reponse?: 'json' | 'texte' | 'vide';
  signal?: AbortSignal;
}

export interface OptionsClient {
  stockage?: StockageJetons;
  /** Injection pour les tests ; `globalThis.fetch` par défaut. */
  fetch?: typeof fetch;
  /** Appelé quand le JWT du compte est refusé : l'app repasse en visiteur et le dit. */
  surSessionExpiree?: () => void;
}

export class ClientApi {
  readonly config: ConfigApi;
  private readonly stockage: StockageJetons;
  private readonly fetchImpl: typeof fetch;
  private readonly surSessionExpiree?: () => void;
  /** Une seule demande de jeton visiteur à la fois, même si dix écrans le réclament. */
  private jetonVisiteurEnCours: Promise<string> | null = null;

  constructor(config: ConfigApi = CONFIG_PRODUCTION, options: OptionsClient = {}) {
    this.config = config;
    this.stockage = options.stockage ?? stockageMemoire();
    // Lié à globalThis : un `fetch` détaché lève « Illegal invocation » dans les navigateurs.
    this.fetchImpl = options.fetch ?? ((...args) => globalThis.fetch(...args));
    this.surSessionExpiree = options.surSessionExpiree;
  }

  // ─── Session ───────────────────────────────────────────────────────────────

  /** Vrai si un JWT de compte est présent (pas forcément encore valide côté serveur). */
  get estConnecte(): boolean {
    return !!this.stockage.lire('compte');
  }

  /** Utilisateur du compte connecté, tel que mémorisé à la connexion. */
  get utilisateur(): UtilisateurDTO | null {
    const brut = this.stockage.lire('utilisateur');
    if (!brut) return null;
    try {
      return JSON.parse(brut) as UtilisateurDTO;
    } catch {
      return null;
    }
  }

  /** Jeton visiteur : celui en mémoire, sinon un nouveau. `forcer` en redemande un. */
  async jetonVisiteur(forcer = false): Promise<string> {
    const existant = this.stockage.lire('visiteur');
    if (existant && !forcer) return existant;
    if (!this.jetonVisiteurEnCours) {
      this.jetonVisiteurEnCours = this.envoyer<JetonDTO>(
        `${this.config.urlRacine}/private/generate-token`,
        { acces: 'public' },
        null
      )
        .then((dto) => {
          if (!dto?.token) throw new ErreurApi('Jeton visiteur absent de la réponse', { chemin: '/private/generate-token' });
          this.stockage.ecrire('visiteur', dto.token);
          return dto.token;
        })
        .finally(() => {
          this.jetonVisiteurEnCours = null;
        });
    }
    return this.jetonVisiteurEnCours;
  }

  /** Connexion par e-mail et mot de passe. Mémorise le JWT et l'utilisateur. */
  async connexion(email: string, motDePasse: string): Promise<ReponseAuthDTO> {
    // Espace retiré : l'autocomplétion en laisse souvent un après l'adresse (vu sur le mobile).
    const reponse = await this.requete<ReponseAuthDTO>('/auth/login', {
      methode: 'POST',
      corps: { email: email.trim(), password: motDePasse },
      acces: 'public',
    });
    this.stockage.ecrire('compte', reponse.token);
    this.stockage.ecrire('utilisateur', JSON.stringify(reponse.user));
    return reponse;
  }

  /** Oublie le compte. Le jeton visiteur reste : on continue de lire et projeter. */
  deconnexion(): void {
    this.stockage.ecrire('compte', null);
    this.stockage.ecrire('utilisateur', null);
  }

  // ─── Requête générique ─────────────────────────────────────────────────────

  /** Requête sur `config.urlApi` + `chemin` (qui commence par « / »). */
  async requete<T>(chemin: string, options: OptionsRequete = {}): Promise<T> {
    const acces = options.acces ?? 'jeton';
    const url = `${this.config.urlApi}${chemin}`;

    if (acces === 'public') return this.envoyer<T>(url, options, null);

    const jetonCompte = this.stockage.lire('compte');
    if (acces === 'compte' && !jetonCompte) {
      throw new ErreurApi('Compte requis', { status: 401, chemin, compteRequis: true });
    }

    if (jetonCompte) {
      try {
        return await this.envoyer<T>(url, options, jetonCompte);
      } catch (e) {
        if (!(e instanceof ErreurApi) || !e.estRefus) throw e;
        // JWT refusé : la session est terminée. Le contenu officiel reste lisible en visiteur.
        this.deconnexion();
        this.surSessionExpiree?.();
        if (acces === 'compte') {
          throw new ErreurApi('Session expirée', { status: e.status, chemin, compteRequis: true });
        }
      }
    }

    const jeton = await this.jetonVisiteur();
    try {
      return await this.envoyer<T>(url, options, jeton);
    } catch (e) {
      if (!(e instanceof ErreurApi) || !e.estRefus) throw e;
      const nouveau = await this.jetonVisiteur(true);
      return this.envoyer<T>(url, options, nouveau);
    }
  }

  private async envoyer<T>(url: string, options: OptionsRequete, jeton: string | null): Promise<T> {
    const entetes: Record<string, string> = { Accept: 'application/json, text/plain, */*' };
    if (options.corps !== undefined) entetes['Content-Type'] = 'application/json';
    if (jeton) entetes.Authorization = `Bearer ${jeton}`;
    const chemin = url.replace(this.config.urlRacine, '');

    let reponse: Response;
    try {
      reponse = await this.fetchImpl(url, {
        method: options.methode ?? 'GET',
        headers: entetes,
        body: options.corps !== undefined ? JSON.stringify(options.corps) : undefined,
        signal: options.signal,
      });
    } catch (cause) {
      // `fetch` lui-même a échoué : réseau coupé, ou requête bloquée par le CORS.
      if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
      throw new ErreurApi('Réseau indisponible', { chemin, reseau: true, cause });
    }

    if (!reponse.ok) {
      const detail = await reponse.text().catch(() => '');
      throw new ErreurApi(`HTTP ${reponse.status}`, { status: reponse.status, chemin, detail });
    }

    const forme = options.reponse ?? 'json';
    if (forme === 'vide' || reponse.status === 204) return undefined as T;
    const texte = await reponse.text();
    if (forme === 'texte') return texte as T;
    if (!texte) return undefined as T;
    try {
      return JSON.parse(texte) as T;
    } catch (cause) {
      throw new ErreurApi('Réponse illisible', { status: reponse.status, chemin, cause });
    }
  }

  // ─── Recueils et chants (jeton visiteur suffisant) ─────────────────────────

  /** Versions des recueils d'une langue : pour ne retélécharger que ce qui a changé. */
  listerVersionsRecueils(langue: LangueContenu): Promise<VersionRecueilDTO[]> {
    return this.requeteTableau(`/songbook-versions?language=${langue}`);
  }

  /** Recueils d'une langue, sans leurs chants. */
  listerRecueils(langue: LangueContenu): Promise<RecueilDTO[]> {
    return this.requeteTableau(`/all-songbook?language=${langue}`);
  }

  /**
   * Chants d'un recueil, par son titre. `detaille` = paroles et accords compris (quelques
   * centaines de Ko) ; sinon titres et numéros seulement.
   */
  chantsDuRecueil(titreRecueil: string, detaille: boolean): Promise<ChantDTO[]> {
    return this.requeteTableau(
      `/songbook?title=${encodeURIComponent(titreRecueil)}&isDetailed=${detaille ? 'true' : 'false'}`
    );
  }

  /** Chant complet par identifiant (chant de catégorie, de setlist…). */
  chantParId(id: string): Promise<ChantDTO> {
    return this.requete(`/song/${encodeURIComponent(id)}`);
  }

  /** Chant complet par titre dans un recueil donné. */
  chantParTitre(titre: string, titreRecueil: string): Promise<ChantDTO> {
    return this.requete(
      `/song?songTitle=${encodeURIComponent(titre)}&songbookTitle=${encodeURIComponent(titreRecueil)}`
    );
  }

  /** Recherche plein texte côté serveur (titre, numéro, paroles). */
  async rechercher(texte: string, page = 0, taille = 50): Promise<ChantDTO[]> {
    const r = await this.requete<ResultatRechercheDTO>(
      `/search-engine?search=${encodeURIComponent(texte.trim())}&page=${page}&size=${taille}`
    );
    return Array.isArray(r?.songDTOS) ? r.songDTOS : [];
  }

  /** Catégories d'une langue avec leurs chants (quelques Ko, sans paroles). */
  listerCategories(langue: LangueContenu): Promise<CategorieDTO[]> {
    return this.requeteTableau(`/categories?language=${langue}`);
  }

  // ─── Contenu de l'utilisateur (compte requis) ──────────────────────────────

  /** Chants personnels de l'utilisateur connecté. */
  mesChants(): Promise<ChantDTO[]> {
    return this.requeteTableau('/song/my', 'compte');
  }

  mesSetlists(): Promise<SetlistDTO[]> {
    return this.requeteTableau('/setlists', 'compte');
  }

  /** Détail d'une setlist : chants complets (paroles, tonalité). */
  setlistParId(id: string): Promise<SetlistDTO> {
    return this.requete(`/setlists/${encodeURIComponent(id)}`, { acces: 'compte' });
  }

  creerSetlist(dto: CreationSetlistDTO): Promise<SetlistDTO> {
    return this.requete('/setlists', { methode: 'POST', corps: dto, acces: 'compte' });
  }

  ajouterChantSetlist(idSetlist: string, dto: AjoutChantSetlistDTO): Promise<LienSetlistChantDTO> {
    if (!idSetlist) throw new ErreurApi('Setlist sans identifiant', { chemin: '/setlists/?/songs' });
    return this.requete(`/setlists/${encodeURIComponent(idSetlist)}/songs`, {
      methode: 'POST',
      corps: dto,
      acces: 'compte',
    });
  }

  /** Retire un chant d'une setlist. Retirer n'est pas supprimer : pas d'alerte. */
  retirerChantSetlist(idSetlist: string, idChant: string): Promise<void> {
    return this.requete(`/setlists/${encodeURIComponent(idSetlist)}/songs/${encodeURIComponent(idChant)}`, {
      methode: 'DELETE',
      acces: 'compte',
      reponse: 'vide',
    });
  }

  deplacerChantSetlist(idSetlist: string, idChant: string, position: number): Promise<void> {
    return this.requete(
      `/setlists/${encodeURIComponent(idSetlist)}/songs/${encodeURIComponent(idChant)}/position?position=${position}`,
      { methode: 'PUT', acces: 'compte', reponse: 'vide' }
    );
  }

  /** Suppression DÉFINITIVE d'une setlist (couleur alerte côté interface). */
  supprimerSetlist(id: string): Promise<void> {
    return this.requete(`/setlists/${encodeURIComponent(id)}`, {
      methode: 'DELETE',
      acces: 'compte',
      reponse: 'vide',
    });
  }

  // ─── Partage ───────────────────────────────────────────────────────────────

  /**
   * Code de partage permanent d'une setlist (toujours le même pour une setlist donnée).
   * Le backend répond en texte brut, parfois entre guillemets selon le convertisseur.
   */
  async codePartageSetlist(id: string): Promise<string> {
    const texte = await this.requete<string>(`/setlists/${encodeURIComponent(id)}/share-code`, {
      methode: 'POST',
      acces: 'compte',
      reponse: 'texte',
    });
    return texte.replace(/^"|"$/g, '').trim();
  }

  /** Aperçu d'une setlist partagée par son code, sans la rejoindre. */
  setlistParCode(code: string): Promise<SetlistDTO> {
    return this.requete(`/setlists/share/${encodeURIComponent(code)}`, { acces: 'compte' });
  }

  /** Rejoint une setlist partagée (abonnement permanent, idempotent). */
  rejoindreSetlist(code: string): Promise<void> {
    return this.requete(`/setlists/join/${encodeURIComponent(code)}`, {
      methode: 'POST',
      acces: 'compte',
      reponse: 'vide',
    });
  }

  setlistsPartageesAvecMoi(): Promise<SetlistDTO[]> {
    return this.requeteTableau('/setlists/shared-with-me', 'compte');
  }

  /** Se retire d'une setlist partagée (celle du propriétaire reste intacte). */
  quitterSetlistPartagee(idSetlist: string): Promise<void> {
    return this.requete(`/setlists/shared/${encodeURIComponent(idSetlist)}`, {
      methode: 'DELETE',
      acces: 'compte',
      reponse: 'vide',
    });
  }

  /** Garde-fou : une réponse qui n'est pas un tableau ne doit jamais remplacer une copie locale. */
  private async requeteTableau<T>(chemin: string, acces: Acces = 'jeton'): Promise<T[]> {
    const donnees = await this.requete<unknown>(chemin, { acces });
    if (!Array.isArray(donnees)) throw new ErreurApi('Réponse inattendue (tableau attendu)', { chemin });
    return donnees as T[];
  }
}
