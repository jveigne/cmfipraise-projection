/**
 * Setlist d'EXEMPLE, pour découvrir la régie sans compte ni préparation.
 *
 * Les deux chants sont de vrais chants du catalogue (identifiants du serveur) : la régie les
 * charge comme n'importe quel chant, depuis la copie locale ou le serveur. Si ni l'un ni
 * l'autre ne répond (hors-ligne, CORS), elle retombe sur les copies ci-dessous, recopiées
 * du serveur le 09/10/2026 (seuls changent l'apostrophe, rendue typographique, et les espaces
 * en trop) — deux cantiques du domaine public (E. Budry, 1884 ; J. Newton, 1779). Elles sont
 * alors marquées « exemple » partout dans l'interface.
 *
 * Les passages bibliques viennent de l'échantillon de @cmfi/projection (LSG et KJV) :
 * aucun verset n'est écrit ici.
 */
import type { ChantDTO, ElementSetlist, PartieChantDTO, SetlistLocale } from '@cmfi/api';

const ID_A_TOI_LA_GLOIRE = 'f470ddfe-fb72-4412-91ec-9936613d64f6';
const ID_AMAZING_GRACE = '10984762-506c-4a28-a1b3-fd34b7236b2e';

function partie(position: number, type: PartieChantDTO['type'], partId: number, lignes: string[]): PartieChantDTO {
  return { position, type, partId, lines: lignes.map((line, i) => ({ line, lineNumber: i + 1 })) };
}

const A_TOI_LA_GLOIRE: ChantDTO = {
  id: ID_A_TOI_LA_GLOIRE,
  ownerId: null,
  position: 0,
  title: 'A TOI LA GLOIRE.',
  artist: 'E. BUDRY',
  language: 'fr',
  keyRootIndex: null,
  keyIsMinor: false,
  hasChord: false,
  parts: [
    partie(1, 'VERSE', 81, [
      'A TOI la gloire,',
      'O Ressuscité !',
      'A toi la victoire',
      'Pour l’éternité !',
      'Brillant de lumière,',
      'L’ange est descendu,',
      'Il roule la pierre',
      'Du tombeau vaincu.',
    ]),
    partie(2, 'CHORUS', 9, ['A toi la gloire, ô Ressuscité !', 'A toi la victoire! Pour l’éternité !']),
    partie(3, 'VERSE', 82, [
      'Vois-le paraître !',
      'C’est Lui, c’est Jésus,',
      'Ton Sauveur, Ton Maître,',
      'Oh ! ne doute plus !',
      'Sois dans l’allégresse,',
      'Peuple du Seigneur,',
      'Et redis sans cesse',
      'Que Christ est vainqueur.',
    ]),
    partie(4, 'CHORUS', 9, ['A toi la gloire, ô Ressuscité !', 'A toi la victoire! Pour l’éternité !']),
    partie(5, 'VERSE', 83, [
      'Craindrais-je encore ?',
      'Il vit à jamais,',
      'Celui que j’adore,',
      'Le Prince de Paix ;',
      'Il est ma victoire,',
      'Mon puissant soutien,',
      'Ma vie et ma gloire ;',
      'Non, je ne crains rien !',
    ]),
    partie(6, 'CHORUS', 9, ['A toi la gloire, ô Ressuscité !', 'A toi la victoire! Pour l’éternité !']),
  ],
};

const AMAZING_GRACE: ChantDTO = {
  id: ID_AMAZING_GRACE,
  ownerId: null,
  position: 0,
  title: 'AMAZING GRACE',
  artist: 'J. NEWTON',
  language: 'en',
  keyRootIndex: null,
  keyIsMinor: false,
  hasChord: false,
  parts: [
    partie(1, 'VERSE', 1439, ['AMAZING grace ! how sweet the sound', 'That saved a wretch like me ;', 'I once was lost, but now am found;', 'Was blind, but now I see.']),
    partie(2, 'VERSE', 1440, ['’Twas grace that taught my heart to fear,', 'And grace my fears relieved ;', 'How precious did that grace appear', 'The hour I first believed !']),
    partie(3, 'VERSE', 1441, ['Through many dangers, toils, and snares,', 'I have already come :', '’Tis grace that brought me safe thus far,', 'And grace will lead me home.']),
    partie(4, 'VERSE', 1442, ['Yes, when this heart and flesh shall fail,', 'And mortal life shall cease,', 'I shall possess within the vail', 'A life of joy and peace.']),
  ],
};

/** Copies de secours, par identifiant de chant. */
export const CHANTS_SECOURS_EXEMPLE: ReadonlyMap<string, ChantDTO> = new Map([
  [A_TOI_LA_GLOIRE.id, A_TOI_LA_GLOIRE],
  [AMAZING_GRACE.id, AMAZING_GRACE],
]);

/** Identifiants d'éléments fixes : la séance d'exemple se recharge à l'identique. */
function elementsExemple(): ElementSetlist[] {
  return [
    { type: 'chant', id: 'exemple-1', chantId: ID_A_TOI_LA_GLOIRE, titre: 'A TOI LA GLOIRE.', langue: 'fr' },
    { type: 'bible', id: 'exemple-2', reference: 'Psaume 23:1-4', version: 'LSG', secondeVersion: 'KJV' },
    { type: 'bible', id: 'exemple-3', reference: 'Jean 3:16', version: 'LSG', secondeVersion: 'KJV' },
    { type: 'chant', id: 'exemple-4', chantId: ID_AMAZING_GRACE, titre: 'AMAZING GRACE', langue: 'en' },
  ];
}

export function setlistExemple(nom: string): SetlistLocale {
  const maintenant = Date.now();
  return { id: 'exemple', nom, elements: elementsExemple(), creeLe: maintenant, modifieLe: maintenant, idServeur: null };
}
