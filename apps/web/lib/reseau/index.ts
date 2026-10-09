/**
 * Réseau, vu de l'interface :
 *  - état de la connexion (`useReseau`, `useEnLigne`, `signalerEchecApi`…) : ./etat ;
 *  - liaison avec les téléphones (télécommande, assemblée) : ./distant et ./transport,
 *    importés par leur chemin explicite (ils tirent le transport local).
 */
export {
  lireEtatReseau,
  reinitialiserEtatReseau,
  signalerEchecApi,
  signalerReussiteApi,
  useEnLigne,
  useReseau,
} from './etat';
export type { ErreurReseau, EtatReseau, InstantaneReseau } from './etat';
