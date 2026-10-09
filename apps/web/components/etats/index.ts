/**
 * États partagés (design 09 · États), à adopter par tous les écrans :
 *  - EtatRienAProjeter      vide · première ouverture (régie)
 *  - ChargementDiapositives chargement d'un élément, titre déjà projetable
 *  - GrilleHorsLigne / CarteHorsLigneBureau / CarteHorsLigneWeb   ce qui reste disponible
 *  - ReseauPerduEnCulte / ServicesHorsLigne   coupure pendant le culte
 *  - IndicateurReseau       bandeau automatique (hors-ligne, serveur injoignable)
 *  - PastilleHorsLignePret  barre de titre du bureau
 * Le vide générique, le chargement et l'erreur d'un panneau restent EtatCentre (components/ui).
 * L'état du réseau : useReseau, signalerEchecApi, signalerReussiteApi (lib/reseau/etat).
 */
export { EtatRienAProjeter } from './EtatRienAProjeter';
export type { PropsEtatRienAProjeter } from './EtatRienAProjeter';
export { ChargementDiapositives } from './ChargementDiapositives';
export { CarteHorsLigneBureau, CarteHorsLigneWeb, GrilleHorsLigne } from './CartesHorsLigne';
export type { DisponibiliteHorsLigne } from './CartesHorsLigne';
export { ReseauPerduEnCulte, ServicesHorsLigne } from './ReseauPerduEnCulte';
export type { ServiceHorsLigne } from './ReseauPerduEnCulte';
export { IndicateurReseau } from './IndicateurReseau';
export { PastilleHorsLignePret } from './PastilleHorsLignePret';
