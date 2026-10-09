'use client';

/**
 * La setlist de la séance : d'où elle vient (?setlist=, ?serveur=, ?exemple, ou la séance
 * reprise après un rechargement), ce que chaque élément est devenu, et où vont les
 * modifications.
 *
 * Paramètres de /regie/ :
 *   ?setlist=<id>   setlist locale (IndexedDB) — chaque réordonnancement y est enregistré ;
 *   ?serveur=<id>   setlist du compte (copie de travail ; rien n'est renvoyé au serveur) ;
 *   ?exemple        setlist d'exemple, pour découvrir sans compte ;
 *   ?chant=<id>     ajoute ce chant à la séance en cours (bouton « Projeter » d'un chant) ;
 *   ?bible=<réf>&version=LSG&seconde=KJV   ajoute ce passage à la séance en cours ;
 *   (rien)          la séance en cours si elle date de moins de 12 h, sinon une setlist vide.
 *
 * Un ajout demandé par l'adresse (?chant, ?bible) est fait une fois, puis l'adresse redevient
 * /regie/ : recharger la régie ne l'ajoute pas une seconde fois.
 */
import {
  enregistrerSetlistLocale,
  enregistrerSetlistServeur,
  lirePreference,
  lireSetlistLocale,
  lireChant,
  lireSetlistServeur,
  nouvelIdentifiant,
  nouvelleSetlist,
  depuisSetlistServeur,
  estErreurApi,
  type ChantDTO,
  type ElementSetlist,
  type SetlistDTO,
  type SetlistLocale,
} from '@cmfi/api';
import { analyserReference, formaterReference, sourceEchantillon } from '@cmfi/projection';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { lireReglages } from '@/components/reglages/stockage';
import { obtenirClientApi } from '@/lib/api';
import { formater, useLangue, useT, type Langue } from '@/lib/i18n';

import { CHANTS_SECOURS_EXEMPLE, setlistExemple } from './exemple';
import { estIdVersion, resoudreElement } from './resolution';
import {
  CLE_SEANCE,
  deplacerElement,
  elementsNavigation,
  seanceReprenable,
  type ElementResolu,
  type OrigineSetlist,
  type SeanceEnregistree,
} from './seance';

export type EchecChargement = 'introuvable' | 'compte' | 'reseau';

export type ChargementSeance =
  | { statut: 'chargement' }
  | { statut: 'pret' }
  | { statut: 'echec'; cause: EchecChargement };

/** Ce qu'une séance reprise rétablit, appliqué une fois par la régie. */
export type Reprise = Pick<SeanceEnregistree, 'phase' | 'direct' | 'bilingue'>;

interface EntreeResolue {
  signature: string;
  resolu: ElementResolu;
}

/** Ce qui, dans un élément, change ses diapositives. */
function signature(el: ElementSetlist, langue: Langue): string {
  return el.type === 'chant'
    ? `c|${el.chantId}|${el.chantSecondId ?? ''}|${el.tonalite ?? ''}|${el.recueil ?? ''}|${el.numero ?? ''}|${langue}`
    : `b|${el.reference}|${el.version}|${el.secondeVersion ?? ''}|${langue}`;
}

