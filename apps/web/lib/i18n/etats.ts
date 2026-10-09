/** Traductions des états partagés : vide, chargement, erreur, hors-ligne (design 09 · États). */
import { definirModule } from './outils';

export const etats = definirModule(
  {
    horsLigneTitre: 'Réseau perdu. La projection continue.',
    horsLigneTitreHeure: 'Réseau perdu à {heure}. La projection continue.',
    horsLigneTexte:
      'Rien n’a été coupé : diapositives, Bible et écrans fonctionnent en local. Le téléphone-télécommande et les paroles de l’assemblée reprendront seuls au retour du réseau.',
    horsLignePret: 'Hors-ligne prêt',
    erreurTitre: 'Impossible de charger ce contenu',
    erreurTexte: 'Vérifiez la connexion puis réessayez. Ce qui est déjà ouvert reste projetable.',
    videTitre: 'Rien à afficher pour l’instant',

    // Vide · première ouverture
    rienAProjeterTitre: 'Rien à projeter pour l’instant',
    rienAProjeterTexte:
      'Tapez dans la barre du haut ce que vous voulez chanter et lire, ou partez d’une setlist d’exemple pour découvrir la régie.',
    essayerExemple: 'Essayer la setlist d’exemple',
    ouvrirMesSetlists: 'Ouvrir une de mes setlists',

    // Chargement · découpage des diapositives
    chargementDecoupage: 'Chargement · découpage des diapositives',
    preparationUne: 'Préparation de {n} diapositive… le titre est déjà projetable.',
    preparationPlusieurs: 'Préparation des {n} diapositives… le titre est déjà projetable.',
    preparationInconnue: 'Préparation des diapositives… le titre est déjà projetable.',

    // Hors-ligne · bureau et web
    horsLigneBureauWeb: 'Hors-ligne · bureau et web',
    bureauTitre: 'App de bureau',
    bureauTexte: 'Hors-ligne, et rien ne manque : recueils, Bibles, fonds et setlists sont sur l’ordinateur.',
    bureauNote: 'La synchronisation reprend seule au retour du réseau.',
    webTitre: 'Version web',
    webTexte: 'La setlist en cours reste projetable. Ce qui n’a jamais été ouvert ne l’est pas :',
    disponible: 'disponible',
    auRetourReseau: 'au retour du réseau',
    pasEncoreTelechargee: 'pas encore téléchargée',
    installerBureau: 'Pour le culte, installez l’app de bureau',

    // Réseau perdu en plein culte
    reseauPerduEnCulte: 'Réseau perdu en plein culte',
    sortie: 'Sortie',
    serviceSortieBible: 'Sortie et Bible',
    serviceMusiciens: 'Écran des musiciens',
    serviceTelecommande: 'Télécommande',
    serviceAssemblee: 'Paroles de l’assemblée',
    enLocal: 'en local',
    enLocalBureau: 'en local (bureau)',
    enAttente: 'en attente',
    servicesAria: 'État des services',

    // Serveur injoignable alors que le réseau est là
    erreurServeurTitre: 'Le serveur CMFIPraise ne répond pas',
    erreurServeurTexte:
      'Votre connexion fonctionne, mais le service est injoignable pour l’instant. Ce qui est déjà ouvert reste projetable ; réessayez dans un moment.',
  },
  {
    horsLigneTitre: 'Network lost. Projection keeps going.',
    horsLigneTitreHeure: 'Network lost at {heure}. Projection keeps going.',
    horsLigneTexte:
      'Nothing was cut off: slides, Bible and screens all run locally. The phone remote and the congregation’s lyrics will resume on their own when the network is back.',
    horsLignePret: 'Ready to work offline',
    erreurTitre: 'This content could not be loaded',
    erreurTexte: 'Check the connection, then try again. Anything already open can still be projected.',
    videTitre: 'Nothing to show yet',

    rienAProjeterTitre: 'Nothing to project yet',
    rienAProjeterTexte:
      'Type what you want to sing and read into the bar at the top, or start from a sample setlist to discover the control room.',
    essayerExemple: 'Try the sample setlist',
    ouvrirMesSetlists: 'Open one of my setlists',

    chargementDecoupage: 'Loading · splitting into slides',
    preparationUne: 'Preparing {n} slide… the title can already be projected.',
    preparationPlusieurs: 'Preparing {n} slides… the title can already be projected.',
    preparationInconnue: 'Preparing the slides… the title can already be projected.',

    horsLigneBureauWeb: 'Offline · desktop and web',
    bureauTitre: 'Desktop app',
    bureauTexte: 'Offline, and nothing is missing: songbooks, Bibles, backgrounds and setlists live on the computer.',
    bureauNote: 'Syncing resumes on its own when the network is back.',
    webTitre: 'Web version',
    webTexte: 'The current setlist can still be projected. Anything never opened cannot:',
    disponible: 'available',
    auRetourReseau: 'when the network is back',
    pasEncoreTelechargee: 'not downloaded yet',
    installerBureau: 'For services, install the desktop app',

    reseauPerduEnCulte: 'Network lost mid-service',
    sortie: 'Output',
    serviceSortieBible: 'Output and Bible',
    serviceMusiciens: 'Musicians’ screen',
    serviceTelecommande: 'Remote',
    serviceAssemblee: 'Congregation lyrics',
    enLocal: 'local',
    enLocalBureau: 'local (desktop)',
    enAttente: 'waiting',
    servicesAria: 'Service status',

    erreurServeurTitre: 'The CMFIPraise server is not responding',
    erreurServeurTexte:
      'Your connection works, but the service cannot be reached right now. Anything already open can still be projected; try again in a moment.',
  }
);
