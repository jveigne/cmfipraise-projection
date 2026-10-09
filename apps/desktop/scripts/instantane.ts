/**
 * Instantané des données embarquées dans l'app de bureau : recueils officiels, catégories et
 * Bibles du domaine public, écrits en JSON dans les ressources de l'app (servis sous
 * app://cmfi/_donnees/). Au premier lancement, la web app les recopie dans IndexedDB : le
 * premier culte marche même si l'ordinateur n'a jamais vu Internet.
 *
 * Deux sources :
 *  - « echantillon » (par défaut) : aucun recueil, et les Bibles de l'échantillon de
 *    @cmfi/projection (Jean 3:16, Psaume 23 en LSG et KJV). Build hors réseau, reproductible.
 *  - « api » (CMFI_INSTANTANE=api) : recueils et catégories tirés du backend au moment du
 *    build, par le même ClientApi que la web app. Depuis Node, pas d'en-tête Origin : le
 *    CORS du backend ne s'applique pas. Un échec arrête le build — mieux vaut pas de paquet
 *    qu'un paquet sans recueils qui se croit complet.
 *
 * Point d'extension Bible : quand l'import complet existera (LSG 1910 et KJV entières, depuis
 * une édition de référence relue), `biblesEmbarquees` lira ces fichiers au lieu de
 * l'échantillon. Le format « versets » reste le même.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { ClientApi, configDepuisRacine, type CategorieDTO, type LangueContenu, type RecueilEnCache } from '@cmfi/api';
import { LIVRES, sourceEchantillon, type IdVersion, type VersetBiblique, type VersionBible } from '@cmfi/projection';

/** Incrémenté si la forme des fichiers change : la web app ignore un format qu'elle ne connaît pas. */
export const FORMAT_INSTANTANE = 1;

export type SourceInstantane = 'echantillon' | 'api';

export interface EntreeRecueil {
  langue: LangueContenu;
  titre: string;
  version: number;
  nombreChants: number;
  /** Relatif à /_donnees/. Contenu : Omit<RecueilEnCache, 'enregistreLe'>. */
  fichier: string;
}

export interface EntreeCategories {
  langue: LangueContenu;
  /** Contenu : CategorieDTO[]. */
  fichier: string;
}

export interface EntreeBible {
  version: IdVersion;
  nom: string;
  langue: 'fr' | 'en';
  /** Vrai tant que seule une poignée de passages est disponible. */
  echantillon: boolean;
  nombreVersets: number;
  /** Contenu : FichierBible. */
  fichier: string;
}

export interface FichierBible {
  format: 'versets';
  version: VersionBible;
  versets: VersetBiblique[];
}

/** /_donnees/manifeste.json : seul fichier que la web app lit d'abord. */
export interface ManifesteInstantane {
  format: typeof FORMAT_INSTANTANE;
  /** Change à chaque build : la web app ne recopie que si elle ne l'a pas déjà fait. */
  identifiant: string;
  genereLe: string;
  source: SourceInstantane;
  /** Backend d'origine des recueils (null pour l'échantillon). */
  api: string | null;
  recueils: EntreeRecueil[];
  categories: EntreeCategories[];
  bibles: EntreeBible[];
}

export interface OptionsInstantane {
  dossier: string;
  source: SourceInstantane;
  racineApi: string;
  langues?: LangueContenu[];
}

/** Nom de fichier sûr pour un titre de recueil (accents et espaces compris). */
function nomFichier(texte: string): string {
  const base = texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'recueil';
}

async function ecrireJson(dossier: string, relatif: string, valeur: unknown): Promise<void> {
  const cible = path.join(dossier, relatif);
  await mkdir(path.dirname(cible), { recursive: true });
  await writeFile(cible, JSON.stringify(valeur), 'utf8');
}

/**
 * Tous les versets que l'échantillon connaît, livre par livre : on interroge la source sur
 * chaque livre entier plutôt que de recopier ses textes, pour n'embarquer QUE ce qu'elle a.
 */
