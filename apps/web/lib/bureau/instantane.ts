/**
 * Bureau : recopie, au premier lancement, des données embarquées dans l'installeur
 * (/_donnees/, servies par le protocole app:// d'apps/desktop) vers le cache IndexedDB.
 * Le bureau projette ainsi les recueils dès le premier culte, même sans réseau.
 *
 * Règles (docs/bureau.md) :
 *  - rien à faire hors du bureau, ni sous `next dev` (pas de /_donnees/ : 404) ;
 *  - un instantané n'est recopié qu'une fois (préférence `bureau_instantane`) ;
 *  - une version locale plus récente n'est jamais écrasée ;
 *  - les Bibles d'échantillon sont déjà dans le code (sourceEchantillon) : ignorées.
 * Aucune erreur ne remonte : au pire, l'app télécharge les recueils comme sur le web.
 */
import {
  ecrirePreference,
  enregistrerCategories,
  enregistrerRecueil,
  lireCategories,
  lirePreference,
  lireRecueil,
  type CategorieDTO,
  type LangueContenu,
  type RecueilEnCache,
} from '@cmfi/api';
import { obtenirPlateforme } from '@cmfi/plateforme';

/** Forme connue de /_donnees/manifeste.json (apps/desktop/scripts/instantane.ts). */
const FORMAT_CONNU = 1;
const CLE_INSTANTANE = 'bureau_instantane';

interface ManifesteInstantane {
  format: number;
  identifiant: string;
  recueils: { langue: LangueContenu; titre: string; version: number; fichier: string }[];
  categories: { langue: LangueContenu; fichier: string }[];
  bibles: { echantillon: boolean; fichier: string }[];
}

async function lireJson<T>(chemin: string): Promise<T | null> {
  const reponse = await fetch(`/_donnees/${chemin}`);
  if (!reponse.ok) return null;
  return (await reponse.json()) as T;
}

let enCours: Promise<void> | null = null;

/** À appeler une fois au démarrage, côté client. Sans effet hors de l'app de bureau. */
export function recopierInstantaneBureau(): Promise<void> {
  if (typeof window === 'undefined' || !obtenirPlateforme().estBureau()) return Promise.resolve();
  enCours ??= recopier().catch(() => {
    // Instantané absent ou illisible : l'app se comporte comme sur le web.
  });
  return enCours;
}

async function recopier(): Promise<void> {
  const manifeste = await lireJson<ManifesteInstantane>('manifeste.json').catch(() => null);
  if (!manifeste || manifeste.format !== FORMAT_CONNU) return;
  if ((await lirePreference<string>(CLE_INSTANTANE)) === manifeste.identifiant) return;

  for (const entree of manifeste.recueils) {
    const local = await lireRecueil(entree.langue, entree.titre);
    if (local && local.version >= entree.version) continue;
    const recueil = await lireJson<Omit<RecueilEnCache, 'enregistreLe'>>(entree.fichier);
    if (!recueil) throw new Error(`Recueil embarqué illisible : ${entree.fichier}`);
    await enregistrerRecueil(recueil);
  }

  for (const entree of manifeste.categories) {
    if (await lireCategories(entree.langue)) continue;
    const liste = await lireJson<CategorieDTO[]>(entree.fichier);
    if (!liste) throw new Error(`Catégories embarquées illisibles : ${entree.fichier}`);
    await enregistrerCategories(entree.langue, liste);
  }

  // Bibles complètes : pas encore embarquées. Le jour où elles le seront, il faudra un
  // `enregistrerChapitresBible` dans packages/api/src/cache.ts (magasin `bibles`) ; tant
  // qu'il n'existe pas, on ne marque pas l'instantané comme recopié s'il en contient une.
  if (manifeste.bibles.some((b) => !b.echantillon)) return;

  // Seulement si tout a réussi : sinon on réessaiera au prochain lancement.
  await ecrirePreference(CLE_INSTANTANE, manifeste.identifiant);
}
