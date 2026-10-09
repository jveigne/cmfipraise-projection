/**
 * Canal régie → sortie / musiciens (et télécommande locale → régie).
 *
 * BroadcastChannel('cmfi-projection') : même origine, aucun serveur, même code sur le web
 * (fenêtres d'un même navigateur) et sur le bureau (fenêtres Electron d'une même session,
 * même origine app://). Si le réseau tombe, la projection continue : rien ne passe par
 * Internet.
 *
 * Protocole :
 *  - la régie diffuse `etat` à chaque changement ;
 *  - une sortie qui s'ouvre (ou se recharge) envoie `demande-etat`, la régie répond `etat` ;
 *  - chaque fenêtre annonce `presence` à l'ouverture et à la fermeture ;
 *  - une télécommande dans le même navigateur envoie des `commande`. (La télécommande par
 *    téléphone, elle, passera par un relais réseau : hors de ce canal.)
 */
import type { EtatProjection } from './etat';

export const NOM_CANAL = 'cmfi-projection';
export const VERSION_PROTOCOLE = 1;

export type RoleFenetre = 'regie' | 'sortie' | 'musiciens' | 'telecommande' | 'suivre';

export type CommandeRegie =
  | 'suivante'
  | 'precedente'
  | 'ecran-noir'
  | 'masquer-texte'
  | 'logo'
  | 'bilingue'
  | 'revenir-direct';

export type MessageProjection =
  | { type: 'etat'; etat: EtatProjection }
  | { type: 'demande-etat' }
  | { type: 'commande'; commande: CommandeRegie }
  | { type: 'presence'; present: boolean; largeur?: number; hauteur?: number };

export interface Enveloppe {
  v: typeof VERSION_PROTOCOLE;
  /** Id de la fenêtre émettrice (une par ouverture du canal). */
  source: string;
  role: RoleFenetre;
  horodatage: number;
  message: MessageProjection;
}

export interface CanalProjection {
  readonly id: string;
  readonly role: RoleFenetre;
  /** Faux pendant le rendu statique ou si BroadcastChannel manque : envoyer ne fait rien. */
  readonly disponible: boolean;
  envoyer(message: MessageProjection): void;
  /** Reçoit les messages des AUTRES fenêtres (BroadcastChannel ne renvoie pas à l'émetteur). */
  ecouter(rappel: (message: MessageProjection, enveloppe: Enveloppe) => void): () => void;
  fermer(): void;
}

const TYPES_CONNUS = new Set<MessageProjection['type']>(['etat', 'demande-etat', 'commande', 'presence']);

function estEnveloppe(donnee: unknown): donnee is Enveloppe {
  if (!donnee || typeof donnee !== 'object') return false;
  const e = donnee as Partial<Enveloppe>;
  return (
    e.v === VERSION_PROTOCOLE &&
    typeof e.source === 'string' &&
    typeof e.role === 'string' &&
    !!e.message &&
    TYPES_CONNUS.has((e.message as MessageProjection).type)
  );
}

function identifiant(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

/**
 * Ouvre le canal pour une fenêtre. Un seul canal par fenêtre suffit ; le fermer au
 * démontage (sinon les messages s'accumulent sur un écouteur mort).
 */
export function ouvrirCanal(role: RoleFenetre, nom: string = NOM_CANAL): CanalProjection {
  const id = identifiant();
  if (typeof BroadcastChannel === 'undefined') {
    return { id, role, disponible: false, envoyer: () => {}, ecouter: () => () => {}, fermer: () => {} };
  }

  const canal = new BroadcastChannel(nom);
  const rappels = new Set<(m: MessageProjection, e: Enveloppe) => void>();
  canal.onmessage = (evenement: MessageEvent<unknown>) => {
    // Un message d'une version future du protocole est ignoré, jamais à moitié interprété.
    if (!estEnveloppe(evenement.data) || evenement.data.source === id) return;
    const enveloppe = evenement.data;
    rappels.forEach((r) => r(enveloppe.message, enveloppe));
  };

  return {
    id,
    role,
    disponible: true,
    envoyer(message) {
      const enveloppe: Enveloppe = { v: VERSION_PROTOCOLE, source: id, role, horodatage: Date.now(), message };
      canal.postMessage(enveloppe);
    },
    ecouter(rappel) {
      rappels.add(rappel);
      return () => rappels.delete(rappel);
    },
    fermer() {
      rappels.clear();
      canal.close();
    },
  };
}
