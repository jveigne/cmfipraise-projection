'use client';

/**
 * Accès React au transport distant (téléphones).
 *
 *  - `obtenirTransportDistant()` choisit l'implémentation. Aujourd'hui : locale
 *    (BroadcastChannel, même navigateur). Le jour où le relais existera, c'est ici, et
 *    seulement ici, qu'on branchera `relais` (web) ou `reseau-local` (bureau).
 *  - `useRelaisRegie()` : côté régie. Ouvre la salle, relaie l'état de projection vers les
 *    téléphones et les commandes de la télécommande vers la régie.
 *  - `useTelephone()` : côté téléphone (/telecommande, /suivre).
 */
import { ouvrirCanal, type CommandeRegie, type EtatProjection } from '@cmfi/projection';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { diffuserDepuisEtat } from './diffusion';
import { creerTransportLocal } from './local';
import type {
  AppareilDistant,
  CommandeDistante,
  CoteRegie,
  CoteTelephone,
  EtatDiffuse,
  EtatLiaison,
  InvitationAppairage,
  ModeTransport,
  RoleDistant,
  TransportDistant,
} from './transport';

let transport: TransportDistant | null = null;

export function obtenirTransportDistant(): TransportDistant {
  if (typeof window === 'undefined') return creerTransportLocal();
  if (!transport) transport = creerTransportLocal();
  return transport;
}

// ─── Côté régie ──────────────────────────────────────────────────────────────

export interface OptionsRelaisRegie {
  /** Faux : rien n'est ouvert (la régie l'a déjà ouvert ailleurs, ou pas de culte en cours). */
  actif?: boolean;
  /** Langue principale des paroles (réglages), pour les boutons FR / EN des téléphones. */
  langueParoles?: 'fr' | 'en';
  /**
   * Verset demandé par la télécommande. La régie le résout avec sa source biblique puis le
   * met en suivante ou le projette. Sans ce rappel, la demande est ignorée.
   */
  surPassage?: (demande: Extract<CommandeDistante, { type: 'passage' }>, appareil: AppareilDistant) => void;
}

export interface RelaisRegie {
  mode: ModeTransport;
  disponible: boolean;
  invitation: InvitationAppairage | null;
  appareils: AppareilDistant[];
  accepter(id: string): void;
  refuser(id: string): void;
  retirer(id: string): void;
}

const COMMANDES_SIMPLES: Record<Exclude<CommandeDistante['type'], 'passage'>, CommandeRegie> = {
  suivante: 'suivante',
  precedente: 'precedente',
  'ecran-noir': 'ecran-noir',
};

/**
 * À monter UNE fois dans la régie, pour toute la durée du culte (pas dans la boîte de
 * dialogue : la télécommande doit rester active une fois celle-ci fermée).
 *
 * Il écoute la régie sur le canal de projection comme une sortie de plus, et lui renvoie
 * les commandes de la télécommande sous forme de `commande` — la régie n'a donc rien de
 * nouveau à apprendre, hormis `surPassage`.
 */
export function useRelaisRegie({ actif = true, langueParoles = 'fr', surPassage }: OptionsRelaisRegie = {}): RelaisRegie {
  const [cote, setCote] = useState<CoteRegie | null>(null);
  const [appareils, setAppareils] = useState<AppareilDistant[]>([]);
  const surPassageRef = useRef(surPassage);
  const langueRef = useRef(langueParoles);
  useEffect(() => {
    surPassageRef.current = surPassage;
    langueRef.current = langueParoles;
  });

  const t = obtenirTransportDistant();

  useEffect(() => {
    if (!actif || !t.disponible) return;
    const c = t.ouvrirRegie();
    const canal = ouvrirCanal('telecommande');
    let dernier: EtatProjection | null = null;

    const diffuser = () => {
      if (dernier) c.diffuser(diffuserDepuisEtat(dernier, { langueParoles: langueRef.current }));
    };
    const arreterCanal = canal.ecouter((m) => {
      if (m.type !== 'etat') return;
      dernier = m.etat;
      diffuser();
    });
    canal.envoyer({ type: 'demande-etat' });

    const arreterCommandes = c.surCommande((commande, appareil) => {
      if (commande.type === 'passage') surPassageRef.current?.(commande, appareil);
      else canal.envoyer({ type: 'commande', commande: COMMANDES_SIMPLES[commande.type] });
    });
    const arreterAppareils = c.surAppareils(setAppareils);

    setCote(c);
    setAppareils(c.appareils());
    return () => {
      arreterCanal();
      arreterCommandes();
      arreterAppareils();
      canal.fermer();
      c.fermer();
      setCote(null);
    };
  }, [actif, t]);

  return {
    mode: t.mode,
    disponible: t.disponible,
    invitation: cote?.invitation ?? null,
    appareils,
    accepter: (id) => cote?.accepter(id),
    refuser: (id) => cote?.refuser(id),
    retirer: (id) => cote?.retirer(id),
  };
}

// ─── Côté téléphone ──────────────────────────────────────────────────────────

export interface Telephone {
  mode: ModeTransport;
  liaison: EtatLiaison;
  etat: EtatDiffuse | null;
  codeVerification: string | null;
  envoyer(commande: CommandeDistante): boolean;
}

const SANS_TELEPHONE: Telephone = {
  mode: 'local',
  liaison: 'deconnecte',
  etat: null,
  codeVerification: null,
  envoyer: () => false,
};

/** Rejoint une salle ; `null` tant que le code (ou le prénom) n'est pas connu. */
export function useTelephone(options: { codeSalle: string; role: RoleDistant; nom: string; tentative?: number } | null): Telephone {
  const [cote, setCote] = useState<CoteTelephone | null>(null);
  const t = obtenirTransportDistant();
  const codeSalle = options?.codeSalle ?? null;
  const role = options?.role ?? null;
  const nom = options?.nom ?? '';
  // Changer de tentative rouvre une liaison neuve (« Redemander » après un refus).
  const tentative = options?.tentative ?? 0;

  useEffect(() => {
    if (!codeSalle || !role || !t.disponible) return;
    const c = t.rejoindre({ codeSalle, role, nom });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la liaison n'existe qu'une fois ouverte côté client
    setCote(c);
    return () => {
      c.fermer();
      setCote(null);
    };
  }, [codeSalle, role, nom, tentative, t]);

  const liaison = useSyncExternalStore(
    (r) => cote?.surLiaison(r) ?? (() => {}),
    () => cote?.liaison() ?? 'deconnecte',
    () => 'deconnecte' as EtatLiaison
  );
  const etat = useSyncExternalStore(
    (r) => cote?.surEtat(r) ?? (() => {}),
    () => cote?.etat() ?? null,
    () => null
  );

  if (!cote) return { ...SANS_TELEPHONE, mode: t.mode };
  return { mode: t.mode, liaison, etat, codeVerification: cote.codeVerification, envoyer: (c) => cote.envoyer(c) };
}
