/**
 * Les 66 livres du canon protestant, tel que l'ordonnent la Louis Segond 1910 et la King
 * James : code USFM, noms français (LSG) et anglais (KJV), abréviations usuelles, nombre de
 * chapitres. Le nombre de chapitres est celui de ces deux versions (Joël 3, Malachie 4).
 *
 * Les abréviations sont écrites SANS accents ni points ni espaces : c'est la forme
 * normalisée que produit le parseur (voir references.ts).
 */

export type CodeLivre =
  | 'GEN' | 'EXO' | 'LEV' | 'NUM' | 'DEU' | 'JOS' | 'JDG' | 'RUT' | '1SA' | '2SA'
  | '1KI' | '2KI' | '1CH' | '2CH' | 'EZR' | 'NEH' | 'EST' | 'JOB' | 'PSA' | 'PRO'
  | 'ECC' | 'SNG' | 'ISA' | 'JER' | 'LAM' | 'EZK' | 'DAN' | 'HOS' | 'JOL' | 'AMO'
  | 'OBA' | 'JON' | 'MIC' | 'NAM' | 'HAB' | 'ZEP' | 'HAG' | 'ZEC' | 'MAL'
  | 'MAT' | 'MRK' | 'LUK' | 'JHN' | 'ACT' | 'ROM' | '1CO' | '2CO' | 'GAL' | 'EPH'
  | 'PHP' | 'COL' | '1TH' | '2TH' | '1TI' | '2TI' | 'TIT' | 'PHM' | 'HEB' | 'JAS'
  | '1PE' | '2PE' | '1JN' | '2JN' | '3JN' | 'JUD' | 'REV';

export interface LivreBible {
  code: CodeLivre;
  /** Rang dans le canon, 1 à 66. */
  ordre: number;
  testament: 'ancien' | 'nouveau';
  chapitres: number;
  nomFr: string;
  /** Forme employée pour un seul chapitre : « Psaume 23 ». */
  nomFrSingulier?: string;
  abregeFr: string;
  nomEn: string;
  nomEnSingulier?: string;
  abregeEn: string;
  /** Formes acceptées en saisie, en plus des noms complets (normalisées). */
  alias: string[];
}

type Ligne = [CodeLivre, number, string, string, string, string, string[], string?, string?];