/** « Culte du dimanche 11 oct. » / « Service · Sunday 11 Oct ». */
export function nomCulteDuJour(modele: string, langue: Langue, date = new Date()): string {
  const jour = date.toLocaleDateString(langue === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
  return formater(modele, { jour });
}

/** L'élément que l'adresse demande d'ajouter (?chant=, ?bible=), ou null. */
async function elementDemande(
  params: { chant: string | null; bible: string | null; version: string | null; seconde: string | null },
  chantsConnus: Map<string, ChantDTO>
): Promise<ElementSetlist | null> {
  if (params.chant) {
    // Le titre s'affiche dans la setlist avant même que les diapositives soient prêtes.
    let chant: ChantDTO | undefined = chantsConnus.get(params.chant);
    if (!chant) chant = await lireChant(params.chant).catch(() => undefined);
    if (!chant) chant = await obtenirClientApi().chantParId(params.chant).catch(() => undefined);
    if (chant?.parts?.length) chantsConnus.set(chant.id, chant);
    return {
      type: 'chant',
      id: nouvelIdentifiant(),
      chantId: params.chant,
      titre: chant?.title ?? '',
      numero: chant?.position || undefined,
      langue: typeof chant?.language === 'string' ? chant.language.toLowerCase() : undefined,
    };
  }
  if (params.bible) {
    const ref = analyserReference(params.bible);
    if (!ref) return null;
    const reglages = lireReglages();
    const version = estIdVersion(params.version) ? params.version : reglages.versionBible;
    const seconde = estIdVersion(params.seconde) && params.seconde !== version ? params.seconde : null;
    return { type: 'bible', id: nouvelIdentifiant(), reference: formaterReference(ref, 'fr'), version, secondeVersion: seconde };
  }
  return null;
}

function memeOrigine(a: OrigineSetlist, b: OrigineSetlist): boolean {
  if (a.type !== b.type) return false;
  return 'id' in a && 'id' in b ? a.id === b.id : true;
}

export function useSeance() {
  const t = useT('regie');
  const { langue } = useLangue();
  const params = useSearchParams();
  const router = useRouter();
  const idLocale = params.get('setlist');
  const idServeur = params.get('serveur');
  const exemple = params.has('exemple') || params.has('demo');
  // Lus une fois au chargement (et volontairement absents des dépendances) : effacer
  // l'adresse ensuite ne relance rien.
  const demande = {
    chant: params.get('chant'),
    bible: params.get('bible'),
    version: params.get('version'),
    seconde: params.get('seconde'),
  };

  const [chargement, setChargement] = useState<ChargementSeance>({ statut: 'chargement' });
  const [setlist, setSetlist] = useState<SetlistLocale>(() => nouvelleSetlist(''));
  const [origine, setOrigine] = useState<OrigineSetlist>({ type: 'nouvelle' });
  const [reprise, setReprise] = useState<Reprise | null>(null);
  const [resolus, setResolus] = useState<ReadonlyMap<string, EntreeResolue>>(new Map());
  /**
   * Change à chaque NOUVELLE séance (chargement, exemple, prochain culte) mais pas quand la
   * setlist est gardée en cours de route : la régie y remet sa phase et sa position à zéro.
   */
  const [generation, setGeneration] = useState(0);
  /** Élément à montrer à l'ouverture (celui que l'adresse vient d'ajouter), ou null. */
  const [aVoir, setAVoir] = useState<string | null>(null);

  /** Chants déjà connus en entier : détail de setlist serveur, résultats de la barre. */
  const chantsConnus = useRef(new Map<string, ChantDTO>());
  const secours = useRef<ReadonlyMap<string, ChantDTO>>(new Map());
  /** Vrai quand la setlist a changé par la main du bénévole (et pas au chargement). */
  const modifiee = useRef(false);
  const textes = useRef(t);
  useEffect(() => {
    textes.current = t;
  }, [t]);

  // ─── Chargement ────────────────────────────────────────────────────────────
  useEffect(() => {
    let annule = false;
    const api = obtenirClientApi();
    const voulue: OrigineSetlist = exemple
      ? { type: 'exemple' }
      : idLocale
        ? { type: 'locale', id: idLocale }
        : idServeur
          ? { type: 'serveur', id: idServeur }
          : { type: 'nouvelle' };

    async function lireSeance(): Promise<SeanceEnregistree | null> {
      try {
        const s = await lirePreference<unknown>(CLE_SEANCE);
        return seanceReprenable(s) ? s : null;
      } catch {
        return null;
      }
    }

    async function charger() {
      setChargement({ statut: 'chargement' });
      modifiee.current = false;
      secours.current = voulue.type === 'exemple' ? CHANTS_SECOURS_EXEMPLE : new Map();

      // La séance en cours de CETTE setlist (régie rechargée en plein culte) : on reprend
      // exactement où l'on en était, ordre et position compris. Sans paramètre, c'est la
      // séance en cours quelle qu'elle soit (exemple lancé d'un clic, setlist composée ici).
      const seance = await lireSeance();
      const ajout = await elementDemande(demande, chantsConnus.current);
      if (ajout) {
        modifiee.current = true;
        router.replace('/regie/');
      }
      const avecAjout = (s: SetlistLocale): SetlistLocale => (ajout ? { ...s, elements: [...s.elements, ajout], modifieLe: Date.now() } : s);

      if (seance && (voulue.type === 'nouvelle' || memeOrigine(seance.origine, voulue))) {
        if (annule) return;
        setSetlist(avecAjout(seance.setlist));
        setOrigine(seance.origine);
        setReprise({ phase: seance.phase, direct: seance.direct, bilingue: seance.bilingue });
        setAVoir(ajout?.id ?? null);
        setChargement({ statut: 'pret' });
        setGeneration((g) => g + 1);
        if (seance.origine.type === 'exemple') secours.current = CHANTS_SECOURS_EXEMPLE;
        return;
      }

      let chargee: SetlistLocale | null = null;
      let echec: EchecChargement | null = null;

      if (voulue.type === 'exemple') {
        chargee = setlistExemple(textes.current.nomExemple);
      } else if (voulue.type === 'locale') {
        try {
          chargee = (await lireSetlistLocale(voulue.id)) ?? null;
        } catch {
          chargee = null;
        }
        if (!chargee) echec = 'introuvable';
      } else if (voulue.type === 'serveur') {
        let dto: SetlistDTO | null = null;
        if (!api.estConnecte) echec = 'compte';
        else {
          try {
            dto = await api.setlistParId(voulue.id);
            void enregistrerSetlistServeur(dto).catch(() => {});
          } catch (e) {
            echec = estErreurApi(e) && e.compteRequis ? 'compte' : estErreurApi(e) && e.estIntrouvable ? 'introuvable' : 'reseau';
            // Hors-ligne : la copie gardée au dernier passage fait l'affaire.
            dto = (await lireSetlistServeur(voulue.id).catch(() => undefined)) ?? null;
            if (dto) echec = null;
          }
        }
        if (dto) {
          for (const c of dto.songs ?? []) if (c.parts?.length) chantsConnus.current.set(c.id, c as ChantDTO);
          chargee = depuisSetlistServeur(dto);
        }
      } else {
        chargee = nouvelleSetlist(nomCulteDuJour(textes.current.nomCulte, langue));
      }

      if (annule) return;
      if (echec || !chargee) {
        setChargement({ statut: 'echec', cause: echec ?? 'introuvable' });
        return;
      }
      setSetlist(avecAjout(chargee));
      setOrigine(voulue);
      setReprise(null);
      setAVoir(ajout?.id ?? null);
      setChargement({ statut: 'pret' });
      setGeneration((g) => g + 1);
    }

    void charger();
    return () => {
      annule = true;
    };
    // La langue ne relance pas le chargement : elle ne sert qu'au nom d'une setlist neuve.
    // L'ajout demandé (?chant, ?bible) non plus : l'adresse est effacée une fois l'ajout fait.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exemple, idLocale, idServeur]);

  // ─── Résolution des éléments ───────────────────────────────────────────────
  /** Résolutions lancées et pas encore revenues, par élément : jamais deux fois la même. */
  const enVol = useRef(new Map<string, string>());

  useEffect(() => {
    if (chargement.statut !== 'pret') return;
    const api = obtenirClientApi();
    const aResoudre = setlist.elements.filter((el) => {
      const sig = signature(el, langue);
      return resolus.get(el.id)?.signature !== sig && enVol.current.get(el.id) !== sig;
    });

    for (const el of aResoudre) {
      const sig = signature(el, langue);
      enVol.current.set(el.id, sig);
      void resoudreElement(el, {
        api,
        bible: sourceEchantillon,
        langue,
        t: textes.current,
        chantsConnus: chantsConnus.current,
        secours: secours.current,
      })
        .catch((): ElementResolu => ({ statut: 'erreur', cause: 'reseau' }))
        .then((resolu) => {
          if (enVol.current.get(el.id) === sig) enVol.current.delete(el.id);
          // Un résultat périmé (élément modifié entre-temps) est jeté.
          if (enVol.current.has(el.id)) return;
          setResolus((avant) => new Map(avant).set(el.id, { signature: sig, resolu }));
        });
    }
  }, [chargement.statut, setlist.elements, resolus, langue]);

  // ─── Enregistrement d'une setlist locale ───────────────────────────────────
  useEffect(() => {
    if (origine.type !== 'locale' || !modifiee.current) return;
    const minuterie = window.setTimeout(() => {
      void enregistrerSetlistLocale(setlist).catch(() => {
        // Stockage refusé : la séance (en mémoire et dans `preferences`) garde l'ordre.
      });
    }, 400);
    return () => window.clearTimeout(minuterie);
  }, [setlist, origine]);

  // ─── Modifications ─────────────────────────────────────────────────────────
  const modifier = useCallback((transformer: (elements: ElementSetlist[]) => ElementSetlist[]) => {
    modifiee.current = true;
    setSetlist((s) => {
      const elements = transformer(s.elements);
      return elements === s.elements ? s : { ...s, elements, modifieLe: Date.now() };
    });
  }, []);

  /**
   * Ajout en fin de setlist (barre unique, panneau Bible), ou juste après l'élément `apres`
   * (verset demandé par la télécommande). Rien n'est jamais retiré ici.
   */
  const ajouter = useCallback(
    (ajouts: { element: ElementSetlist; chant?: ChantDTO }[], apres?: string | null) => {
      for (const a of ajouts) if (a.chant?.parts?.length && a.element.type === 'chant') chantsConnus.current.set(a.element.chantId, a.chant);
      modifier((elements) => {
        const nouveaux = ajouts.map((a) => a.element);
        const i = apres ? elements.findIndex((e) => e.id === apres) : -1;
        return i < 0 ? [...elements, ...nouveaux] : [...elements.slice(0, i + 1), ...nouveaux, ...elements.slice(i + 1)];
      });
    },
    [modifier]
  );

  const deplacer = useCallback((idActif: string, idCible: string) => modifier((elements) => deplacerElement(elements, idActif, idCible)), [modifier]);

  /** Relance la résolution des éléments en erreur (réseau revenu). */
  const reessayer = useCallback((id?: string) => {
    setResolus((avant) => {
      const apres = new Map(avant);
      for (const [cle, entree] of avant) if ((!id || cle === id) && entree.resolu.statut === 'erreur') apres.delete(cle);
      return apres;
    });
  }, []);

  /** Repart d'une setlist vide (« Préparer le prochain culte »). */
  const recommencer = useCallback(() => {
    modifiee.current = false;
    secours.current = new Map();
    setSetlist(nouvelleSetlist(nomCulteDuJour(textes.current.nomCulte, langue)));
    setOrigine({ type: 'nouvelle' });
    setReprise(null);
    setAVoir(null);
    setChargement({ statut: 'pret' });
    setGeneration((g) => g + 1);
  }, [langue]);

  /** Démarre la setlist d'exemple sans changer d'adresse. */
  const essayerExemple = useCallback(() => {
    modifiee.current = false;
    secours.current = CHANTS_SECOURS_EXEMPLE;
    setSetlist(setlistExemple(textes.current.nomExemple));
    setOrigine({ type: 'exemple' });
    setReprise(null);
    setAVoir(null);
    setChargement({ statut: 'pret' });
    setGeneration((g) => g + 1);
  }, []);

  /**
   * Garde la setlist dans « Mes setlists » (IndexedDB). Une setlist déjà locale l'est déjà ;
   * les autres sont copiées sous un nouvel identifiant de setlist, et la séance continue sur
   * la copie. Les éléments gardent le leur : leurs diapositives et la position en direct
   * restent valables.
   */
  const garder = useCallback(async (): Promise<string> => {
    if (origine.type === 'locale') {
      await enregistrerSetlistLocale(setlist);
      return origine.id;
    }
    const copie = nouvelleSetlist(setlist.nom, setlist.elements);
    copie.idServeur = origine.type === 'serveur' ? origine.id : null;
    await enregistrerSetlistLocale(copie);
    modifiee.current = false;
    setSetlist(copie);
    setOrigine({ type: 'locale', id: copie.id });
    return copie.id;
  }, [origine, setlist]);

  // Un élément sans résolution est « en chargement ». Une résolution périmée (langue changée)
  // reste affichée jusqu'à la nouvelle : rien ne disparaît de l'écran en plein culte.
  const resolusSimples = useMemo(() => {
    const m = new Map<string, ElementResolu>();
    for (const el of setlist.elements) m.set(el.id, resolus.get(el.id)?.resolu ?? { statut: 'chargement' });
    return m as ReadonlyMap<string, ElementResolu>;
  }, [setlist.elements, resolus]);

  const nav = useMemo(() => elementsNavigation(setlist.elements, resolusSimples), [setlist.elements, resolusSimples]);

  return {
    chargement,
    generation,
    setlist,
    origine,
    reprise,
    aVoir,
    resolus: resolusSimples,
    nav,
    ajouter,
    deplacer,
    reessayer,
    recommencer,
    essayerExemple,
    garder,
  };
}

export type Seance = ReturnType<typeof useSeance>;
