/**
 * Transport distant LOCAL : BroadcastChannel('cmfi-distant'), même navigateur.
 *
 * Il simule fidèlement le futur relais (appairage par code de salle, code de vérification,
 * acceptation par la régie, lecture seule pour l'assemblée) pour que les écrans soient
 * écrits contre le vrai protocole. Mais il ne relie que les onglets d'un même navigateur :
 * un vrai téléphone qui scanne le QR n'atteindra rien tant que le relais n'existe pas.
 *
 * Canal distinct de 'cmfi-projection' : les téléphones ne doivent jamais recevoir l'état
 * complet (accords, thème), seulement l'`EtatDiffuse`.
 */
import {
  adresseTelephone,
  nouveauCodeSalle,
  nouveauCodeVerification,
  nouvelIdAppareil,
  type AppareilDistant,
  type CommandeDistante,
  type CoteRegie,
  type CoteTelephone,
  type EtatDiffuse,
  type EtatLiaison,
  type OptionsRejoindre,
  type RoleDistant,
  type TransportDistant,
} from './transport';

export const NOM_CANAL_DISTANT = 'cmfi-distant';
const VERSION = 1;
/** Une télécommande sans réponse redemande la régie à ce rythme (elle a pu s'ouvrir après). */
const RELANCE_MS = 3000;

const CLE_SALLE = 'app_distant_salle';
const CLE_ACCEPTES = 'app_distant_acceptes';
const prefixeTelephone = (salle: string) => `app_distant_tel_${salle}`;

type MessageLocal =
  | { t: 'arrivee'; appareil: Omit<AppareilDistant, 'statut' | 'arriveLe'> }
  /** La régie a reçu la demande d'une télécommande et attend la décision du responsable. */
  | { t: 'recue'; idAppareil: string }
  | { t: 'decision'; idAppareil: string; acceptee: boolean }
  | { t: 'retrait'; idAppareil: string }
  | { t: 'etat'; etat: EtatDiffuse }
  | { t: 'demande-etat'; idAppareil: string }
  | { t: 'commande'; idAppareil: string; commande: CommandeDistante }
  | { t: 'depart'; idAppareil: string }
  | { t: 'presence-regie' }
  | { t: 'fin' };

interface EnveloppeLocale {
  v: typeof VERSION;
  salle: string;
  message: MessageLocal;
}

const TYPES = new Set<MessageLocal['t']>(['arrivee', 'recue', 'decision', 'retrait', 'etat', 'demande-etat', 'commande', 'depart', 'presence-regie', 'fin']);

function estEnveloppe(d: unknown): d is EnveloppeLocale {
  if (!d || typeof d !== 'object') return false;
  const e = d as Partial<EnveloppeLocale>;
  return e.v === VERSION && typeof e.salle === 'string' && !!e.message && TYPES.has((e.message as MessageLocal).t);
}

function lireSession<T>(cle: string): T | null {
  try {
    const brut = window.sessionStorage.getItem(cle);
    return brut ? (JSON.parse(brut) as T) : null;
  } catch {
    return null;
  }
}

function ecrireSession(cle: string, valeur: unknown) {
  try {
    window.sessionStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    // Sans stockage de session, un rechargement oblige seulement à réappairer.
  }
}

function origine(): string {
  return typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
}

// ─── Côté régie ──────────────────────────────────────────────────────────────

