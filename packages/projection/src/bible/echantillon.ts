/**
 * ÉCHANTILLON biblique : Jean 3:16 et Psaume 23, en Louis Segond 1910 et en King James.
 * Textes du domaine public, recopiés tels quels de ces éditions (orthographe et ponctuation
 * d'origine ; seule l'apostrophe est typographique). Rien d'autre n'est inclus tant que
 * l'import complet n'existe pas : AUCUN verset ne doit être écrit de mémoire.
 */
import type { CodeLivre } from './livres';
import type { ReferenceBiblique } from './references';
import type { BibleSource, IdVersion, PassageBiblique, VersetBiblique, VersionBible } from './source';

export const VERSIONS_ECHANTILLON: Record<IdVersion, VersionBible> = {
  LSG: { id: 'LSG', nom: 'Louis Segond 1910', abrege: 'LSG', langue: 'fr', domainePublic: true, echantillon: true },
  KJV: { id: 'KJV', nom: 'King James', abrege: 'KJV', langue: 'en', domainePublic: true, echantillon: true },
};

const v = (livre: CodeLivre, chapitre: number, numero: number, texte: string, suscription?: string): VersetBiblique =>
  suscription ? { livre, chapitre, numero, texte, suscription } : { livre, chapitre, numero, texte };

const TEXTES: Record<IdVersion, VersetBiblique[]> = {
  LSG: [
    v('JHN', 3, 16, 'Car Dieu a tant aimé le monde qu’il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu’il ait la vie éternelle.'),
    v('PSA', 23, 1, 'L’Éternel est mon berger: je ne manquerai de rien.', 'Cantique de David.'),
    v('PSA', 23, 2, 'Il me fait reposer dans de verts pâturages, Il me dirige près des eaux paisibles.'),
    v('PSA', 23, 3, 'Il restaure mon âme, Il me conduit dans les sentiers de la justice, A cause de son nom.'),
    v('PSA', 23, 4, 'Quand je marche dans la vallée de l’ombre de la mort, Je ne crains aucun mal, car tu es avec moi: Ta houlette et ton bâton me rassurent.'),
    v('PSA', 23, 5, 'Tu dresses devant moi une table, En face de mes adversaires; Tu oins d’huile ma tête, Et ma coupe déborde.'),
    v('PSA', 23, 6, 'Oui, le bonheur et la grâce m’accompagneront Tous les jours de ma vie, Et j’habiterai dans la maison de l’Éternel Jusqu’à la fin de mes jours.'),
  ],
  KJV: [
    v('JHN', 3, 16, 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.'),
    v('PSA', 23, 1, 'The LORD is my shepherd; I shall not want.', 'A Psalm of David.'),
    v('PSA', 23, 2, 'He maketh me to lie down in green pastures: he leadeth me beside the still waters.'),
    v('PSA', 23, 3, 'He restoreth my soul: he leadeth me in the paths of righteousness for his name’s sake.'),
    v('PSA', 23, 4, 'Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.'),
    v('PSA', 23, 5, 'Thou preparest a table before me in the presence of mine enemies: thou anointest my head with oil; my cup runneth over.'),
    v('PSA', 23, 6, 'Surely goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the LORD for ever.'),
  ],
};

/** Vrai si le verset appartient au passage (bornes incluses, chapitres franchis compris). */
function dansPassage(ref: ReferenceBiblique, verset: VersetBiblique): boolean {
  if (verset.livre !== ref.livre) return false;
  if (verset.chapitre < ref.chapitre || verset.chapitre > ref.chapitreFin) return false;
  if (ref.versetDebut !== null && verset.chapitre === ref.chapitre && verset.numero < ref.versetDebut) return false;
  if (ref.versetFin !== null && verset.chapitre === ref.chapitreFin && verset.numero > ref.versetFin) return false;
  return true;
}

/** Nombre de versets demandés quand il est calculable sans connaître la longueur des chapitres. */
function versetsDemandes(ref: ReferenceBiblique): number | null {
  if (ref.versetDebut === null || ref.versetFin === null || ref.chapitre !== ref.chapitreFin) return null;
  return ref.versetFin - ref.versetDebut + 1;
}

export class SourceEchantillon implements BibleSource {
  versions(): VersionBible[] {
    return Object.values(VERSIONS_ECHANTILLON);
  }

  async lirePassage(version: IdVersion, reference: ReferenceBiblique): Promise<PassageBiblique | null> {
    const versets = TEXTES[version].filter((vs) => dansPassage(reference, vs));
    if (versets.length === 0) return null;
    const attendus = versetsDemandes(reference);
    // Chapitre entier : seul le Psaume 23 est complet dans l'échantillon.
    const complet = attendus !== null ? versets.length === attendus : reference.livre === 'PSA' && reference.chapitre === 23 && reference.chapitreFin === 23;
    return { reference, version: VERSIONS_ECHANTILLON[version], versets, incomplet: !complet };
  }

  async contient(version: IdVersion, reference: ReferenceBiblique): Promise<boolean> {
    return TEXTES[version].some((vs) => dansPassage(reference, vs));
  }
}

/** Source par défaut tant que l'import complet n'existe pas. */
export const sourceEchantillon = new SourceEchantillon();
