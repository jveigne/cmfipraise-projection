'use client';

/**
 * La régie de projection (Main.dc.html) — le cœur du culte.
 *
 * Elle possède l'état de projection et le diffuse à la sortie et à l'écran des musiciens
 * par le BroadcastChannel : aucun serveur entre la régie et la salle. Trois moments :
 * préparation (rien n'est projeté, la sortie montre le logo), direct, fin du culte.
 *
 * Deux règles tiennent tout le reste :
 *  - la projection ne s'interrompt jamais sur une erreur réseau : un élément qui ne charge
 *    pas est sauté, ce qui est projeté ne bouge pas, et la séance survit à un rechargement ;
 *  - aucune action destructrice : tout se rétablit d'un second geste.
 */
import { ecrirePreference, nouvelIdentifiant, type ElementSetlist } from '@cmfi/api';
import { ErreurPlateforme, type Ecran } from '@cmfi/plateforme';
import {
  analyserReference,
  etatInitial,
  formaterReference,
  ouvrirCanal,
  positionPrecedente,
  positionSuivante,
  resumerProgramme,
  type CanalProjection,
  type CommandeRegie,
  type EtatProjection,
  type IdVersion,
  type PositionSetlist,
  type ThemeSortie,
} from '@cmfi/projection';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';

import { DialogueAppairage } from '@/components/appairage';
import { EtatRienAProjeter, IndicateurReseau } from '@/components/etats';
import {
  CLE_AFFECTATIONS_ECRANS,
  lireAffectationsEcrans,
  reaffecterEcran,
  themeSortieDepuisReglages,
  useReglages,
  type AffectationEcran,
} from '@/components/reglages/stockage';
import { Bouton, EtatCentre, Icone } from '@/components/ui';
import { urlSuivre } from '@/components/sortie/urlSuivre';
import { obtenirClientApi } from '@/lib/api';
import { formater, LANGUES, pluriel, useLangue, useT } from '@/lib/i18n';
import { useEstBureau, usePlateforme } from '@/lib/plateforme';
import { useRelaisRegie, type OptionsRelaisRegie } from '@/lib/reseau/distant';
import { useSession } from '@/lib/session';

import { ChampBarreUnique, PanneauCompris } from './BarreUnique';
import { MenuSortie } from './MenuSortie';
import { PanneauDiapositives } from './PanneauDiapositives';
import { PanneauSetlist } from './PanneauSetlist';
import { PanneauSortie } from './PanneauSortie';
import { FinCulte, ListeControle } from './Parcours';
import styles from './Regie.module.css';
import {
  CLE_SEANCE,
  premierePosition,
  reduireRegie,
  suivanteDepuis,
  memeSuivante,
  versPositionIndex,
  type ActionRegie,
  type Phase,
  type PositionDirect,
  type SeanceEnregistree,
} from './seance';
import { useBarreUnique } from './useBarreUnique';
import { useSeance } from './useSeance';

const URL_SHEPHR = process.env.NEXT_PUBLIC_URL_SHEPHR ?? null;
const ID_MENU_SORTIE = 'regie-menu-sortie';

function reducteur(etat: EtatProjection, action: ActionRegie): EtatProjection {
  return reduireRegie(etat, action);
}

function etatDeDepart(): EtatProjection {
  return reduireRegie(etatInitial(), { type: 'logoSeul' });
}

/** Une touche tapée dans un champ appartient au champ, pas à la projection. */
function estSaisie(cible: EventTarget | null): boolean {
  if (!(cible instanceof HTMLElement)) return false;
  return cible.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(cible.tagName);
}

/** Espace active le bouton qui a le focus (règle d'accessibilité), sauf sur une diapositive. */
function espaceAppartientACible(cible: EventTarget | null): boolean {
  if (!(cible instanceof HTMLElement)) return false;
  if (cible.closest('[data-espace-suivante]')) return false;
  return !!cible.closest('button, a, [role="switch"], [role="checkbox"], [role="radio"], summary');
}

