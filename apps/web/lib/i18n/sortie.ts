/** Traductions du module « sortie ». Le français fait foi ; l'anglais doit avoir les mêmes clés. */
import { definirModule } from './outils';

export const sortie = definirModule(
  {
    titre: 'Sortie de projection',
    logo: 'CMFI',
    suivezLigne1: 'Suivez les paroles',
    suivezLigne2: 'sur votre téléphone',
    qrLibelle: 'QR code : suivre les paroles sur votre téléphone',
    astucePleinEcran: 'Glissez cette fenêtre sur le projecteur, puis appuyez sur F pour le plein écran.',
    attenteRegie: 'En attente de la régie… Appuyez sur F pour le plein écran.',
  },
  {
    titre: 'Projection output',
    logo: 'CMFI',
    suivezLigne1: 'Follow the lyrics',
    suivezLigne2: 'on your phone',
    qrLibelle: 'QR code: follow the lyrics on your phone',
    astucePleinEcran: 'Drag this window onto the projector, then press F for full screen.',
    attenteRegie: 'Waiting for the control room… Press F for full screen.',
  }
);
