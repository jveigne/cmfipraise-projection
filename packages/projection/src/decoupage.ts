/**
 * Découpage d'un chant ou d'un passage biblique en diapositives.
 *
 * Chant : une diapositive par partie, DANS L'ORDRE D'ENCHAÎNEMENT du backend (`parts`,
 * triées par `position`) — un refrain chanté trois fois donne trois diapositives. Repli
 * sur l'ancien format (couplets et refrains séparés, alternés) comme le mobile
 * (app/(tabs)/praise/lyrics.tsx). Une partie plus longue que `lignesMax` est coupée en
 * morceaux équilibrés : à 72 px, au-delà de six lignes le texte ne tient plus à l'écran.
 */
import type { ChantDTO, LigneParolesDTO, PartieChantDTO } from '@cmfi/api';

import { formaterReference } from './bible/references';
import type { PassageBiblique } from './bible/source';
import type { Diapositive, ElementProjete, GenreDiapositive, LigneDiapositive } from './diapositive';

/** Au-delà, une partie est coupée en plusieurs diapositives. */
export const LIGNES_MAX_PAR_DIAPOSITIVE = 6;

export interface OptionsDecoupage {
  /** Id de l'élément de setlist (sert aux ids de diapositive) ; l'id du chant par défaut. */
  idElement?: string;
  /** Chant de l'autre langue, projeté sous le principal en mode bilingue. */
  chantSecond?: ChantDTO | null;
  /** 0 = ne jamais couper. */
  lignesMax?: number;
}

interface PartieNormalisee {
  type: 'VERSE' | 'CHORUS';
  partId: number | null;
  lignes: LigneDiapositive[];
}

function versLignes(lignes: LigneParolesDTO[] | undefined): LigneDiapositive[] {
  return (lignes ?? [])
    .filter((l) => l.line.trim() !== '')
    .map((l) => (l.chords && l.chords.length > 0 ? { texte: l.line, accords: l.chords } : { texte: l.line }));
}

/** Parties dans l'ordre d'enchaînement, quel que soit le format reçu. */
export function partiesDuChant(chant: ChantDTO): PartieNormalisee[] {
  if (chant.parts && chant.parts.length > 0) {
    return [...chant.parts]
      .sort((a: PartieChantDTO, b: PartieChantDTO) => a.position - b.position)
      .map((p) => ({ type: p.type, partId: p.partId, lignes: versLignes(p.lines) }))
      .filter((p) => p.lignes.length > 0);
  }
  // Ancien format : couplet n, puis refrain n s'il existe (ou l'unique refrain).
  const parties: PartieNormalisee[] = [];
  const couplets = chant.verses ?? [];
  const refrains = chant.choruses ?? [];
  couplets.forEach((c, i) => {
    parties.push({ type: 'VERSE', partId: null, lignes: versLignes(c.lines) });
    const refrain = refrains[i] ?? (refrains.length === 1 ? refrains[0] : undefined);
    if (refrain) parties.push({ type: 'CHORUS', partId: refrains.length === 1 ? -1 : -(i + 1), lignes: versLignes(refrain.lines) });
  });
  return parties.filter((p) => p.lignes.length > 0);
}

/** Coupe en `n` morceaux de tailles équilibrées (7 lignes → 4 + 3). */
function couper<T>(elements: T[], n: number): T[][] {
  const morceaux: T[][] = [];
  let debut = 0;
  for (let i = 0; i < n; i++) {
    const taille = Math.ceil((elements.length - debut) / (n - i));
    morceaux.push(elements.slice(debut, debut + taille));
    debut += taille;
  }
  return morceaux;
}

export interface ChantDecoupe {
  diapositives: Diapositive[];
  /** « 1 R 2 R 3 R » */
  ordre: string;
}

