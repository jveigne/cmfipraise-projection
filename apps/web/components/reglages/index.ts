/**
 * Réglages de projection. Pour la régie et la sortie :
 *  - useReglages() / lireReglages()    réglages courants (localStorage `app_reglages`)
 *  - themeSortieDepuisReglages(r)       Partial<ThemeSortie> pour l'action `appliquerTheme`
 *  - ecranAffecte(plateforme, 'sortie') écran choisi pour la sortie (ou les musiciens)
 */
export { Reglages } from './Reglages';
export { ApercuSortie } from './ApercuSortie';
export {
  CLE_AFFECTATIONS_ECRANS,
  ECHELLE_TAILLE,
  REGLAGES_PAR_DEFAUT,
  ecranAffecte,
  ecrireReglages,
  lireAffectationsEcrans,
  lireReglages,
  reaffecterEcran,
  themeSortieDepuisReglages,
  useReglages,
} from './stockage';
export type { AffectationEcran, ReglagesProjection, TailleReglage, ThemeReglage } from './stockage';
export { formaterRapport, niveauContraste, rapportContraste } from './contraste';
