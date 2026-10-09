'use client';

/**
 * Colonne de droite : l'aperçu Sortie (exactement ce que voit la salle), la diapositive à
 * suivre, et les commandes du culte — « Suivant » 64 px, bascules 96 px. Aucune commande
 * destructrice : tout se rétablit d'un second clic.
 */
import type { DiapositiveSuivante, EtatProjection } from '@cmfi/projection';
import type { ReactNode } from 'react';

import { Bouton, Icone, Interrupteur, type NomIcone } from '@/components/ui';
import { formater, useT } from '@/lib/i18n';
import { propsDepuisEtat, SurfaceProjection } from '@/components/sortie/SurfaceProjection';

import styles from './PanneauSortie.module.css';
import type { Phase } from './seance';

export interface PropsPanneauSortie {
  phase: Phase;
  etat: EtatProjection;
  urlQr: string | null;
  sortieOuverte: boolean;
  /** « écran 2 · 1920 × 1080 », « fenêtre ouverte », « fermée ». */
  resumeSortie: string;
  erreurSortie: string | null;
  /** Vrai entre « Lancer » et la première diapositive : la sortie montre le logo. */
  avantPremiere: boolean;
  suivante: DiapositiveSuivante | null;
  peutPrecedent: boolean;
  surOuvrirSortie: () => void;
  surFermerSortie: () => void;
  surSuivant: () => void;
  surPrecedent: () => void;
  surTerminer: () => void;
  surEcranNoir: () => void;
  surMasquer: () => void;
  surLogo: () => void;
  surBilingue: () => void;
}

function Bascule({
  icone,
  libelle,
  actif,
  touche,
  surClic,
  plein,
}: {
  icone: NomIcone;
  libelle: string;
  actif: boolean;
  touche: string;
  surClic: () => void;
  plein?: boolean;
}) {
  const t = useT('regie');
  return (
    <button type="button" aria-pressed={actif} className={`${styles.bascule} ${actif ? styles.basculeActive : ''}`} onClick={surClic}>
      <Icone nom={icone} taille={22} epaisseur={plein ? 1.4 : 1.5} />
      <span>{libelle}</span>
      <span className={styles.basculeAide}>{actif ? t.basculeActive : formater(t.raccourci, { touche })}</span>
    </button>
  );
}

function Carte({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`${styles.carte} ${className ?? ''}`}>{children}</div>;
}

export function PanneauSortie(p: PropsPanneauSortie) {
  const t = useT('regie');
  const surface = propsDepuisEtat(p.etat);
  const direct = p.phase === 'direct';
  const diapo = surface.diapositive;
  const finSetlist = direct && !p.avantPremiere && !p.suivante;

  let legende: ReactNode;
  if (p.phase === 'preparation') legende = t.logoOuverture;
  else if (p.phase === 'fin') legende = null;
  else if (p.avantPremiere) legende = t.premiereAttend;
  else if (diapo && p.etat.element) legende = `${p.etat.element.titre} · ${diapo.libelle}`;

  return (
    <section aria-labelledby="regie-sortie-titre" className={styles.colonne}>
      <Carte>
        <div className={styles.enteteSortie}>
          <h2 id="regie-sortie-titre" className="etiquette-etat">
            {t.sortie}
          </h2>
          <span className="meta">· {p.resumeSortie}</span>
          <span className={styles.espace} />
          {direct && <span className={styles.etiquetteDirect}>{t.enDirect}</span>}
        </div>
        <SurfaceProjection {...surface} mode="apercu" urlQr={p.urlQr} messageEcranNoir={t.ecranNoirActif} />
        {legende && <p className="meta">{legende}</p>}
        {!p.sortieOuverte && (
          <Bouton variante="plein" icone="ecran" onClick={p.surOuvrirSortie}>
            {t.ouvrirSortie}
          </Bouton>
        )}
        {p.phase === 'fin' && p.sortieOuverte && (
          <Bouton variante="secondaire" taille="grande" pleineLargeur onClick={p.surFermerSortie}>
            {t.fermerSortie}
          </Bouton>
        )}
        {p.erreurSortie && (
          <p className={styles.erreur} role="alert">
            {p.erreurSortie}
          </p>
        )}
      </Carte>

      {direct && (
        <Carte className={styles.carteSuivante}>
          <div className={styles.miniature}>
            {p.suivante ? (
              <SurfaceProjection
                contenu="texte"
                diapositive={p.suivante.diapositive}
                titreElement={p.suivante.titreElement}
                theme={p.etat.theme}
                bilingue={p.etat.bilingue}
                mode="miniature"
              />
            ) : (
              <SurfaceProjection contenu="logo" diapositive={null} titreElement={null} theme={p.etat.theme} bilingue={false} mode="miniature" />
            )}
          </div>
          <div className={styles.suivanteTextes}>
            <span className={styles.aSuivre}>{t.aSuivre}</span>
            <span className="titre-oeuvre-liste">
              {p.suivante ? `${p.suivante.diapositive.libelle} — ${p.suivante.titreElement}` : t.finSetlist}
            </span>
            <span className="meta">
              {p.suivante ? (p.suivante.changeElement ? t.elementSuivant : t.appuyezSuivant) : t.finSetlistAide}
            </span>
          </div>
        </Carte>
      )}

      {direct && (
        <Carte>
          <div className={styles.navigation}>
            <Bouton variante="secondaire" taille="suivant" icone="chevronGauche" className={styles.precedent} disabled={!p.peutPrecedent} onClick={p.surPrecedent}>
              {t.precedent}
            </Bouton>
            {finSetlist ? (
              <Bouton variante="plein" taille="suivant" iconeFin="coche" className={styles.suivant} onClick={p.surTerminer}>
                {t.terminerCulte}
              </Bouton>
            ) : (
              <Bouton variante="plein" taille="suivant" iconeFin="flecheDroite" className={styles.suivant} onClick={p.surSuivant}>
                {t.suivant}
              </Bouton>
            )}
          </div>
          <div className={styles.bascules}>
            <Bascule icone="ecranNoir" plein libelle={t.ecranNoir} actif={p.etat.ecranNoir} touche="B" surClic={p.surEcranNoir} />
            <Bascule icone="masquer" libelle={t.masquerTexte} actif={p.etat.texteMasque} touche="T" surClic={p.surMasquer} />
            <Bascule icone="image" libelle={t.logo} actif={p.etat.logo} touche="L" surClic={p.surLogo} />
          </div>
          <Interrupteur coche={p.etat.bilingue} surChangement={p.surBilingue} libelle={t.bilingue} icone="globe" className={styles.bilingue} />
        </Carte>
      )}
    </section>
  );
}