export function Regie() {
  const t = useT('regie');
  const { langue, changerLangue } = useLangue();
  const plateforme = usePlateforme();
  const estBureau = useEstBureau();
  const session = useSession();
  const seance = useSeance();
  const { nav, setlist, resolus, origine } = seance;

  const [etat, envoyer] = useReducer(reducteur, undefined, etatDeDepart);
  const [phase, setPhase] = useState<Phase>('preparation');
  const [direct, setDirect] = useState<PositionDirect | null>(null);
  const [dernierDirect, setDernierDirect] = useState<PositionDirect | null>(null);
  const [vue, setVue] = useState<string | null>(null);
  const [projetees, setProjetees] = useState<ReadonlySet<string>>(new Set());
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [sortie, setSortie] = useState<{ ouverte: boolean; largeur?: number; hauteur?: number }>({ ouverte: false });
  const [erreurSortie, setErreurSortie] = useState<string | null>(null);
  const [ecrans, setEcrans] = useState<Ecran[] | null>(null);
  /** Écran de chaque rôle (sortie, musiciens), partagé avec les réglages. */
  const [affectations, setAffectations] = useState<Record<string, AffectationEcran>>({});
  const affectationsRef = useRef(affectations);
  const [origineQr, setOrigineQr] = useState<Location | null>(null);
  const [annonce, setAnnonce] = useState('');
  const [appairageOuvert, setAppairageOuvert] = useState(false);

  // Réglages (versions bibliques, bilingue, langue des paroles, thème). La version choisie
  // dans le panneau Bible ne vaut que pour ce culte ; un changement des réglages la remplace.
  const [reglages] = useReglages();
  const [version, setVersion] = useState<IdVersion>(reglages.versionBible);
  const [seconde, setSeconde] = useState<IdVersion | null>(reglages.versionSeconde);
  const cleVersions = `${reglages.versionBible}|${reglages.versionSeconde ?? ''}`;
  const [versionsSuivies, setVersionsSuivies] = useState(cleVersions);
  if (cleVersions !== versionsSuivies) {
    setVersionsSuivies(cleVersions);
    setVersion(reglages.versionBible);
    setSeconde(reglages.versionSeconde);
  }

  const barre = useBarreUnique({ version, seconde, langueFavorite: reglages.langueParoles });
  const champBarre = useRef<HTMLInputElement>(null);
  const canal = useRef<CanalProjection | null>(null);
  const etatRef = useRef(etat);
  const glissement = useRef(false);
  /** Setlist du serveur créée pour le partage, par setlist locale : jamais deux fois. */
  const idServeurCree = useRef(new Map<string, string>());

  const pret = seance.chargement.statut === 'pret';
  const posDirect = useMemo(() => versPositionIndex(nav, direct), [nav, direct]);

  // ─── Nouvelle séance : phase et position remises à zéro, ou reprises ───────
  // Ajusté pendant le rendu (et non dans un effet) : la régie ne montre jamais, même une
  // image, l'ancienne phase sur la nouvelle setlist.
  const [generationVue, setGenerationVue] = useState(-1);
  if (pret && seance.generation !== generationVue) {
    setGenerationVue(seance.generation);
    const r = seance.reprise;
    setMenuOuvert(false);
    setProjetees(new Set());
    if (r && r.phase !== 'fin') {
      setPhase(r.phase);
      setDirect(r.direct);
      setDernierDirect(r.direct);
      setVue(seance.aVoir ?? r.direct?.idElement ?? null);
      if (r.bilingue !== etat.bilingue) envoyer({ type: 'basculerBilingue' });
      if (r.phase === 'preparation' || !r.direct) envoyer({ type: 'logoSeul' });
    } else {
      setPhase('preparation');
      setDirect(null);
      setDernierDirect(null);
      setVue(seance.aVoir);
      // Nouvelle séance : le bilingue part du réglage choisi.
      if (reglages.bilingue !== etat.bilingue) envoyer({ type: 'basculerBilingue' });
      envoyer({ type: 'logoSeul' });
    }
  }

  // ─── Direct : l'état suit la setlist (élément chargé, réordonné, suivante) ─
  useEffect(() => {
    if (phase !== 'direct') return;
    if (direct && posDirect) {
      const el = nav[posDirect.element];
      if (el && el.diapositives.length > 0) {
        if (etat.element?.id !== el.id) {
          // Séance reprise : l'élément vient d'être chargé, on le remet à l'écran.
          envoyer({ type: 'projeter', element: el, index: direct.diapositive, suivante: suivanteDepuis(nav, posDirect) });
          return;
        }
        if (etat.element !== el) envoyer({ type: 'actualiserElement', element: el, index: direct.diapositive });
      }
    }
    const s = suivanteDepuis(nav, direct ? posDirect : null);
    if (!memeSuivante(etat.suivante, s)) envoyer({ type: 'definirSuivante', suivante: s });
  }, [phase, nav, direct, posDirect, etat.element, etat.suivante]);

  // ─── Canal : diffusion, réponses, commandes ────────────────────────────────
  // Pendant le chargement (ou une séance reprise pas encore prête), on ne diffuse rien :
  // la sortie garde ce qu'elle montre plutôt que de retomber sur le logo.
  const diffusable = seance.chargement.statut !== 'chargement' && !(phase === 'direct' && direct && !etat.element);
  const diffusableRef = useRef(diffusable);
  const commandes = useRef<(c: CommandeRegie) => void>(() => {});

  useEffect(() => {
    etatRef.current = etat;
    diffusableRef.current = diffusable;
    if (diffusable) canal.current?.envoyer({ type: 'etat', etat });
  }, [etat, diffusable]);

  useEffect(() => {
    const c = ouvrirCanal('regie');
    canal.current = c;
    c.envoyer({ type: 'presence', present: true });
    const desabonner = c.ecouter((message, enveloppe) => {
      if (message.type === 'demande-etat') {
        if (diffusableRef.current) c.envoyer({ type: 'etat', etat: etatRef.current });
      } else if (message.type === 'presence' && enveloppe.role === 'sortie') {
        setSortie(message.present ? { ouverte: true, largeur: message.largeur, hauteur: message.hauteur } : { ouverte: false });
      } else if (message.type === 'commande') {
        commandes.current(message.commande);
      }
    });
    const auDepart = () => c.envoyer({ type: 'presence', present: false });
    window.addEventListener('pagehide', auDepart);
    return () => {
      window.removeEventListener('pagehide', auDepart);
      auDepart();
      desabonner();
      c.fermer();
      canal.current = null;
    };
  }, []);

  // ─── Plateforme : écrans, fermeture de la sortie, veille ───────────────────
  useEffect(() => {
    void lireAffectationsEcrans(plateforme)
      .then((a) => {
        affectationsRef.current = a;
        setAffectations(a);
      })
      .catch(() => {});
    // Sur le bureau, lister les écrans ne demande rien. Sur le web, c'est une demande
    // d'autorisation : elle attend un geste (menu Sortie).
    if (plateforme.estBureau()) void plateforme.listerEcrans().then(setEcrans).catch(() => {});
    const sansEcrans = plateforme.surChangementEcrans(setEcrans);
    const sansFermeture = plateforme.surFermetureSortie((nom) => {
      if (nom === 'sortie') setSortie({ ouverte: false });
    });
    return () => {
      sansEcrans();
      sansFermeture();
    };
  }, [plateforme]);

  useEffect(() => {
    if (phase !== 'direct') return;
    let verrou: Awaited<ReturnType<typeof plateforme.empecherVeille>> = null;
    let actif = true;
    void plateforme
      .empecherVeille()
      .then((v) => {
        if (actif) verrou = v;
        else void v?.liberer();
      })
      .catch(() => {});
    return () => {
      actif = false;
      void verrou?.liberer();
    };
  }, [phase, plateforme]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'adresse dépend de window, connue après hydratation
    setOrigineQr(window.location);
  }, []);

  // ─── Thème de sortie : il suit les réglages, même modifiés dans une autre fenêtre ─
  const themeReglages = useMemo(() => themeSortieDepuisReglages(reglages), [reglages]);
  useEffect(() => {
    const actuel = etatRef.current.theme;
    const change = (Object.keys(themeReglages) as (keyof ThemeSortie)[]).some((k) => themeReglages[k] !== undefined && themeReglages[k] !== actuel[k]);
    if (change) envoyer({ type: 'appliquerTheme', theme: themeReglages });
  }, [themeReglages]);

  // ─── Séance enregistrée : un rechargement reprend où l'on en était ─────────
  useEffect(() => {
    if (!pret) return;
    const minuterie = window.setTimeout(() => {
      const enregistree: SeanceEnregistree = {
        v: 1,
        setlist,
        origine,
        phase,
        direct,
        bilingue: etat.bilingue,
        enregistreeLe: Date.now(),
      };
      void ecrirePreference(CLE_SEANCE, enregistree).catch(() => {});
    }, 500);
    return () => window.clearTimeout(minuterie);
  }, [pret, setlist, origine, phase, direct, etat.bilingue]);

  // ─── Sortie ────────────────────────────────────────────────────────────────
  const ecranRetenu = Object.entries(affectations).find(([, a]) => a === 'sortie')?.[0] ?? null;
  const ecranMusiciens = Object.entries(affectations).find(([, a]) => a === 'musiciens')?.[0] ?? null;
  const ecranCible = useMemo(() => {
    if (!ecrans) return null;
    return ecrans.find((e) => e.id === ecranRetenu) ?? ecrans.find((e) => !e.principal) ?? null;
  }, [ecrans, ecranRetenu]);

  /** Retient (ou oublie, avec null) l'écran d'un rôle, comme le fait la page Réglages. */
  const retenirEcran = useCallback(
    (id: string | null, role: Exclude<AffectationEcran, 'rien'>) => {
      const suivant = reaffecterEcran(affectationsRef.current, id, role);
      affectationsRef.current = suivant;
      setAffectations(suivant);
      void plateforme.ecrirePreference(CLE_AFFECTATIONS_ECRANS, suivant).catch(() => {});
    },
    [plateforme]
  );

  const messageErreurSortie = useCallback(
    (e: unknown) => {
      if (e instanceof ErreurPlateforme) {
        if (e.code === 'fenetre-bloquee') return t.erreurFenetreBloquee;
        if (e.code === 'ecran-introuvable') return t.erreurEcranIntrouvable;
        if (e.code === 'permission-refusee') return t.erreurPermission;
      }
      return t.erreurSortie;
    },
    [t]
  );

  /** À appeler dans un geste (clic, touche) : sinon le navigateur bloque la fenêtre. */
  const ouvrirSortie = useCallback(
    (ecranId?: string | null) => {
      setErreurSortie(null);
      const peutCibler = plateforme.peutChoisirEcran();
      const cible = peutCibler ? (ecranId !== undefined ? ecranId : (ecranRetenu ?? ecranCible?.id ?? null)) : null;
      const essai = (id: string | null) => plateforme.ouvrirSortie({ nom: 'sortie', route: '/sortie/', ecranId: id, pleinEcran: true });
      essai(cible)
        .then(() => setSortie((s) => ({ ...s, ouverte: true })))
        .catch((e: unknown) => {
          // Écran débranché depuis le dernier culte : on oublie le choix et on ouvre quand même.
          if (e instanceof ErreurPlateforme && e.code === 'ecran-introuvable' && cible) {
            retenirEcran(null, 'sortie');
            return essai(null)
              .then(() => setSortie((s) => ({ ...s, ouverte: true })))
              .catch((e2: unknown) => setErreurSortie(messageErreurSortie(e2)));
          }
          setErreurSortie(messageErreurSortie(e));
        });
    },
    [plateforme, ecranRetenu, ecranCible, messageErreurSortie, retenirEcran]
  );

  const choisirEcran = useCallback(
    (id: string) => {
      retenirEcran(id, 'sortie');
      ouvrirSortie(id);
    },
    [retenirEcran, ouvrirSortie]
  );

  const listerEcrans = useCallback(() => {
    plateforme
      .listerEcrans()
      .then(setEcrans)
      .catch(() => setErreurSortie(t.erreurPermission));
  }, [plateforme, t]);

  const fermerSortie = useCallback(() => {
    void plateforme.fermerSortie('sortie');
    setSortie({ ouverte: false });
  }, [plateforme]);

  const ouvrirMusiciens = useCallback(() => {
    // L'écran choisi dans les réglages, s'il existe encore ; sinon une fenêtre ordinaire.
    const id = plateforme.peutChoisirEcran() ? ecranMusiciens : null;
    const essai = (ecranId: string | null) =>
      plateforme.ouvrirSortie({ nom: 'musiciens', route: '/musiciens/', ecranId, pleinEcran: !!ecranId });
    essai(id).catch((e: unknown) => {
      if (e instanceof ErreurPlateforme && e.code === 'ecran-introuvable' && id) {
        essai(null).catch((e2: unknown) => setErreurSortie(messageErreurSortie(e2)));
        return;
      }
      setErreurSortie(messageErreurSortie(e));
    });
  }, [plateforme, ecranMusiciens, messageErreurSortie]);

  // ─── Projection ────────────────────────────────────────────────────────────
  const projeterPosition = useCallback(
    (pos: PositionSetlist) => {
      const el = nav[pos.element];
      const d = el?.diapositives[pos.diapositive];
      if (!el || !d) return;
      envoyer({ type: 'projeter', element: el, index: pos.diapositive, suivante: suivanteDepuis(nav, pos) });
      const p = { idElement: el.id, diapositive: pos.diapositive };
      setDirect(p);
      setDernierDirect(p);
      setVue(el.id);
      setProjetees((s) => (s.has(d.id) ? s : new Set(s).add(d.id)));
    },
    [nav]
  );

  const lancer = useCallback(
    (depart?: PositionSetlist) => {
      if (!sortie.ouverte) ouvrirSortie();
      setMenuOuvert(false);
      setPhase('direct');
      if (depart) {
        projeterPosition(depart);
      } else {
        // La sortie montre d'abord le logo ; la première diapositive attend « Suivant ».
        envoyer({ type: 'logoSeul' });
        setDirect(null);
        const p = premierePosition(nav);
        setVue(p ? (nav[p.element]?.id ?? null) : null);
      }
    },
    [sortie.ouverte, ouvrirSortie, projeterPosition, nav]
  );

  const suivant = useCallback(() => {
    if (phase !== 'direct') return;
    const p = posDirect ? positionSuivante(nav, posDirect) : premierePosition(nav);
    if (p) projeterPosition(p);
  }, [phase, posDirect, nav, projeterPosition]);

  const precedent = useCallback(() => {
    if (phase !== 'direct' || !posDirect) return;
    const p = positionPrecedente(nav, posDirect);
    if (p) projeterPosition(p);
  }, [phase, posDirect, nav, projeterPosition]);

  const terminer = useCallback(() => {
    setPhase('fin');
    envoyer({ type: 'logoSeul' });
    setDirect(null);
    setVue(null);
    barre.vider();
  }, [barre]);

  const reprendre = useCallback(() => {
    setPhase('direct');
    const p = versPositionIndex(nav, dernierDirect);
    if (p) projeterPosition(p);
    else envoyer({ type: 'logoSeul' });
  }, [nav, dernierDirect, projeterPosition]);

  const revenirDirect = useCallback(() => setVue(direct?.idElement ?? null), [direct]);

  const echap = useCallback(() => {
    setMenuOuvert(false);
    if (barre.ouverte) barre.vider();
    else revenirDirect();
  }, [barre, revenirDirect]);

  const basculer = useCallback(
    (type: 'basculerEcranNoir' | 'basculerMasquerTexte' | 'basculerLogo') => {
      if (phase === 'direct') envoyer({ type });
    },
    [phase]
  );

  // ─── Setlist ───────────────────────────────────────────────────────────────
  const ajouterDepuisBarre = useCallback(() => {
    const ajouts = barre.elementsAAjouter();
    if (ajouts.length === 0) return;
    seance.ajouter(ajouts);
    barre.vider();
    setAnnonce(formater(ajouts.length > 1 ? t.ajoutesN : t.ajouteUn, { n: ajouts.length }));
    // En plein culte, un ajout rapide rend aussitôt la main aux flèches et à Espace.
    if (phase === 'direct') champBarre.current?.blur();
  }, [barre, seance, t, phase]);

  const voir = useCallback(
    (id: string) => {
      if (barre.ouverte) barre.vider();
      setVue(id);
    },
    [barre]
  );

  const projeterDansVue = useCallback(
    (index: number) => {
      const element = nav.findIndex((e) => e.id === vue);
      if (element < 0) return;
      const pos = { element, diapositive: index };
      if (phase === 'direct') projeterPosition(pos);
      else if (phase === 'preparation') lancer(pos);
    },
    [nav, vue, phase, projeterPosition, lancer]
  );

  const preparerProchain = useCallback(async () => {
    // Rien ne se perd : une setlist composée dans la régie est gardée avant de repartir.
    if (origine.type !== 'locale' && origine.type !== 'exemple' && setlist.elements.length > 0) {
      await seance.garder().catch(() => {});
    }
    seance.recommencer();
    window.setTimeout(() => champBarre.current?.focus(), 0);
  }, [origine.type, setlist.elements.length, seance]);

  const partager = useCallback(async (): Promise<string> => {
    const api = obtenirClientApi();
    let id = setlist.idServeur ?? (origine.type === 'serveur' ? origine.id : null) ?? idServeurCree.current.get(setlist.id) ?? null;
    if (!id) {
      const songIds = setlist.elements.flatMap((e) => (e.type === 'chant' ? [e.chantId] : []));
      const creee = await api.creerSetlist({ name: setlist.nom, songIds });
      id = creee.id;
      idServeurCree.current.set(setlist.id, id);
    }
    const code = await api.codePartageSetlist(id);
    const texte = formater(t.partageMessage, { nom: setlist.nom, code });
    try {
      if (navigator.share) await navigator.share({ title: setlist.nom, text: texte });
      else await navigator.clipboard?.writeText(texte);
    } catch {
      // Partage annulé : le code reste affiché.
    }
    return code;
  }, [setlist, origine, t]);

  // ─── Téléphones : télécommande et assemblée (une salle pour tout le culte) ──
  /** Verset demandé « maintenant » : projeté dès que ses diapositives sont prêtes. */
  const aProjeter = useRef<string | null>(null);
  const surPassage = useCallback<NonNullable<OptionsRelaisRegie['surPassage']>>(
    (demande) => {
      const ref = analyserReference(demande.reference);
      if (!ref) return;
      const element: ElementSetlist = {
        type: 'bible',
        id: nouvelIdentifiant(),
        reference: formaterReference(ref, 'fr'),
        version: demande.version,
        secondeVersion: seconde && seconde !== demande.version ? seconde : null,
      };
      // Juste après l'élément en direct : c'est ce que le prédicateur va lire.
      seance.ajouter([{ element }], direct?.idElement ?? null);
      if (demande.quand === 'maintenant' && phase === 'direct') aProjeter.current = element.id;
      setAnnonce(formater(t.versetDemande, { reference: element.reference }));
    },
    [seance, direct, phase, seconde, t]
  );
  const relais = useRelaisRegie({ langueParoles: reglages.langueParoles, surPassage });
  const codeSalle = relais.invitation?.codeSalle ?? null;
  const telephonesAppaires = relais.appareils.filter((a) => a.role === 'telecommande' && a.statut === 'accepte').length;
  const telephonesAssemblee = relais.appareils.filter((a) => a.role === 'assemblee').length;
  const urlQr = useMemo(() => (origineQr ? urlSuivre(origineQr, codeSalle) : null), [origineQr, codeSalle]);

  useEffect(() => {
    if (etat.codeSalle !== codeSalle) envoyer({ type: 'definirSalle', codeSalle });
  }, [codeSalle, etat.codeSalle]);

  useEffect(() => {
    const id = aProjeter.current;
    if (!id || phase !== 'direct') return;
    const i = nav.findIndex((e) => e.id === id);
    if (i < 0) return;
    if (resolus.get(id)?.statut === 'erreur') {
      aProjeter.current = null;
    } else if ((nav[i]?.diapositives.length ?? 0) > 0) {
      aProjeter.current = null;
      projeterPosition({ element: i, diapositive: 0 });
    }
  }, [nav, resolus, phase, projeterPosition]);

  // ─── Ordre du culte, joint à l'état pour les musiciens et les téléphones ───
  const programme = useMemo(
    () => (phase === 'fin' || nav.length === 0 ? null : resumerProgramme(setlist.nom, nav, posDirect?.element ?? -1)),
    [phase, nav, setlist.nom, posDirect?.element]
  );
  // Comparé par contenu : la liste développée change d'identité à chaque résolution.
  const cleProgramme = JSON.stringify(programme);
  const programmeRef = useRef(programme);
  useEffect(() => {
    programmeRef.current = programme;
  });
  useEffect(() => {
    envoyer({ type: 'definirProgramme', programme: programmeRef.current });
  }, [cleProgramme]);

  // ─── Commandes (télécommande locale, touches relayées par la sortie) ───────
  useEffect(() => {
    commandes.current = (c: CommandeRegie) => {
      switch (c) {
        case 'suivante':
          suivant();
          break;
        case 'precedente':
          precedent();
          break;
        case 'ecran-noir':
          basculer('basculerEcranNoir');
          break;
        case 'masquer-texte':
          basculer('basculerMasquerTexte');
          break;
        case 'logo':
          basculer('basculerLogo');
          break;
        case 'bilingue':
          envoyer({ type: 'basculerBilingue' });
          break;
        case 'revenir-direct':
          revenirDirect();
          break;
      }
    };
  }, [suivant, precedent, basculer, revenirDirect]);

  // ─── Raccourcis clavier, sur la page régie seulement ───────────────────────
  const raccourcis = useRef({ suivant, precedent, basculer, echap });
  useEffect(() => {
    raccourcis.current = { suivant, precedent, basculer, echap };
  }, [suivant, precedent, basculer, echap]);

  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return;
      if (estSaisie(e.target) || glissement.current) return;
      // Menu de sortie, boîte d'appairage : leurs touches leur appartiennent (Échap ferme).
      if (e.target instanceof HTMLElement && e.target.closest('[data-clavier-libre], dialog')) {
        if (e.key !== 'Escape' || e.target.closest('dialog')) return;
      }
      const r = raccourcis.current;
      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
          e.preventDefault();
          r.suivant();
          break;
        case ' ':
          if (espaceAppartientACible(e.target)) return;
          e.preventDefault();
          r.suivant();
          break;
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          r.precedent();
          break;
        case 'b':
        case 'B':
        case '.':
          e.preventDefault();
          r.basculer('basculerEcranNoir');
          break;
        case 't':
        case 'T':
          e.preventDefault();
          r.basculer('basculerMasquerTexte');
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          r.basculer('basculerLogo');
          break;
        case 'Escape':
          r.echap();
          break;
        case '/':
          e.preventDefault();
          champBarre.current?.focus();
          break;
      }
    };
    window.addEventListener('keydown', auClavier);
    return () => window.removeEventListener('keydown', auClavier);
  }, []);

  // ─── Valeurs dérivées ──────────────────────────────────────────────────────
  const dimensions = sortie.largeur && sortie.hauteur ? formater(t.dimensions, { largeur: sortie.largeur, hauteur: sortie.hauteur }) : null;
  const libelleEcran = ecranCible?.libelle ?? t.ecranDeux;
  const resumeSortie = !sortie.ouverte
    ? t.sortieFermee
    : estBureau
      ? [libelleEcran, dimensions].filter(Boolean).join(' · ')
      : [t.fenetreOuverte, dimensions].filter(Boolean).join(' · ');

  const idVue = phase === 'fin' ? null : (vue ?? (phase === 'direct' ? (direct?.idElement ?? nav[0]?.id ?? null) : null));
  const elementVue = idVue ? setlist.elements.find((e) => e.id === idVue) : undefined;
  const indexVue = elementVue ? nav.findIndex((e) => e.id === elementVue.id) : -1;
  const prochaine = phase === 'direct' ? (posDirect ? positionSuivante(nav, posDirect) : premierePosition(nav)) : null;

  const statuts = [...resolus.values()];
  const enChargement = setlist.elements.length - statuts.filter((r) => r.statut !== 'chargement').length;
  const enErreur = statuts.filter((r) => r.statut === 'erreur').length;
  const peutLancer = nav.some((e) => e.diapositives.length > 0);

  // ─── Rendu ─────────────────────────────────────────────────────────────────
  let centre: ReactNode;
  if (seance.chargement.statut === 'chargement') {
    centre = (
      <section className={styles.panneauCentre}>
        <EtatCentre genre="chargement" titre={t.chargementSeance} />
      </section>
    );
  } else if (seance.chargement.statut === 'echec') {
    const cause = seance.chargement.cause;
    centre = (
      <section className={styles.panneauCentre}>
        <EtatCentre
          genre="erreur"
          titre={cause === 'compte' ? t.echecCompteTitre : cause === 'reseau' ? t.echecReseauTitre : t.echecIntrouvableTitre}
          texte={cause === 'compte' ? t.echecCompteTexte : cause === 'reseau' ? t.echecReseauTexte : t.echecIntrouvableTexte}
          actions={
            <>
              <Bouton variante="plein" taille="grande" href="/setlists/">
                {t.ouvrirMesSetlists}
              </Bouton>
              <Bouton variante="secondaire" taille="grande" onClick={seance.recommencer}>
                {t.nouvelleSetlist}
              </Bouton>
            </>
          }
        />
      </section>
    );
  } else if (barre.ouverte) {
    centre = <PanneauCompris barre={barre} surAjouter={ajouterDepuisBarre} />;
  } else if (phase === 'fin') {
    centre = (
      <FinCulte
        diapositivesProjetees={projetees.size}
        dejaGardee={origine.type === 'locale'}
        estConnecte={session.estConnecte}
        urlShephr={URL_SHEPHR}
        surGarder={async () => {
          await seance.garder();
        }}
        surPartager={partager}
        surPreparer={() => void preparerProchain()}
        surReprendre={reprendre}
      />
    );
  } else if (elementVue) {
    centre = (
      <PanneauDiapositives
        phase={phase}
        element={elementVue}
        resolu={resolus.get(elementVue.id)}
        indexDirect={phase === 'direct' && direct?.idElement === elementVue.id ? direct.diapositive : null}
        indexSuivante={prochaine && prochaine.element === indexVue ? prochaine.diapositive : null}
        horsDirect={!!direct && direct.idElement !== elementVue.id}
        surProjeter={projeterDansVue}
        surRevenirDirect={revenirDirect}
        surRetourControle={() => setVue(null)}
        surReessayer={seance.reessayer}
      />
    );
  } else if (setlist.elements.length === 0) {
    centre = (
      <section className={styles.panneauCentre}>
        <EtatRienAProjeter surEssayerExemple={seance.essayerExemple} hrefSetlists="/setlists/" />
      </section>
    );
  } else {
    centre = (
      <ListeControle
        estBureau={estBureau}
        sortieOuverte={sortie.ouverte}
        libelleEcran={libelleEcran}
        dimensions={dimensions}
        peutChoisirEcran={plateforme.peutChoisirEcran()}
        total={setlist.elements.length}
        enChargement={enChargement}
        enErreur={enErreur}
        qrDisponible={!!urlQr}
        qrAffiche={etat.theme.afficherQr}
        peutLancer={peutLancer}
        surOuvrirSortie={() => ouvrirSortie()}
        surChoisirEcran={() => setMenuOuvert(true)}
        surReessayer={() => seance.reessayer()}
        surOuvrirMusiciens={ouvrirMusiciens}
        surLancer={() => lancer()}
      />
    );
  }

  const statut =
    phase === 'direct'
      ? etat.ecranNoir
        ? formater(t.statutDirectNoir, { direct: t.enDirect })
        : t.enDirect
      : phase === 'fin'
        ? t.statutFin
        : t.statutPreparation;

  return (
    <div className={styles.page}>
      <header className={styles.entete}>
        <div className={styles.marque}>
          <span className={styles.logo} aria-hidden="true">
            <Icone nom="musique" taille={18} epaisseur={1.6} />
          </span>
          <span className={styles.marqueTextes}>
            <span className={styles.nomApp}>{t.nomApp}</span>
            <span className="meta">{t.regie}</span>
          </span>
        </div>

        {phase !== 'fin' && <ChampBarreUnique ref={champBarre} barre={barre} surAjouter={ajouterDepuisBarre} />}
        {phase === 'fin' && <span className={styles.espace} />}

        <div className={styles.actions}>
          {phase !== 'fin' && (
            <>
              <Bouton
                variante="secondaire"
                taille="compacte"
                icone="telephone"
                className={styles.boutonEntete}
                aria-haspopup="dialog"
                onClick={() => setAppairageOuvert(true)}
              >
                {telephonesAppaires > 0 ? t.telephoneAppaire : t.telecommande}
              </Bouton>
              <button
                type="button"
                aria-pressed={etat.theme.afficherQr}
                disabled={!urlQr}
                title={urlQr ? undefined : t.verifQrIndisponible}
                className={styles.boutonBascule}
                onClick={() => envoyer({ type: 'appliquerTheme', theme: { afficherQr: !etat.theme.afficherQr } })}
              >
                <Icone nom="qr" />
                {t.parolesPartagees}
              </button>
            </>
          )}
          <div className={styles.ancreMenu}>
            <button
              type="button"
              className={styles.boutonBascule}
              aria-expanded={menuOuvert}
              aria-controls={ID_MENU_SORTIE}
              data-menu-sortie=""
              onClick={() => setMenuOuvert((o) => !o)}
            >
              <Icone nom="ecran" />
              {estBureau ? formater(t.sortieEcran, { ecran: libelleEcran }) : t.fenetreSortie}
              <Icone nom="chevronBas" taille={16} />
            </button>
            <MenuSortie
              id={ID_MENU_SORTIE}
              ouvert={menuOuvert}
              sortieOuverte={sortie.ouverte}
              peutChoisirEcran={plateforme.peutChoisirEcran()}
              ecrans={ecrans}
              ecranRetenu={ecranCible?.id ?? null}
              peutFermer={phase !== 'direct'}
              surFermerMenu={() => setMenuOuvert(false)}
              surOuvrirSortie={() => ouvrirSortie()}
              surListerEcrans={listerEcrans}
              surChoisirEcran={choisirEcran}
              surOuvrirMusiciens={ouvrirMusiciens}
              surFermerSortie={fermerSortie}
            />
          </div>
          <div role="status" className={`${styles.statut} ${phase === 'direct' ? styles.statutDirect : ''}`}>
            {phase === 'direct' && <span className={styles.statutPoint} aria-hidden="true" />}
            {statut}
          </div>
        </div>
      </header>

      <IndicateurReseau className={styles.horsLigne} />

      <main className={styles.colonnes}>
        {pret && (
          <PanneauSetlist
            setlist={setlist}
            nav={nav}
            resolus={resolus}
            phase={phase}
            direct={direct}
            vue={idVue}
            version={version}
            seconde={seconde}
            surVersion={setVersion}
            surSeconde={setSeconde}
            surVoir={voir}
            surDeplacer={seance.deplacer}
            surReessayer={seance.reessayer}
            surAjoutRapide={() => champBarre.current?.focus()}
            surAjouterElements={(ajouts) => {
              seance.ajouter(ajouts);
              setAnnonce(formater(t.ajouteUn, { n: ajouts.length }));
            }}
            surGlissement={(actif) => {
              glissement.current = actif;
            }}
          />
        )}

        <div className={styles.centre}>{centre}</div>

        <PanneauSortie
          phase={phase}
          etat={etat}
          urlQr={urlQr}
          sortieOuverte={sortie.ouverte}
          resumeSortie={phase === 'fin' && sortie.ouverte ? t.sortieLogo : resumeSortie}
          erreurSortie={erreurSortie}
          avantPremiere={phase === 'direct' && !direct}
          suivante={etat.suivante}
          peutPrecedent={!!posDirect && !!positionPrecedente(nav, posDirect)}
          surOuvrirSortie={() => ouvrirSortie()}
          surFermerSortie={fermerSortie}
          surSuivant={suivant}
          surPrecedent={precedent}
          surTerminer={terminer}
          surEcranNoir={() => basculer('basculerEcranNoir')}
          surMasquer={() => basculer('basculerMasquerTexte')}
          surLogo={() => basculer('basculerLogo')}
          surBilingue={() => envoyer({ type: 'basculerBilingue' })}
        />
      </main>

      <footer className={styles.pied}>
        <span className={styles.securite}>
          <Icone nom="nuageOk" taille={16} />
          {t.securite}
        </span>
        {telephonesAssemblee > 0 && <span>{pluriel(telephonesAssemblee, t.assembleeUn, t.assembleeN, langue)}</span>}
        <span className={styles.espace} />
        <div role="group" aria-label={t.langueInterface} className={styles.langues}>
          {LANGUES.map((l) => (
            <button key={l} type="button" aria-pressed={langue === l} className={styles.langue} onClick={() => changerLangue(l)}>
              {l === 'fr' ? t.francais : t.anglais}
            </button>
          ))}
        </div>
      </footer>

      <DialogueAppairage ouvert={appairageOuvert} surFermeture={() => setAppairageOuvert(false)} relais={relais} />

      <p className="visuellement-masque" role="status">
        {annonce}
      </p>
    </div>
  );
}
