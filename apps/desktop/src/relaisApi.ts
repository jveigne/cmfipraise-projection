/**
 * Relais du backend par le processus principal.
 *
 * Pourquoi : le backend (WebConfig.java) n'autorise en CORS que quelques origines web ; il
 * répond 403 à `Origin: app://cmfi` comme à `http://localhost:3000`, y compris sur le jeton
 * visiteur. Sans relais, l'app de bureau ne charge aucun recueil.
 *
 * Comment : on intercepte les requêtes https de la session vers l'origine du backend, et on
 * les rejoue depuis le processus principal SANS en-tête Origin — pour Spring ce n'est plus une
 * requête CORS. La réponse revient au renderer avec les en-têtes CORS de notre origine. Le
 * pré-vol OPTIONS est répondu ici même. Toute autre requête https passe telle quelle.
 *
 * Le jour où le backend autorise app://cmfi, `CMFI_RELAIS_API=0` permet de vérifier qu'on peut
 * s'en passer, puis ce fichier peut disparaître. Le contrôle d'accès réel (jetons Bearer) n'est
 * pas affaibli : le backend vérifie toujours le jeton de chaque requête.
 */
import { net, protocol } from 'electron';

import { ORIGINE_API, ORIGINE_FENETRES, origineDe } from './config';

const STATUTS_SANS_CORPS = new Set([101, 103, 204, 205, 304]);

function entetesCors(origine: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origine,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Expose-Headers': '*',
    Vary: 'Origin',
  };
}

async function relayer(requete: Request): Promise<Response> {
  const origine = requete.headers.get('origin');
  // Seule la web app profite du relais ; une autre origine reçoit la réponse brute du backend.
  const origineAutorisee = origine === ORIGINE_FENETRES ? origine : null;

  if (requete.method === 'OPTIONS' && origineAutorisee) {
    return new Response(null, {
      status: 204,
      headers: {
        ...entetesCors(origineAutorisee),
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': requete.headers.get('access-control-request-headers') ?? 'Authorization, Content-Type',
        'Access-Control-Max-Age': '600',
      },
    });
  }

  const entetes = new Headers(requete.headers);
  if (origineAutorisee) entetes.delete('origin');

  const avecCorps = requete.method !== 'GET' && requete.method !== 'HEAD' && requete.body !== null;
  const reponse = await net.fetch(requete.url, {
    method: requete.method,
    headers: entetes,
    body: avecCorps ? requete.body : undefined,
    // Exigé par fetch dès que le corps est un flux.
    ...(avecCorps ? { duplex: 'half' as const } : {}),
    redirect: 'manual',
    bypassCustomProtocolHandlers: true,
  } as RequestInit & { bypassCustomProtocolHandlers: boolean });

  if (!origineAutorisee) return reponse;

  const sortie = new Headers(reponse.headers);
  for (const cle of [...sortie.keys()]) {
    if (cle.toLowerCase().startsWith('access-control-')) sortie.delete(cle);
  }
  for (const [cle, valeur] of Object.entries(entetesCors(origineAutorisee))) sortie.set(cle, valeur);

  return new Response(STATUTS_SANS_CORPS.has(reponse.status) ? null : reponse.body, {
    status: reponse.status,
    statusText: reponse.statusText,
    headers: sortie,
  });
}

/** À appeler une fois l'app prête. */
export function activerRelaisApi(): void {
  protocol.handle('https', async (requete) => {
    if (origineDe(requete.url) === ORIGINE_API) {
      try {
        return await relayer(requete);
      } catch (erreur) {
        // Panne réseau : on laisse le renderer voir une erreur de fetch, comme sans relais.
        console.warn('[relais api]', requete.method, requete.url, erreur);
        return Response.error();
      }
    }
    return net.fetch(requete, { bypassCustomProtocolHandlers: true });
  });
}
