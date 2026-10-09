/** Traductions du module « accueil » (design 01). Le français fait foi ; l'anglais doit avoir les mêmes clés. */
import { definirModule } from './outils';

// Paroles de l'illustration (chant d'exemple du design) : contenu, pas interface, donc
// identiques dans les deux langues — la seconde ligne du téléphone montre l'anglais.
const EXEMPLE = {
  exempleTitre: 'Grâce infinie',
  exempleRefrain1: 'Gloire à l’Agneau, gloire à Jésus,',
  exempleRefrain2: 'Sa grâce est infinie ;',
  exempleRefrain3: 'Gloire à l’Agneau, gloire à Jésus,',
  exempleRefrain4: 'Il m’a rendu la vie.',
  exempleExtrait: 'Gloire à l’Agneau, gloire à Jésus, Sa grâce est infinie ; Gloire à l’Agneau…',
  exempleSeconde: 'Glory to the Lamb, glory to Jesus…',
};

export const accueil = definirModule(
  {
    navigation: 'Principale',
    navChants: 'Chants',
    navProjection: 'Projection',
    navSoutenir: 'Soutenir',
    langueVersAnglais: 'Langue : français. Passer en anglais',
    langueVersFrancais: 'Language: English. Switch to French',

    accroche: 'Les chants de la CMFI, dans la poche de chacun et sur le grand écran.',
    chapeau:
      'Projetez paroles et passages bibliques pendant le culte, en français et en anglais. Rien à installer, aucun compte pour essayer.',
    chanter: 'Chanter',
    chanterTexte: 'Ouvrir le recueil : recherche, accords, favoris',
    projeter: 'Projeter',
    projeterTexte: 'Essayer tout de suite avec une setlist d’exemple →',
    ...EXEMPLE,

    soutien: 'Soutien',
    bandeauDon: 'CMFIPraise est gratuit et le restera. Il vit des dons de ceux qui l’utilisent — par carte ou Mobile Money.',
    faireUnDon: 'Faire un don',

    etapesTitre: 'Un culte prêt en deux minutes',
    etape1Titre: 'Tapez, d’un trait',
    etape1Texte:
      '« Grâce infinie, Psaume 23, Jn 3:16 » dans une seule barre. Chants et versets arrivent déjà découpés en diapositives.',
    etape2Titre: 'Projetez sans trembler',
    etape2Texte: 'La diapositive à l’écran est marquée d’or, la suivante est toujours visible. Une coupure réseau n’arrête rien.',
    etape3Titre: 'Chacun suit sur son téléphone',
    etape3Texte: 'Un QR discret sur l’écran : les paroles en direct, dans sa langue, en plus gros s’il le souhaite.',

    atouts: 'Ce que l’outil sait faire',
    atout1Titre: 'Culte bilingue',
    atout1Texte: 'Français en grand, anglais en dessous. Deux versions de la Bible côte à côte.',
    atout2Titre: 'Écran des musiciens',
    atout2Texte: 'Accords, tonalité, partie suivante et ordre du culte, sur un lien ou un troisième écran.',
    atout3Titre: 'Le téléphone comme télécommande',
    atout3Texte: 'Appairé par QR depuis l’app CMFIPraise. Passez les diapos, lancez un verset demandé au dernier moment.',
    atout4Titre: 'Les mêmes chants que l’app mobile',
    atout4Texte: 'Recueils officiels, chants personnels et setlists partagées entre le téléphone et l’ordinateur.',

    bureauTitre: 'Pour le culte du dimanche : l’app de bureau',
    bureauTexte: 'Tout hors-ligne, double écran natif, troisième sortie pour les musiciens. Même interface que la version web.',
    telechargerWindows: 'Télécharger pour Windows',
    telechargerMac: 'Télécharger pour macOS',
    bientotDisponible: 'Bientôt disponible : la version web fait déjà tout, en ligne.',
    bientot: 'bientôt',

    piedSlogan: 'CMFIPraise · gratuit, soutenu par vos dons',
    appMobile: 'Application mobile',
    shephr: 'Shephr — la gestion de l’assemblée',
    confidentialite: 'Confidentialité',
  },
  {
    navigation: 'Main',
    navChants: 'Songs',
    navProjection: 'Projection',
    navSoutenir: 'Support us',
    langueVersAnglais: 'Langue : français. Switch to English',
    langueVersFrancais: 'Language: English. Switch to French',

    accroche: 'The songs of CMFI, in everyone’s pocket and on the big screen.',
    chapeau:
      'Project lyrics and Bible passages during the service, in English and French. Nothing to install, no account needed to try it.',
    chanter: 'Sing',
    chanterTexte: 'Open the songbook: search, chords, favourites',
    projeter: 'Project',
    projeterTexte: 'Try it right now with a sample setlist →',
    ...EXEMPLE,

    soutien: 'Support',
    bandeauDon: 'CMFIPraise is free and will stay free. It lives on the gifts of those who use it — by card or Mobile Money.',
    faireUnDon: 'Give',

    etapesTitre: 'A service ready in two minutes',
    etape1Titre: 'Type it in one go',
    etape1Texte: '“Grâce infinie, Psalm 23, Jn 3:16” in a single bar. Songs and verses arrive already split into slides.',
    etape2Titre: 'Project with confidence',
    etape2Texte: 'The slide on screen is marked in gold, the next one is always visible. A network drop stops nothing.',
    etape3Titre: 'Everyone follows on their phone',
    etape3Texte: 'A discreet QR on the screen: live lyrics, in their language, larger if they wish.',

    atouts: 'What it can do',
    atout1Titre: 'Bilingual service',
    atout1Texte: 'French in large type, English below. Two Bible versions side by side.',
    atout2Titre: 'Musicians’ screen',
    atout2Texte: 'Chords, key, next part and order of service, on a link or a third screen.',
    atout3Titre: 'Your phone as a remote',
    atout3Texte: 'Paired by QR from the CMFIPraise app. Move through slides, bring up a verse asked for at the last minute.',
    atout4Titre: 'The same songs as the mobile app',
    atout4Texte: 'Official songbooks, personal songs and setlists shared between phone and computer.',

    bureauTitre: 'For Sunday service: the desktop app',
    bureauTexte: 'Fully offline, native dual screen, a third output for musicians. Same interface as the web version.',
    telechargerWindows: 'Download for Windows',
    telechargerMac: 'Download for macOS',
    bientotDisponible: 'Coming soon: the web version already does everything, online.',
    bientot: 'coming soon',

    piedSlogan: 'CMFIPraise · free, supported by your gifts',
    appMobile: 'Mobile app',
    shephr: 'Shephr — church management',
    confidentialite: 'Privacy',
  }
);
