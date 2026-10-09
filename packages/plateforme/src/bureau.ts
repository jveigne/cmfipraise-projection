/**
 * Implémentation bureau : un simple adaptateur vers `window.cmfi`, exposé par le preload
 * Electron selon contrat.ts. Aucune logique ici : elle vit dans le processus principal.
 */
import type { ApiBureau, EcranBureau } from './contrat';
import type { Ecran, Plateforme } from './types';

function versEcran(e: EcranBureau): Ecran {
  return { id: e.id, libelle: e.libelle, largeur: e.largeur, hauteur: e.hauteur, principal: e.principal, interne: e.interne };
}

export function creerPlateformeBureau(cmfi: ApiBureau): Plateforme {
  return {
    type: 'bureau',
    estBureau: () => true,
    peutChoisirEcran: () => true,

    listerEcrans: async () => (await cmfi.ecrans.lister()).map(versEcran),
    surChangementEcrans: (rappel) => cmfi.ecrans.surChangement((ecrans) => rappel(ecrans.map(versEcran))),

    ouvrirSortie: (options) =>
      cmfi.sorties.ouvrir({
        nom: options.nom ?? 'sortie',
        route: options.route,
        ecranId: options.ecranId ?? null,
        pleinEcran: options.pleinEcran ?? (options.nom ?? 'sortie') === 'sortie',
      }),
    fermerSortie: (nom = 'sortie') => cmfi.sorties.fermer(nom),
    sortieOuverte: (nom = 'sortie') => cmfi.sorties.estOuverte(nom),
    surFermetureSortie: (rappel) => cmfi.sorties.surFermeture(rappel),

    async empecherVeille() {
      const id = await cmfi.veille.empecher();
      return { liberer: () => cmfi.veille.autoriser(id) };
    },

    lirePreference: async <T,>(cle: string) => (await cmfi.preferences.lire(cle)) as T | undefined,
    ecrirePreference: (cle, valeur) => cmfi.preferences.ecrire(cle, valeur),

    ouvrirLienExterne: (url) => cmfi.liens.ouvrirExterne(url),
  };
}
