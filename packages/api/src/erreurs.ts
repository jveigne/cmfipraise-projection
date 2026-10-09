/**
 * Échec d'un appel à l'API.
 *
 * `reseau` est vrai quand `fetch` lui-même a échoué (réseau coupé, ou requête bloquée par
 * le CORS — le navigateur ne distingue pas les deux). L'interface en fait un état
 * « hors-ligne », jamais une alerte : une panne réseau n'est pas une faute de l'utilisateur.
 */
export class ErreurApi extends Error {
  readonly status?: number;
  readonly chemin: string;
  readonly reseau: boolean;
  /** Vrai quand l'action exige un compte que l'utilisateur n'a pas (ou plus). */
  readonly compteRequis: boolean;
  /** Corps de la réponse en erreur, pour le journal. */
  readonly detail?: string;

  constructor(
    message: string,
    options: {
      status?: number;
      chemin: string;
      reseau?: boolean;
      compteRequis?: boolean;
      detail?: string;
      cause?: unknown;
    }
  ) {
    super(message, { cause: options.cause });
    this.name = 'ErreurApi';
    this.status = options.status;
    this.chemin = options.chemin;
    this.reseau = options.reseau ?? false;
    this.compteRequis = options.compteRequis ?? false;
    this.detail = options.detail;
  }

  /** Jeton refusé : il faut en obtenir un autre. */
  get estRefus(): boolean {
    return this.status === 401 || this.status === 403;
  }

  get estIntrouvable(): boolean {
    return this.status === 404;
  }
}

export function estErreurApi(e: unknown): e is ErreurApi {
  return e instanceof ErreurApi;
}