// code, chapitres, nomFr, abrégé FR, nomEn, abrégé EN, alias, singulier FR, singulier EN
const LIGNES: Ligne[] = [
  ['GEN', 50, 'Genèse', 'Gn', 'Genesis', 'Gen', ['gn', 'ge', 'gen', 'gene']],
  ['EXO', 40, 'Exode', 'Ex', 'Exodus', 'Exod', ['ex', 'exo', 'exod']],
  ['LEV', 27, 'Lévitique', 'Lv', 'Leviticus', 'Lev', ['lv', 'le', 'lev', 'levit']],
  ['NUM', 36, 'Nombres', 'Nb', 'Numbers', 'Num', ['nb', 'nomb', 'nu', 'num', 'nm']],
  ['DEU', 34, 'Deutéronome', 'Dt', 'Deuteronomy', 'Deut', ['dt', 'de', 'deu', 'deut']],
  ['JOS', 24, 'Josué', 'Jos', 'Joshua', 'Josh', ['jos', 'josh', 'jsh']],
  ['JDG', 21, 'Juges', 'Jg', 'Judges', 'Judg', ['jg', 'jug', 'judg', 'jdg', 'jdgs']],
  ['RUT', 4, 'Ruth', 'Rt', 'Ruth', 'Ruth', ['rt', 'ru', 'rut', 'rth']],
  ['1SA', 31, '1 Samuel', '1 S', '1 Samuel', '1 Sam', ['1s', '1sa', '1sam', '1sm']],
  ['2SA', 24, '2 Samuel', '2 S', '2 Samuel', '2 Sam', ['2s', '2sa', '2sam', '2sm']],
  ['1KI', 22, '1 Rois', '1 R', '1 Kings', '1 Kgs', ['1r', '1ro', '1rs', '1k', '1ki', '1kg', '1kgs', '1kin']],
  ['2KI', 25, '2 Rois', '2 R', '2 Kings', '2 Kgs', ['2r', '2ro', '2rs', '2k', '2ki', '2kg', '2kgs', '2kin']],
  ['1CH', 29, '1 Chroniques', '1 Ch', '1 Chronicles', '1 Chr', ['1ch', '1chr', '1chro', '1chron']],
  ['2CH', 36, '2 Chroniques', '2 Ch', '2 Chronicles', '2 Chr', ['2ch', '2chr', '2chro', '2chron']],
  ['EZR', 10, 'Esdras', 'Esd', 'Ezra', 'Ezra', ['esd', 'ezr']],
  ['NEH', 13, 'Néhémie', 'Né', 'Nehemiah', 'Neh', ['ne', 'neh']],
  ['EST', 10, 'Esther', 'Est', 'Esther', 'Esth', ['est', 'esth']],
  ['JOB', 42, 'Job', 'Jb', 'Job', 'Job', ['jb']],
  ['PSA', 150, 'Psaumes', 'Ps', 'Psalms', 'Ps', ['ps', 'psa', 'psm', 'pss', 'psaume', 'psalm', 'psau'], 'Psaume', 'Psalm'],
  ['PRO', 31, 'Proverbes', 'Pr', 'Proverbs', 'Prov', ['pr', 'pro', 'prov', 'prv']],
  ['ECC', 12, 'Ecclésiaste', 'Ec', 'Ecclesiastes', 'Eccl', ['ec', 'ecc', 'eccl', 'eccle', 'qo', 'qoh', 'qohelet', 'qoheleth']],
  ['SNG', 8, 'Cantique des cantiques', 'Ct', 'Song of Solomon', 'Song', ['ct', 'cant', 'cantique', 'song', 'sos', 'sng', 'songofsongs', 'canticles']],
  ['ISA', 66, 'Ésaïe', 'Es', 'Isaiah', 'Isa', ['es', 'esa', 'is', 'isa', 'isaie']],
  ['JER', 52, 'Jérémie', 'Jr', 'Jeremiah', 'Jer', ['jr', 'je', 'jer', 'jere']],
  ['LAM', 5, 'Lamentations', 'Lm', 'Lamentations', 'Lam', ['lm', 'la', 'lam']],
  ['EZK', 48, 'Ézéchiel', 'Ez', 'Ezekiel', 'Ezek', ['ez', 'eze', 'ezk', 'ezek', 'ezech']],
  ['DAN', 12, 'Daniel', 'Dn', 'Daniel', 'Dan', ['dn', 'da', 'dan']],
  ['HOS', 14, 'Osée', 'Os', 'Hosea', 'Hos', ['os', 'ho', 'hos']],
  ['JOL', 3, 'Joël', 'Jl', 'Joel', 'Joel', ['jl', 'joe', 'jol']],
  ['AMO', 9, 'Amos', 'Am', 'Amos', 'Amos', ['am', 'amo']],
  ['OBA', 1, 'Abdias', 'Ab', 'Obadiah', 'Obad', ['ab', 'abd', 'ob', 'oba', 'obad']],
  ['JON', 4, 'Jonas', 'Jon', 'Jonah', 'Jonah', ['jon', 'jnh']],
  ['MIC', 7, 'Michée', 'Mi', 'Micah', 'Mic', ['mi', 'mic']],
  ['NAM', 3, 'Nahum', 'Na', 'Nahum', 'Nah', ['na', 'nah', 'nam']],
  ['HAB', 3, 'Habacuc', 'Ha', 'Habakkuk', 'Hab', ['ha', 'hab']],
  ['ZEP', 3, 'Sophonie', 'So', 'Zephaniah', 'Zeph', ['so', 'sop', 'soph', 'zep', 'zeph']],
  ['HAG', 2, 'Aggée', 'Ag', 'Haggai', 'Hag', ['ag', 'agg', 'hag', 'hg']],
  ['ZEC', 14, 'Zacharie', 'Za', 'Zechariah', 'Zech', ['za', 'zac', 'zach', 'zec', 'zech']],
  ['MAL', 4, 'Malachie', 'Ml', 'Malachi', 'Mal', ['ml', 'mal']],
  ['MAT', 28, 'Matthieu', 'Mt', 'Matthew', 'Matt', ['mt', 'mat', 'matt', 'mth']],
  ['MRK', 16, 'Marc', 'Mc', 'Mark', 'Mark', ['mc', 'mr', 'mk', 'mrk', 'mar']],
  ['LUK', 24, 'Luc', 'Lc', 'Luke', 'Luke', ['lc', 'lu', 'lk', 'luk']],
  ['JHN', 21, 'Jean', 'Jn', 'John', 'John', ['jn', 'jhn', 'joh']],
  ['ACT', 28, 'Actes', 'Ac', 'Acts', 'Acts', ['ac', 'act', 'actesdesapotres']],
  ['ROM', 16, 'Romains', 'Rm', 'Romans', 'Rom', ['rm', 'ro', 'rom']],
  ['1CO', 16, '1 Corinthiens', '1 Co', '1 Corinthians', '1 Cor', ['1co', '1cor', '1corint']],
  ['2CO', 13, '2 Corinthiens', '2 Co', '2 Corinthians', '2 Cor', ['2co', '2cor', '2corint']],
  ['GAL', 6, 'Galates', 'Ga', 'Galatians', 'Gal', ['ga', 'gal']],
  ['EPH', 6, 'Éphésiens', 'Ep', 'Ephesians', 'Eph', ['ep', 'eph', 'ephes']],
  ['PHP', 4, 'Philippiens', 'Ph', 'Philippians', 'Phil', ['ph', 'php', 'phil', 'phl']],
  ['COL', 4, 'Colossiens', 'Col', 'Colossians', 'Col', ['col']],
  ['1TH', 5, '1 Thessaloniciens', '1 Th', '1 Thessalonians', '1 Thess', ['1th', '1thes', '1thess']],
  ['2TH', 3, '2 Thessaloniciens', '2 Th', '2 Thessalonians', '2 Thess', ['2th', '2thes', '2thess']],
  ['1TI', 6, '1 Timothée', '1 Tm', '1 Timothy', '1 Tim', ['1tm', '1ti', '1tim']],
  ['2TI', 4, '2 Timothée', '2 Tm', '2 Timothy', '2 Tim', ['2tm', '2ti', '2tim']],
  ['TIT', 3, 'Tite', 'Tt', 'Titus', 'Titus', ['tt', 'tit']],
  ['PHM', 1, 'Philémon', 'Phm', 'Philemon', 'Phlm', ['phm', 'phlm', 'philem']],
  ['HEB', 13, 'Hébreux', 'He', 'Hebrews', 'Heb', ['he', 'heb', 'hebr']],
  ['JAS', 5, 'Jacques', 'Jc', 'James', 'Jas', ['jc', 'ja', 'jac', 'jas', 'jm']],
  ['1PE', 5, '1 Pierre', '1 P', '1 Peter', '1 Pet', ['1p', '1pi', '1pe', '1pet', '1pt']],
  ['2PE', 3, '2 Pierre', '2 P', '2 Peter', '2 Pet', ['2p', '2pi', '2pe', '2pet', '2pt']],
  ['1JN', 5, '1 Jean', '1 Jn', '1 John', '1 John', ['1jn', '1jean', '1jo', '1joh', '1jhn']],
  ['2JN', 1, '2 Jean', '2 Jn', '2 John', '2 John', ['2jn', '2jean', '2jo', '2joh', '2jhn']],
  ['3JN', 1, '3 Jean', '3 Jn', '3 John', '3 John', ['3jn', '3jean', '3jo', '3joh', '3jhn']],
  ['JUD', 1, 'Jude', 'Jd', 'Jude', 'Jude', ['jd', 'jud', 'jude']],
  ['REV', 22, 'Apocalypse', 'Ap', 'Revelation', 'Rev', ['ap', 'apo', 'apoc', 're', 'rev', 'rv', 'revelations']],
];

export const LIVRES: readonly LivreBible[] = LIGNES.map(
  ([code, chapitres, nomFr, abregeFr, nomEn, abregeEn, alias, nomFrSingulier, nomEnSingulier], i) => ({
    code,
    ordre: i + 1,
    testament: i < 39 ? 'ancien' : 'nouveau',
    chapitres,
    nomFr,
    nomFrSingulier,
    abregeFr,
    nomEn,
    nomEnSingulier,
    abregeEn,
    alias,
  })
);

const PAR_CODE = new Map<CodeLivre, LivreBible>(LIVRES.map((l) => [l.code, l]));

export function livreParCode(code: CodeLivre): LivreBible {
  const livre = PAR_CODE.get(code);
  if (!livre) throw new Error(`Livre inconnu : ${code}`);
  return livre;
}

/** Nom d'affichage d'un livre ; `unChapitre` choisit « Psaume » plutôt que « Psaumes ». */
export function nomLivre(code: CodeLivre, langue: 'fr' | 'en', unChapitre = false): string {
  const l = livreParCode(code);
  if (langue === 'fr') return (unChapitre && l.nomFrSingulier) || l.nomFr;
  return (unChapitre && l.nomEnSingulier) || l.nomEn;
}
