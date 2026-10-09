/**
 * Synchronisation des recueils pour le hors-ligne, sur le modèle du mobile
 * (utils/praise/autoDownloadService.ts) : on compare la version serveur de chaque recueil à
 * celle du cache, et on ne retélécharge que ce qui a changé.
 *
 * Un échec sur un recueil n'arrête pas les autres et n'efface jamais la copie locale.
 */
import { enregistrerCategories, enregistrerRecueil, listerRecueilsEnCache } from './cache';
import type { ClientApi } from './client';
import type { LangueContenu } from './types';

export interface ProgresSynchronisation {
  etape: 'verification' | 'telechargement' | 'categories' | 'termine';
  /** Recueils à télécharger, une fois la vérification faite. */
  total: number;
  courant: number;
  /** Recueil en cours de téléchargement. */
  recueil?: string;
}

export interface BilanSynchronisation {
  telecharges: string[];
  aJour: string[];
  echecs: { recueil: string; erreur: unknown }[];
  categoriesAJour: boolean;
}

export async function synchroniserRecueils(
  client: ClientApi,
  langues: LangueContenu[] = ['fr', 'en'],
  surProgres?: (p: ProgresSynchronisation) => void
): Promise<BilanSynchronisation> {
  const bilan: BilanSynchronisation = { telecharges: [], aJour: [], echecs: [], categoriesAJour: true };
  surProgres?.({ etape: 'verification', total: 0, courant: 0 });

  const aTelecharger: { langue: LangueContenu; titre: string; version: number }[] = [];
  for (const langue of langues) {
    const versions = await client.listerVersionsRecueils(langue);
    const enCache = new Map((await listerRecueilsEnCache(langue)).map((r) => [r.titre, r.version]));
    for (const v of versions) {
      if (enCache.get(v.title) === v.version) bilan.aJour.push(v.title);
      else aTelecharger.push({ langue, titre: v.title, version: v.version });
    }
  }

  let courant = 0;
  for (const r of aTelecharger) {
    surProgres?.({ etape: 'telechargement', total: aTelecharger.length, courant, recueil: r.titre });
    try {
      const chants = await client.chantsDuRecueil(r.titre, true);
      await enregistrerRecueil({ langue: r.langue, titre: r.titre, version: r.version, chants });
      bilan.telecharges.push(r.titre);
    } catch (erreur) {
      bilan.echecs.push({ recueil: r.titre, erreur });
    }
    courant += 1;
  }

  // Les catégories n'ont pas de version : quelques Ko, retéléchargés à chaque passage.
  surProgres?.({ etape: 'categories', total: aTelecharger.length, courant });
  for (const langue of langues) {
    try {
      await enregistrerCategories(langue, await client.listerCategories(langue));
    } catch {
      bilan.categoriesAJour = false;
    }
  }

  surProgres?.({ etape: 'termine', total: aTelecharger.length, courant });
  return bilan;
}
