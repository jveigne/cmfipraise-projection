/**
 * Résolution d'un élément de setlist en diapositives : chercher le chant (copie locale
 * d'abord, serveur ensuite), lire le passage biblique, découper.
 *
 * L'ordre « local puis serveur » n'est pas un détail : le dimanche matin, le réseau de la
 * salle est le maillon faible. Ce qui a été ouvert une fois doit se projeter sans lui.
 * Rien ici ne lève : un échec devient un `ElementResolu` en erreur, que la régie affiche
 * sans jamais toucher à ce qui est projeté.
 */
import { enregistrerChant, estErreurApi, lireChant, type ChantDTO, type ClientApi, type ElementSetlist } from '@cmfi/api';
import {
  analyserReference,
  elementDepuisChant,
  elementDepuisPassage,
  nomTonalite,
  type BibleSource,
  type IdVersion,
} from '@cmfi/projection';

import { formater, pluriel, type Langue, type Textes } from '@/lib/i18n';

import type { CauseIndisponible, ElementResolu } from './seance';

export interface ContexteResolution {
  api: ClientApi;
  bible: BibleSource;
  langue: Langue;
  t: Textes<'regie'>;
  /** Chants déjà connus en entier (setlist du serveur détaillée, résultat de la barre unique). */
  chantsConnus: ReadonlyMap<string, ChantDTO>;
  /** Copies d'exemple embarquées, utilisées seulement si rien d'autre ne répond. */
  secours: ReadonlyMap<string, ChantDTO>;
}

const VERSIONS: readonly IdVersion[] = ['LSG', 'KJV'];

export function estIdVersion(v: string | null | undefined): v is IdVersion {
  return !!v && (VERSIONS as readonly string[]).includes(v);
}

/** Un chant n'est projetable que s'il a des paroles (les réponses de liste n'en ont pas). */
function aDesParoles(c: ChantDTO | undefined): c is ChantDTO {
  return !!c && ((c.parts?.length ?? 0) > 0 || (c.verses?.length ?? 0) > 0);
}

type ResultatChant = { chant: ChantDTO; exemple: boolean } | { cause: CauseIndisponible };

/** Copie locale, puis serveur (mise en cache au passage), puis copie d'exemple. */
export async function trouverChant(id: string, ctx: Pick<ContexteResolution, 'api' | 'chantsConnus' | 'secours'>): Promise<ResultatChant> {
  const connu = ctx.chantsConnus.get(id);
  if (aDesParoles(connu)) return { chant: connu, exemple: false };

  try {
    const local = await lireChant(id);
    if (aDesParoles(local)) return { chant: local, exemple: false };
  } catch {
    // IndexedDB indisponible (navigation privée…) : on passe au serveur.
  }

  let cause: CauseIndisponible = 'reseau';
  try {
    const distant = await ctx.api.chantParId(id);
    if (aDesParoles(distant)) {
      void enregistrerChant(distant).catch(() => {});
      return { chant: distant, exemple: false };
    }
    cause = 'introuvable';
  } catch (e) {
    cause = estErreurApi(e) && e.estIntrouvable ? 'introuvable' : 'reseau';
  }

  const secours = ctx.secours.get(id);
  if (aDesParoles(secours)) return { chant: secours, exemple: true };
  return { cause };
}

function metaChant(el: Extract<ElementSetlist, { type: 'chant' }>, chant: ChantDTO, ctx: ContexteResolution, exemple: boolean): string {
  const { t, langue } = ctx;
  const morceaux: string[] = [];
  if (chant.ownerId) morceaux.push(t.monChant);
  else if (el.recueil) morceaux.push(el.recueil);
  if (el.numero) morceaux.push(formater(t.numero, { n: el.numero }));
  const racine = el.tonalite ?? chant.keyRootIndex;
  if (racine != null) morceaux.push(nomTonalite(racine, !!chant.keyIsMinor, langue));
  if (morceaux.length === 0) morceaux.push(chant.artist?.trim() || chant.author?.trim() || t.chantDuRecueil);
  if (exemple) morceaux.push(t.exemple);
  return morceaux.join(' · ');
}

export async function resoudreElement(el: ElementSetlist, ctx: ContexteResolution): Promise<ElementResolu> {
  if (el.type === 'chant') {
    const principal = await trouverChant(el.chantId, ctx);
    if ('cause' in principal) return { statut: 'erreur', cause: principal.cause };

    // La seconde langue est un plus : son absence ne rend jamais le chant inutilisable.
    let chantSecond: ChantDTO | null = null;
    let secondeManquante = false;
    if (el.chantSecondId) {
      const second = await trouverChant(el.chantSecondId, ctx);
      if ('chant' in second) chantSecond = second.chant;
      else secondeManquante = true;
    }

    const projete = elementDepuisChant(principal.chant, {
      idElement: el.id,
      chantSecond,
      meta: metaChant(el, principal.chant, ctx, principal.exemple),
      personnel: !!principal.chant.ownerId,
    });
    // Tonalité choisie pour ce culte : les accords restent ancrés dans l'originale et l'écran
    // des musiciens les décale de `transposition`. Sans tonalité originale connue, on ne
    // peut pas transposer : la tonalité choisie sert seulement de repère.
    if (el.tonalite != null) {
      if (projete.tonalite) projete.transposition = (((el.tonalite - projete.tonalite.racine) % 12) + 12) % 12;
      else projete.tonalite = { racine: el.tonalite, mineur: !!principal.chant.keyIsMinor };
    }
    if (projete.diapositives.length === 0) return { statut: 'erreur', cause: 'introuvable' };
    return { statut: 'pret', projete, exemple: principal.exemple, echantillon: false, incomplet: false, secondeManquante };
  }

  const reference = analyserReference(el.reference);
  if (!reference) return { statut: 'erreur', cause: 'reference' };
  if (!estIdVersion(el.version)) return { statut: 'erreur', cause: 'version' };

  try {
    const passage = await ctx.bible.lirePassage(el.version, reference);
    if (!passage) return { statut: 'erreur', cause: 'bible-absente' };
    const second =
      estIdVersion(el.secondeVersion) && el.secondeVersion !== el.version
        ? await ctx.bible.lirePassage(el.secondeVersion, reference)
        : null;

    const { t } = ctx;
    const versions = [passage.version.abrege, second?.version.abrege].filter(Boolean).join(' + ');
    const morceaux = [t.bible, versions, pluriel(passage.versets.length, t.versetUn, t.versetsN, ctx.langue)];
    if (passage.version.echantillon) morceaux.push(t.echantillon);

    const projete = elementDepuisPassage(passage, second, { idElement: el.id, meta: morceaux.join(' · ') });
    return {
      statut: 'pret',
      projete,
      exemple: false,
      echantillon: passage.version.echantillon || !!second?.version.echantillon,
      incomplet: passage.incomplet,
      secondeManquante: !!el.secondeVersion && !second,
    };
  } catch {
    return { statut: 'erreur', cause: 'bible-absente' };
  }
}
