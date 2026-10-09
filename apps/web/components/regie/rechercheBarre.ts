/**
 * La barre unique : « Grâce infinie, Psaume 23, Jn 3:16 » → trois éléments de setlist.
 *
 * Partie pure (découpage de la saisie, recherche dans les recueils en cache, classement),
 * testée à part. La partie qui interroge le serveur et la Bible est dans interpretation.ts.
 *
 * Ce que comprend la barre (Parcours-Saisie.dc.html) : un titre, un numéro dans le recueil,
 * un vers même sans accents, toutes les écritures de référence biblique (FR et EN).
 */
import type { ChantDTO, RecueilEnCache } from '@cmfi/api';

/**
 * Coupe la saisie en segments. Séparateurs : point-virgule, retour à la ligne, et virgule
 * SUIVIE D'UNE ESPACE. Une virgule collée appartient à une référence (« Rm 8,28 ») : c'est
 * ainsi qu'on l'écrit en français, et ainsi qu'on sépare une liste quand on la tape.
 */
export function decouperSaisie(saisie: string): string[] {
  return saisie
    .split(/;|\n|,\s+/)
    .map((s) => s.trim().replace(/,$/, '').trim())
    .filter((s) => s.length > 0);
}

/** Minuscules, sans accents ni ponctuation, espaces réduites : « À toi la gloire ! » → « a toi la gloire ». */
export function normaliserRecherche(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'`´"«»“”.,;:!?¡¿()[\]{}\-–—_/\\*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** « 112 », « n° 112 », « no 112 », « #112 » → 112 ; sinon null. */
export function lireNumero(segment: string): number | null {
  const m = /^(?:n\s*°|no\.?|n\.|#)?\s*(\d{1,4})$/i.exec(segment.trim());
  if (!m?.[1]) return null;
  const n = Number(m[1]);
  return n > 0 ? n : null;
}

/** Pourquoi un chant a été retenu : affiché à côté du résultat (« titre exact », « premier vers »…). */
export type RaisonCandidat = 'titre-exact' | 'numero' | 'debut-titre' | 'titre' | 'premier-vers' | 'vers' | 'serveur';

export interface CandidatChant {
  id: string;
  titre: string;
  recueil?: string;
  numero?: number;
  langue?: string;
  auteur?: string;
  raison: RaisonCandidat;
  /** Vers qui a fait correspondre, pour le montrer. */
  vers?: string;
  /** Chant complet s'il vient du cache (paroles comprises) ; à charger sinon. */
  chant?: ChantDTO;
}

const RANG: Record<RaisonCandidat, number> = {
  'titre-exact': 0,
  numero: 1,
  'debut-titre': 2,
  titre: 3,
  'premier-vers': 4,
  vers: 5,
  serveur: 6,
};

/** Lignes de paroles d'un chant, dans l'ordre d'enchaînement, sans répétitions de refrain. */
function lignesDuChant(chant: ChantDTO): string[] {
  if (chant.parts && chant.parts.length > 0) {
    const vues = new Set<string>();
    const lignes: string[] = [];
    for (const p of [...chant.parts].sort((a, b) => a.position - b.position)) {
      const cle = `${p.type}:${p.partId}`;
      if (vues.has(cle)) continue;
      vues.add(cle);
      for (const l of p.lines ?? []) if (l.line.trim()) lignes.push(l.line);
    }
    return lignes;
  }
  return [...(chant.verses ?? []), ...(chant.choruses ?? [])].flatMap((s) => s.lines.map((l) => l.line)).filter((l) => l.trim());
}

function candidat(chant: ChantDTO, recueil: RecueilEnCache, raison: RaisonCandidat, vers?: string): CandidatChant {
  return {
    id: chant.id,
    titre: chant.title.trim(),
    recueil: recueil.titre,
    numero: chant.position > 0 ? chant.position : undefined,
    langue: recueil.langue,
    auteur: chant.artist ?? chant.author ?? undefined,
    raison,
    vers,
    chant,
  };
}

/**
 * Cherche dans les recueils téléchargés. Ordre : titre exact, numéro, début de titre,
 * titre contenant la saisie, premier vers, autre vers. Les recueils de `langueFavorite`
 * passent devant à raison égale (« 112 » existe dans chaque recueil).
 */
export function chercherDansRecueils(
  recueils: readonly RecueilEnCache[],
  segment: string,
  options: { langueFavorite?: string; limite?: number } = {}
): CandidatChant[] {
  const limite = options.limite ?? 8;
  const numero = lireNumero(segment);
  const requete = normaliserRecherche(segment);
  if (!requete) return [];

  const trouves: CandidatChant[] = [];
  for (const recueil of recueils) {
    for (const chant of recueil.chants) {
      if (numero !== null) {
        if (chant.position === numero) trouves.push(candidat(chant, recueil, 'numero'));
        continue;
      }
      const titre = normaliserRecherche(chant.title);
      if (titre === requete) {
        trouves.push(candidat(chant, recueil, 'titre-exact'));
        continue;
      }
      if (titre.startsWith(requete)) {
        trouves.push(candidat(chant, recueil, 'debut-titre'));
        continue;
      }
      // Trop court, un fragment de titre ou de vers correspond à n'importe quoi.
      if (requete.length < 3) continue;
      if (titre.includes(requete)) {
        trouves.push(candidat(chant, recueil, 'titre'));
        continue;
      }
      if (requete.length < 4) continue;
      const lignes = lignesDuChant(chant);
      const index = lignes.findIndex((l) => normaliserRecherche(l).includes(requete));
      if (index >= 0) trouves.push(candidat(chant, recueil, index === 0 ? 'premier-vers' : 'vers', lignes[index]));
    }
  }

  const favorite = options.langueFavorite;
  return trouves
    .map((c, ordre) => ({ c, ordre }))
    .sort(
      (a, b) =>
        RANG[a.c.raison] - RANG[b.c.raison] ||
        Number(b.c.langue === favorite) - Number(a.c.langue === favorite) ||
        a.ordre - b.ordre
    )
    .slice(0, limite)
    .map(({ c }) => c);
}

/** Ajoute les résultats du serveur absents du cache, après eux. */
export function fusionnerCandidats(locaux: readonly CandidatChant[], serveur: readonly ChantDTO[], limite = 8): CandidatChant[] {
  const ids = new Set(locaux.map((c) => c.id));
  const ajouts: CandidatChant[] = [];
  for (const chant of serveur) {
    if (!chant?.id || ids.has(chant.id)) continue;
    ids.add(chant.id);
    ajouts.push({
      id: chant.id,
      titre: chant.title?.trim() ?? '',
      numero: chant.position > 0 ? chant.position : undefined,
      langue: typeof chant.language === 'string' ? chant.language : undefined,
      auteur: chant.artist ?? chant.author ?? undefined,
      raison: 'serveur',
      chant: (chant.parts?.length ?? 0) > 0 ? chant : undefined,
    });
  }
  return [...locaux, ...ajouts].slice(0, limite);
}
