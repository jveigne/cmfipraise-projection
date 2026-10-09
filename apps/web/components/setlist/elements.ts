/** Construction des éléments de setlist à partir d'un chant (fonctions pures). */
import { nouvelIdentifiant, type ChantDTO, type ElementChant, type ElementSetlist } from '@cmfi/api';

/** Un chant devient un élément : de quoi l'afficher dans la liste sans relire le chant. */
export function elementPourChant(chant: ChantDTO, recueil: string | null): ElementChant {
  return {
    type: 'chant',
    id: nouvelIdentifiant(),
    chantId: chant.id,
    titre: chant.title,
    recueil: recueil ?? undefined,
    numero: chant.position > 0 ? chant.position : undefined,
    langue: chant.language,
    tonalite: chant.keyRootIndex ?? null,
  };
}

/** Copie d'éléments avec de nouveaux identifiants (dupliquer une setlist). */
export function copierElements(elements: readonly ElementSetlist[]): ElementSetlist[] {
  return elements.map((e) => ({ ...e, id: nouvelIdentifiant() }));
}