export function decouperChant(chant: ChantDTO, options: OptionsDecoupage = {}): ChantDecoupe {
  const idElement = options.idElement ?? chant.id;
  const lignesMax = options.lignesMax ?? LIGNES_MAX_PAR_DIAPOSITIVE;
  const parties = partiesDuChant(chant);
  const secondes = options.chantSecond ? partiesDuChant(options.chantSecond) : [];

  // Refrains distincts numérotés par ordre d'apparition, seulement s'il y en a plusieurs.
  const refrainsDistincts: (number | null)[] = [];
  for (const p of parties) {
    if (p.type === 'CHORUS' && !refrainsDistincts.includes(p.partId)) refrainsDistincts.push(p.partId);
  }
  const plusieursRefrains = refrainsDistincts.length > 1;

  const diapositives: Diapositive[] = [];
  const etiquettes: string[] = [];
  let couplet = 0;

  parties.forEach((partie, i) => {
    const genre: GenreDiapositive = partie.type === 'VERSE' ? 'couplet' : 'refrain';
    let numero: number | null;
    let libelle: string;
    if (genre === 'couplet') {
      couplet += 1;
      numero = couplet;
      libelle = `${couplet}.`;
      etiquettes.push(String(couplet));
    } else {
      numero = plusieursRefrains ? refrainsDistincts.indexOf(partie.partId) + 1 : null;
      libelle = numero ? `R${numero}.` : 'R.';
      etiquettes.push(numero ? `R${numero}` : 'R');
    }

    // Appariement bilingue par rang dans l'arrangement : les deux versions d'un chant
    // officiel suivent la même structure.
    const seconde = secondes[i]?.lignes ?? null;
    const total = lignesMax > 0 ? Math.max(1, Math.ceil(partie.lignes.length / lignesMax)) : 1;
    const morceaux = couper(partie.lignes, total);
    const morceauxSeconds = seconde ? couper(seconde, total) : null;

    morceaux.forEach((lignes, k) => {
      diapositives.push({
        id: `${idElement}:${diapositives.length}`,
        genre,
        libelle,
        numero,
        lignes,
        lignesSecondes: morceauxSeconds?.[k] ?? null,
        reference: null,
        referenceSeconde: null,
        morceau: total > 1 ? { index: k + 1, total } : null,
        partId: partie.partId,
      });
    });
  });

  return { diapositives, ordre: etiquettes.join(' ') };
}

/**
 * Un passage biblique : une diapositive par verset. La seconde version, si elle est
 * donnée, est appariée verset par verset (même chapitre, même numéro).
 */
export function decouperPassage(
  passage: PassageBiblique,
  second: PassageBiblique | null = null,
  idElement = `${passage.reference.livre}.${passage.reference.chapitre}`
): Diapositive[] {
  const langue = passage.version.langue;
  return passage.versets.map((verset, i) => {
    const ref = { livre: verset.livre, chapitre: verset.chapitre, versetDebut: verset.numero, chapitreFin: verset.chapitre, versetFin: verset.numero };
    const correspondant = second?.versets.find((s) => s.chapitre === verset.chapitre && s.numero === verset.numero);
    return {
      id: `${idElement}:${i}`,
      genre: 'verset',
      libelle: `v. ${verset.numero}`,
      numero: verset.numero,
      lignes: [{ texte: verset.texte }],
      lignesSecondes: correspondant ? [{ texte: correspondant.texte }] : null,
      reference: `${formaterReference(ref, langue)} · ${passage.version.abrege}`,
      referenceSeconde:
        correspondant && second ? `${formaterReference(ref, second.version.langue)} · ${second.version.abrege}` : null,
      suscription: verset.suscription ?? null,
      morceau: null,
      partId: null,
    };
  });
}

/** Développe un chant en élément projetable. */
export function elementDepuisChant(
  chant: ChantDTO,
  options: OptionsDecoupage & { meta?: string; personnel?: boolean } = {}
): ElementProjete {
  const { diapositives, ordre } = decouperChant(chant, options);
  return {
    id: options.idElement ?? chant.id,
    genre: 'chant',
    titre: chant.title,
    meta: options.meta ?? '',
    ordre,
    diapositives,
    tonalite: chant.keyRootIndex != null ? { racine: chant.keyRootIndex, mineur: !!chant.keyIsMinor } : null,
    personnel: options.personnel ?? !!chant.ownerId,
  };
}

/** Développe un passage biblique en élément projetable. */
export function elementDepuisPassage(
  passage: PassageBiblique,
  second: PassageBiblique | null,
  options: { idElement?: string; meta?: string } = {}
): ElementProjete {
  const r = passage.reference;
  const idElement = options.idElement ?? `${r.livre}.${r.chapitre}`;
  const diapositives = decouperPassage(passage, second, idElement);
  const premier = passage.versets[0];
  const dernier = passage.versets[passage.versets.length - 1];
  return {
    id: idElement,
    genre: 'bible',
    titre: formaterReference(r, passage.version.langue),
    meta: options.meta ?? [passage.version.abrege, second?.version.abrege].filter(Boolean).join(' + '),
    ordre: premier && dernier ? (premier === dernier ? `${premier.numero}` : `${premier.numero}–${dernier.numero}`) : '',
    diapositives,
    tonalite: null,
    personnel: false,
  };
}