function ouvrirRegieLocale(): CoteRegie {
  // Le code survit au rechargement de la régie : un QR déjà affiché reste valable.
  const codeSalle = lireSession<string>(CLE_SALLE) ?? nouveauCodeSalle();
  ecrireSession(CLE_SALLE, codeSalle);

  const canal = new BroadcastChannel(NOM_CANAL_DISTANT);
  const appareils = new Map<string, AppareilDistant>();
  for (const a of lireSession<AppareilDistant[]>(CLE_ACCEPTES) ?? []) appareils.set(a.id, a);

  const rappelsAppareils = new Set<(a: AppareilDistant[]) => void>();
  const rappelsCommande = new Set<(c: CommandeDistante, a: AppareilDistant) => void>();
  let dernierEtat: EtatDiffuse | null = null;
  let ferme = false;

  const envoyer = (message: MessageLocal) => {
    if (!ferme) canal.postMessage({ v: VERSION, salle: codeSalle, message } satisfies EnveloppeLocale);
  };
  const liste = () => [...appareils.values()].sort((a, b) => a.arriveLe - b.arriveLe);
  const changer = () => {
    ecrireSession(CLE_ACCEPTES, liste().filter((a) => a.statut === 'accepte' && a.role === 'telecommande'));
    const l = liste();
    rappelsAppareils.forEach((r) => r(l));
  };

  canal.onmessage = (ev: MessageEvent<unknown>) => {
    if (!estEnveloppe(ev.data) || ev.data.salle !== codeSalle) return;
    const m = ev.data.message;
    switch (m.t) {
      case 'arrivee': {
        const connu = appareils.get(m.appareil.id);
        // L'assemblée lit sans demander ; une télécommande déjà acceptée (rechargement) aussi.
        const accepte = m.appareil.role === 'assemblee' || connu?.statut === 'accepte';
        appareils.set(m.appareil.id, { ...m.appareil, statut: accepte ? 'accepte' : 'en-attente', arriveLe: connu?.arriveLe ?? Date.now() });
        if (accepte) {
          envoyer({ t: 'decision', idAppareil: m.appareil.id, acceptee: true });
          if (dernierEtat) envoyer({ t: 'etat', etat: dernierEtat });
        } else {
          envoyer({ t: 'recue', idAppareil: m.appareil.id });
        }
        changer();
        break;
      }
      case 'demande-etat':
        if (dernierEtat && appareils.get(m.idAppareil)?.statut === 'accepte') envoyer({ t: 'etat', etat: dernierEtat });
        break;
      case 'commande': {
        const a = appareils.get(m.idAppareil);
        // Le contrôle de rôle vit ici, côté régie, pas sur le téléphone : c'est la régie qui
        // décide de ce qu'elle exécute.
        if (a && a.statut === 'accepte' && a.role === 'telecommande') rappelsCommande.forEach((r) => r(m.commande, a));
        break;
      }
      case 'depart':
        if (appareils.delete(m.idAppareil)) changer();
        break;
      default:
        break;
    }
  };

  // Les téléphones qui attendaient (régie ouverte après eux) se manifestent à nouveau.
  envoyer({ t: 'presence-regie' });

  return {
    invitation: {
      codeSalle,
      adresse: (role: RoleDistant) => adresseTelephone(origine(), role, codeSalle),
    },
    appareils: liste,
    surAppareils(rappel) {
      rappelsAppareils.add(rappel);
      return () => rappelsAppareils.delete(rappel);
    },
    accepter(id) {
      const a = appareils.get(id);
      if (!a) return;
      appareils.set(id, { ...a, statut: 'accepte' });
      envoyer({ t: 'decision', idAppareil: id, acceptee: true });
      if (dernierEtat) envoyer({ t: 'etat', etat: dernierEtat });
      changer();
    },
    refuser(id) {
      if (!appareils.delete(id)) return;
      envoyer({ t: 'decision', idAppareil: id, acceptee: false });
      changer();
    },
    retirer(id) {
      if (!appareils.delete(id)) return;
      envoyer({ t: 'retrait', idAppareil: id });
      changer();
    },
    diffuser(etat) {
      dernierEtat = etat;
      envoyer({ t: 'etat', etat });
    },
    surCommande(rappel) {
      rappelsCommande.add(rappel);
      return () => rappelsCommande.delete(rappel);
    },
    fermer() {
      envoyer({ t: 'fin' });
      ferme = true;
      rappelsAppareils.clear();
      rappelsCommande.clear();
      canal.close();
    },
  };
}

// ─── Côté téléphone ──────────────────────────────────────────────────────────

interface IdentiteTelephone {
  id: string;
  codeVerification: string;
}