async function biblesEmbarquees(): Promise<FichierBible[]> {
  const fichiers: FichierBible[] = [];
  for (const version of sourceEchantillon.versions()) {
    const versets: VersetBiblique[] = [];
    for (const livre of LIVRES) {
      const passage = await sourceEchantillon.lirePassage(version.id, {
        livre: livre.code,
        chapitre: 1,
        versetDebut: null,
        chapitreFin: livre.chapitres,
        versetFin: null,
      });
      if (passage) versets.push(...passage.versets);
    }
    fichiers.push({ format: 'versets', version, versets });
  }
  return fichiers;
}

async function recueilsDepuisApi(
  racineApi: string,
  langues: LangueContenu[]
): Promise<{ recueils: Omit<RecueilEnCache, 'enregistreLe'>[]; categories: { langue: LangueContenu; liste: CategorieDTO[] }[] }> {
  const client = new ClientApi(configDepuisRacine(racineApi));
  const recueils: Omit<RecueilEnCache, 'enregistreLe'>[] = [];
  const categories: { langue: LangueContenu; liste: CategorieDTO[] }[] = [];
  for (const langue of langues) {
    for (const v of await client.listerVersionsRecueils(langue)) {
      console.log(`[instantané] ${langue} · ${v.title} (v${v.version})`);
      const chants = await client.chantsDuRecueil(v.title, true);
      recueils.push({ langue, titre: v.title, version: v.version, chants });
    }
    categories.push({ langue, liste: await client.listerCategories(langue) });
  }
  return { recueils, categories };
}

export async function produireInstantane(options: OptionsInstantane): Promise<ManifesteInstantane> {
  const { dossier, source } = options;
  const langues = options.langues ?? ['fr', 'en'];
  await rm(dossier, { recursive: true, force: true });
  await mkdir(dossier, { recursive: true });

  const genereLe = new Date().toISOString();
  const manifeste: ManifesteInstantane = {
    format: FORMAT_INSTANTANE,
    identifiant: `${source}-${genereLe}`,
    genereLe,
    source,
    api: source === 'api' ? options.racineApi : null,
    recueils: [],
    categories: [],
    bibles: [],
  };

  if (source === 'api') {
    const { recueils, categories } = await recueilsDepuisApi(options.racineApi, langues);
    if (recueils.length === 0) throw new Error('Le backend n’a renvoyé aucun recueil : instantané refusé.');
    const pris = new Set<string>();
    for (const r of recueils) {
      let fichier = `recueils/${r.langue}-${nomFichier(r.titre)}.json`;
      for (let n = 2; pris.has(fichier); n += 1) fichier = `recueils/${r.langue}-${nomFichier(r.titre)}-${n}.json`;
      pris.add(fichier);
      await ecrireJson(dossier, fichier, r);
      manifeste.recueils.push({ langue: r.langue, titre: r.titre, version: r.version, nombreChants: r.chants.length, fichier });
    }
    for (const c of categories) {
      const fichier = `categories/${c.langue}.json`;
      await ecrireJson(dossier, fichier, c.liste);
      manifeste.categories.push({ langue: c.langue, fichier });
    }
  }

  for (const bible of await biblesEmbarquees()) {
    const fichier = `bibles/${bible.version.id}.json`;
    await ecrireJson(dossier, fichier, bible);
    manifeste.bibles.push({
      version: bible.version.id,
      nom: bible.version.nom,
      langue: bible.version.langue,
      echantillon: bible.version.echantillon,
      nombreVersets: bible.versets.length,
      fichier,
    });
  }

  await ecrireJson(dossier, 'manifeste.json', manifeste);
  console.log(
    `[instantané] ${source} : ${manifeste.recueils.length} recueil(s), ${manifeste.bibles.map((b) => `${b.version} ${b.nombreVersets} v.`).join(', ')} → ${dossier}`
  );
  return manifeste;
}
