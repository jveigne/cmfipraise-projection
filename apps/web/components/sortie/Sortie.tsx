'use client';

/**
 * La sortie projetée : une page plein écran qui n'a qu'une source, la régie.
 *
 * Elle écoute le BroadcastChannel (aucun réseau : si Internet tombe, elle continue), rend
 * l'état reçu avec la même surface que l'aperçu de la régie, et ne garde jamais un état
 * plus ancien que celui qu'elle affiche. Avant le premier état, elle montre le logo :
 * personne dans la salle ne voit une page vide ni la régie.
 *
 * Les touches pressées ici (télécommande de présentation, flèches, B) sont relayées à la
 * régie : un bénévole qui a cliqué sur la mauvaise fenêtre n'est pas bloqué.
 */
import { ouvrirCanal, THEME_PAR_DEFAUT, type CanalProjection, type CommandeRegie, type EtatProjection } from '@cmfi/projection';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useT } from '@/lib/i18n';
import { useEstBureau, usePlateforme } from '@/lib/plateforme';

import styles from './Sortie.module.css';
import { propsDepuisEtat, SurfaceProjection } from './SurfaceProjection';
import { urlSuivre } from './urlSuivre';

const DELAI_CURSEUR_MS = 2500;
const DUREE_ASTUCE_MS = 8000;

/** Touches relayées à la régie. Les télécommandes de présentation envoient Page suivante/précédente. */
function commandePourTouche(e: KeyboardEvent): CommandeRegie | null {
  if (e.altKey || e.ctrlKey || e.metaKey) return null;
  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowDown':
    case 'PageDown':
    case ' ':
      return 'suivante';
    case 'ArrowLeft':
    case 'ArrowUp':
    case 'PageUp':
      return 'precedente';
    case 'b':
    case 'B':
    case '.':
      return 'ecran-noir';
    default:
      return null;
  }
}

function dimensions() {
  const ratio = window.devicePixelRatio || 1;
  return { largeur: Math.round(window.innerWidth * ratio), hauteur: Math.round(window.innerHeight * ratio) };
}

export function Sortie() {
  const t = useT('sortie');
  const plateforme = usePlateforme();
  // Faux dans le HTML exporté, vrai après l'hydratation dans l'app de bureau : pas d'écart d'hydratation.
  const estBureau = useEstBureau();
  const [etat, setEtat] = useState<EtatProjection | null>(null);
  const [pleinEcran, setPleinEcran] = useState(false);
  const [astuce, setAstuce] = useState(true);
  const [curseurCache, setCurseurCache] = useState(false);
  const [urlQr, setUrlQr] = useState<string | null>(null);
  const canal = useRef<CanalProjection | null>(null);

  // ─── Canal ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const c = ouvrirCanal('sortie');
    canal.current = c;
    const annoncer = () => c.envoyer({ type: 'presence', present: true, ...dimensions() });

    const desabonner = c.ecouter((message, enveloppe) => {
      if (message.type === 'etat' && enveloppe.role === 'regie') {
        // Un état plus ancien que celui affiché (message retardé) est ignoré.
        setEtat((actuel) => (actuel && actuel.misAJourLe > message.etat.misAJourLe ? actuel : message.etat));
      } else if (message.type === 'presence' && enveloppe.role === 'regie' && message.present) {
        // La régie vient d'(r)ouvrir : on se signale et on redemande l'état.
        annoncer();
        c.envoyer({ type: 'demande-etat' });
      }
    });

    annoncer();
    c.envoyer({ type: 'demande-etat' });

    const auRedimensionnement = () => annoncer();
    const auDepart = () => c.envoyer({ type: 'presence', present: false });
    // Onglet ramené au premier plan : l'état a pu changer pendant que le navigateur le gelait.
    const auRetour = () => {
      if (document.visibilityState === 'visible') c.envoyer({ type: 'demande-etat' });
    };
    window.addEventListener('resize', auRedimensionnement);
    window.addEventListener('pagehide', auDepart);
    document.addEventListener('visibilitychange', auRetour);
    return () => {
      window.removeEventListener('resize', auRedimensionnement);
      window.removeEventListener('pagehide', auDepart);
      document.removeEventListener('visibilitychange', auRetour);
      auDepart();
      desabonner();
      c.fermer();
      canal.current = null;
    };
  }, []);

  // ─── Adresse du QR (dépend de window) ──────────────────────────────────────
  // Le code de la salle vient de la régie : le téléphone qui lit le QR arrive dans le culte.
  const codeSalle = etat?.codeSalle ?? null;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'adresse dépend de window, connue après hydratation
    setUrlQr(urlSuivre(window.location, codeSalle));
  }, [codeSalle]);

  // ─── Veille : l'écran du projecteur ne doit jamais s'éteindre ──────────────
  useEffect(() => {
    let verrou: Awaited<ReturnType<typeof plateforme.empecherVeille>> = null;
    let actif = true;
    void plateforme
      .empecherVeille()
      .then((v) => {
        if (actif) verrou = v;
        else void v?.liberer();
      })
      .catch(() => {});
    return () => {
      actif = false;
      void verrou?.liberer();
    };
  }, [plateforme]);

  // ─── Plein écran ───────────────────────────────────────────────────────────
  const basculerPleinEcran = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    const surChangement = () => setPleinEcran(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', surChangement);
    surChangement();
    const minuterie = window.setTimeout(() => setAstuce(false), DUREE_ASTUCE_MS);
    return () => {
      document.removeEventListener('fullscreenchange', surChangement);
      window.clearTimeout(minuterie);
    };
  }, []);

  // ─── Clavier : plein écran ici, le reste relayé à la régie ─────────────────
  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => {
      if ((e.key === 'f' || e.key === 'F') && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        basculerPleinEcran();
        return;
      }
      const commande = commandePourTouche(e);
      if (!commande) return;
      e.preventDefault();
      canal.current?.envoyer({ type: 'commande', commande });
    };
    window.addEventListener('keydown', auClavier);
    return () => window.removeEventListener('keydown', auClavier);
  }, [basculerPleinEcran]);

  // ─── Curseur : masqué dès que la souris ne bouge plus ──────────────────────
  useEffect(() => {
    let minuterie = window.setTimeout(() => setCurseurCache(true), DELAI_CURSEUR_MS);
    const auMouvement = () => {
      setCurseurCache(false);
      window.clearTimeout(minuterie);
      minuterie = window.setTimeout(() => setCurseurCache(true), DELAI_CURSEUR_MS);
    };
    window.addEventListener('mousemove', auMouvement);
    return () => {
      window.removeEventListener('mousemove', auMouvement);
      window.clearTimeout(minuterie);
    };
  }, []);

  const surface = etat
    ? propsDepuisEtat(etat)
    : { contenu: 'logo' as const, diapositive: null, titreElement: null, theme: THEME_PAR_DEFAUT, bilingue: false };

  // Sur le bureau, la sortie s'ouvre déjà plein écran sur le projecteur : aucune astuce.
  const montrerAstuce = astuce && !pleinEcran && !estBureau && surface.contenu !== 'noir';

  return (
    <main className={`${styles.sortie} ${curseurCache ? styles.sansCurseur : ''}`} onDoubleClick={basculerPleinEcran}>
      <h1 className="visuellement-masque">{t.titre}</h1>
      <SurfaceProjection {...surface} mode="sortie" urlQr={urlQr} />
      {montrerAstuce && (
        <p className={styles.astuce} role="status">
          {etat ? t.astucePleinEcran : t.attenteRegie}
        </p>
      )}
    </main>
  );
}
