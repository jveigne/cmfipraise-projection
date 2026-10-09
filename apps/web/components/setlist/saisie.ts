/**
 * Champ « Ajouter » de l'éditeur de setlist : plusieurs entrées séparées par des virgules
 * (« Grâce infinie, 112, Psaume 23, Jn 3:16 »). Chaque entrée devient un passage biblique
 * si c'est une référence reconnue, sinon le meilleur chant des recueils téléchargés, sinon
 * le premier résultat du moteur du serveur.
 *
 * Rien n'est deviné en silence : une entrée sans correspondance est rendue telle quelle à
 * l'appelant, qui la laisse dans le champ.
 */
import { nouvelIdentifiant, type ChantDTO, type ElementSetlist } from '@cmfi/api';
import { analyserReference, formaterReference, type IdVersion } from '@cmfi/projection';

import { rechercherLocalement, type CandidatRecherche } from '@/components/bibliotheque/texte';

import { elementPourChant } from './elements';

/** Sépare sur les virgules, points-virgules et retours à la ligne. */
export function decouperSaisie(texte: string): string[] {
  return texte
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface OptionsResolution {
  candidats: readonly CandidatRecherche[];
  /** Version biblique par défaut (LSG en français, KJV en anglais). */
  version: IdVersion;
  /** Moteur du serveur, pour les entrées introuvables localement ; absent hors-ligne. */
  rechercherServeur?: (texte: string) => Promise<ChantDTO[]>;
}

export interface BilanSaisie {
  ajoutes: ElementSetlist[];
  introuvables: string[];
}

export async function resoudreEntree(entree: string, options: OptionsResolution): Promise<ElementSetlist | null> {
  const reference = analyserReference(entree);
  if (reference) {
    return {
      type: 'bible',
      id: nouvelIdentifiant(),
      // Forme française normalisée : c'est celle que la régie et le parseur relisent.
      reference: formaterReference(reference, 'fr'),
      version: options.version,
      secondeVersion: null,
    };
  }

  const [local] = rechercherLocalement(entree, options.candidats, 1);
  if (local) return elementPourChant(local.chant, local.recueil);

  if (options.rechercherServeur) {
    try {
      const [distant] = await options.rechercherServeur(entree);
      if (distant) return elementPourChant(distant, null);
    } catch {
      // Hors-ligne ou serveur indisponible : l'entrée reste à corriger.
    }
  }
  return null;
}

export async function resoudreSaisie(texte: string, options: OptionsResolution): Promise<BilanSaisie> {
  const bilan: BilanSaisie = { ajoutes: [], introuvables: [] };
  for (const entree of decouperSaisie(texte)) {
    const element = await resoudreEntree(entree, options);
    if (element) bilan.ajoutes.push(element);
    else bilan.introuvables.push(entree);
  }
  return bilan;
}