function rejoindreLocal({ codeSalle, role, nom }: OptionsRejoindre): CoteTelephone {
  // Même identité au rechargement : une télécommande acceptée n'a pas à redemander.
  const cle = `${prefixeTelephone(codeSalle)}_${role}`;
  const identite = lireSession<IdentiteTelephone>(cle) ?? { id: nouvelIdAppareil(), codeVerification: nouveauCodeVerification() };
  ecrireSession(cle, identite);

  const canal = new BroadcastChannel(NOM_CANAL_DISTANT);
  let liaison: EtatLiaison = 'connexion';
  let etat: EtatDiffuse | null = null;
  let ferme = false;
  const rappelsLiaison = new Set<(e: EtatLiaison) => void>();
  const rappelsEtat = new Set<(e: EtatDiffuse) => void>();

  const envoyer = (message: MessageLocal) => {
    if (!ferme) canal.postMessage({ v: VERSION, salle: codeSalle, message } satisfies EnveloppeLocale);
  };
  const changerLiaison = (nouvelle: EtatLiaison) => {
    if (nouvelle === liaison) return;
    liaison = nouvelle;
    rappelsLiaison.forEach((r) => r(nouvelle));
  };
  const annoncer = () => envoyer({ t: 'arrivee', appareil: { id: identite.id, nom, role, codeVerification: identite.codeVerification } });

  canal.onmessage = (ev: MessageEvent<unknown>) => {
    if (!estEnveloppe(ev.data) || ev.data.salle !== codeSalle) return;
    const m = ev.data.message;
    switch (m.t) {
      case 'recue':
        if (m.idAppareil === identite.id && (liaison === 'connexion' || liaison === 'interrompu')) changerLiaison('en-attente');
        break;
      case 'decision':
        if (m.idAppareil !== identite.id) return;
        changerLiaison(m.acceptee ? 'connecte' : 'refuse');
        if (m.acceptee) envoyer({ t: 'demande-etat', idAppareil: identite.id });
        break;
      case 'retrait':
        if (m.idAppareil === identite.id) changerLiaison('termine');
        break;
      case 'etat':
        if (liaison !== 'connecte') return;
        etat = m.etat;
        rappelsEtat.forEach((r) => r(m.etat));
        break;
      case 'presence-regie':
        if (liaison === 'connexion' || liaison === 'interrompu' || liaison === 'en-attente') annoncer();
        break;
      case 'fin':
        if (liaison === 'connecte' || liaison === 'en-attente') changerLiaison('interrompu');
        break;
      default:
        break;
    }
  };

  // Tant que la régie n'a pas répondu, on se rappelle à elle ; une fois la demande reçue
  // (« recue »), la télécommande attend l'acceptation.
  annoncer();
  const relance = setInterval(() => {
    if (liaison === 'connexion' || liaison === 'interrompu') annoncer();
  }, RELANCE_MS);

  const auRetourReseau = () => {
    if (liaison === 'interrompu') annoncer();
  };
  const aLaCoupure = () => {
    if (liaison === 'connecte' || liaison === 'en-attente') changerLiaison('interrompu');
  };
  window.addEventListener('online', auRetourReseau);
  window.addEventListener('offline', aLaCoupure);

  return {
    role,
    codeVerification: identite.codeVerification,
    liaison: () => liaison,
    surLiaison(rappel) {
      rappelsLiaison.add(rappel);
      return () => rappelsLiaison.delete(rappel);
    },
    etat: () => etat,
    surEtat(rappel) {
      rappelsEtat.add(rappel);
      return () => rappelsEtat.delete(rappel);
    },
    envoyer(commande) {
      if (role !== 'telecommande' || liaison !== 'connecte') return false;
      envoyer({ t: 'commande', idAppareil: identite.id, commande });
      return true;
    },
    fermer() {
      envoyer({ t: 'depart', idAppareil: identite.id });
      ferme = true;
      clearInterval(relance);
      window.removeEventListener('online', auRetourReseau);
      window.removeEventListener('offline', aLaCoupure);
      rappelsLiaison.clear();
      rappelsEtat.clear();
      canal.close();
    },
  };
}

export function creerTransportLocal(): TransportDistant {
  const disponible = typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined';
  return {
    mode: 'local',
    disponible,
    ouvrirRegie: ouvrirRegieLocale,
    rejoindre: rejoindreLocal,
  };
}
