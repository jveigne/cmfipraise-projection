/**
 * Passage de l'état de projection (régie) à l'état diffusé aux téléphones : on retire les
 * accords, les identifiants et le thème, on garde le texte et la position dans le culte.
 * Fonction pure, testée.
 */
import type { Diapositive, EtatProjection } from '@cmfi/projection';

import type { DiapositiveDiffusee, EtatDiffuse } from './transport';

function reduire(d: Diapositive): DiapositiveDiffusee {
  return {
    libelle: d.libelle,
    genre: d.genre,
    lignes: d.lignes.map((l) => l.texte),
    lignesSecondes: d.lignesSecondes ? d.lignesSecondes.map((l) => l.texte) : null,
    reference: d.reference,
  };
}

export interface OptionsDiffusion {
  /** Langue principale des paroles (réglages) : « fr » ou « en ». */
  langueParoles: 'fr' | 'en';
}

export function diffuserDepuisEtat(etat: EtatProjection, options: OptionsDiffusion): EtatDiffuse {
  const element = etat.element;
  const enDirect = element?.diapositives[etat.index] ?? null;
  const precedente = element && etat.index > 0 ? (element.diapositives[etat.index - 1] ?? null) : null;
  const programme = etat.programme;

  // Pour un verset, les « langues » sont les versions (« LSG + KJV ») : on les lit dans la
  // référence projetée (« Jean 3:16 · LSG »).
  const version = (ref: string | null) => (ref ? (ref.split(' · ').pop() ?? null) : null);
  const langues =
    enDirect?.genre === 'verset'
      ? { premiere: version(enDirect.reference) ?? '', seconde: version(enDirect.referenceSeconde) }
      : { premiere: options.langueParoles, seconde: options.langueParoles === 'fr' ? 'en' : 'fr' };

  return {
    v: 1,
    titre: element?.titre ?? null,
    programme:
      programme && programme.position >= 0
        ? { nom: programme.nom, position: programme.position + 1, total: programme.elements.length }
        : null,
    precedente: precedente ? reduire(precedente) : null,
    enDirect: enDirect ? reduire(enDirect) : null,
    suivante: etat.suivante
      ? { ...reduire(etat.suivante.diapositive), titreElement: etat.suivante.titreElement, changeElement: etat.suivante.changeElement }
      : null,
    ecranNoir: etat.ecranNoir,
    texteMasque: etat.texteMasque,
    logo: etat.logo,
    langues: enDirect?.lignesSecondes ? langues : { premiere: langues.premiere, seconde: null },
    misAJourLe: etat.misAJourLe,
  };
}
