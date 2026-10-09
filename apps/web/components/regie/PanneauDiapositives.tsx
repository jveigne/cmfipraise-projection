'use client';

/**
 * Colonne centrale : les diapositives de l'élément consulté. Bordure 3 px or = en direct,
 * 2 px bleu = la suivante, 1 px filet = les autres. Un clic projette.
 */
import type { ElementSetlist } from '@cmfi/api';
import type { ElementProjete } from '@cmfi/projection';

import { Bouton, EtatCentre, Squelette } from '@/components/ui';
import { formater, useT } from '@/lib/i18n';

import styles from './Diapositives.module.css';
import { texteCause } from './PanneauSetlist';
import type { ElementResolu, Phase } from './seance';

export interface PropsPanneauDiapositives {
  phase: Phase;
  element: ElementSetlist;
  resolu: ElementResolu | undefined;
  /** Index de la diapositive en direct dans cet élément, ou null. */
  indexDirect: number | null;
  /** Index de la suivante dans cet élément, ou null. */
  indexSuivante: number | null;
  /** Vrai si l'élément consulté n'est pas celui en direct. */
  horsDirect: boolean;
  surProjeter: (index: number) => void;
  surRevenirDirect: () => void;
  surRetourControle: () => void;
  surReessayer: (id: string) => void;
}

function Touches() {
  const t = useT('regie');
  return (
    <div className={styles.touches} aria-label={t.raccourcisLibelle} role="group">
      <span className={styles.touche}>
        <span className="touche">←</span>
        <span className="touche">→</span> {t.toucheDiapositive}
      </span>
      <span className={styles.touche}>
        <span className="touche">{t.toucheEspace}</span> {t.toucheSuivante}
      </span>
      <span className={styles.touche}>
        <span className="touche">B</span> {t.ecranNoir}
      </span>
      <span className={styles.touche}>
        <span className="touche">T</span> {t.masquerTexte}
      </span>
      <span className={styles.touche}>
        <span className="touche">L</span> {t.logo}
      </span>
      <span className={styles.touche}>
        <span className="touche">{t.toucheEchap}</span> {t.toucheEchapAide}
      </span>
    </div>
  );
}

function Notes({ resolu }: { resolu: Extract<ElementResolu, { statut: 'pret' }> }) {
  const t = useT('regie');
  const notes = [
    resolu.exemple ? t.noteExemple : null,
    resolu.echantillon ? t.noteTexteEchantillon : null,
    resolu.incomplet ? t.notePassageIncomplet : null,
    resolu.secondeManquante ? t.noteSecondeManquante : null,
  ].filter(Boolean);
  if (notes.length === 0) return null;
  return (
    <ul className={styles.notes}>
      {notes.map((n) => (
        <li key={n}>{n}</li>
      ))}
    </ul>
  );
}

export function PanneauDiapositives({
  phase,
  element,
  resolu,
  indexDirect,
  indexSuivante,
  horsDirect,
  surProjeter,
  surRevenirDirect,
  surRetourControle,
  surReessayer,
}: PropsPanneauDiapositives) {
  const t = useT('regie');
  const projete: ElementProjete | null = resolu?.statut === 'pret' ? resolu.projete : null;
  const titre = projete?.titre ?? (element.type === 'chant' ? element.titre : element.reference);

  return (
    <section aria-labelledby="regie-diapos-titre" className={styles.panneau}>
      <div className={styles.entete}>
        <div className={styles.enteteTextes}>
          <h2 id="regie-diapos-titre" className="titre-ecran">
            {titre}
          </h2>
          {projete && (
            <p className="meta">
              {projete.meta}
              {projete.ordre ? ` · ${formater(t.ordre, { ordre: projete.ordre })}` : ''}
            </p>
          )}
          {resolu?.statut === 'pret' && <Notes resolu={resolu} />}
        </div>
        {phase === 'direct' && horsDirect && (
          <Bouton variante="secondaire" onClick={surRevenirDirect}>
            <span className={styles.pointOr} aria-hidden="true" />
            {t.revenirDirect}
          </Bouton>
        )}
        {phase === 'preparation' && (
          <Bouton variante="secondaire" icone="chevronGauche" onClick={surRetourControle}>
            {t.retourControle}
          </Bouton>
        )}
      </div>

      {(!resolu || resolu.statut === 'chargement') && (
        <div className={styles.grille} role="status" aria-busy="true">
          <p className="visuellement-masque">{t.preparationDiapositives}</p>
          {[0, 1, 2, 3].map((k) => (
            <div key={k} className={styles.squelette}>
              <Squelette largeur={22} hauteur={14} />
              <Squelette largeur="92%" />
              <Squelette largeur="74%" />
              <Squelette largeur="86%" />
              <Squelette largeur="58%" />
            </div>
          ))}
        </div>
      )}

      {resolu?.statut === 'erreur' && (
        <EtatCentre
          genre="erreur"
          titre={t.elementIndisponible}
          texte={texteCause(resolu, t)}
          actions={
            resolu.cause === 'reseau' || resolu.cause === 'introuvable' ? (
              <Bouton variante="secondaire" onClick={() => surReessayer(element.id)}>
                {t.reessayer}
              </Bouton>
            ) : undefined
          }
        />
      )}

      {projete && (
        <ol className={styles.grille} aria-label={t.diapositives}>
          {projete.diapositives.map((d, i) => {
            const direct = indexDirect === i;
            const suivante = !direct && indexSuivante === i;
            const libelle = d.morceau ? `${d.libelle} ${d.morceau.index}/${d.morceau.total}` : d.libelle;
            return (
              <li key={d.id} className={styles.cellule}>
                <button
                  type="button"
                  data-espace-suivante=""
                  aria-current={direct ? 'true' : undefined}
                  aria-label={formater(direct ? t.diapositiveEnDirect : t.projeterDiapositive, { libelle, n: i + 1 })}
                  className={`${styles.carte} ${direct ? styles.carteDirect : suivante ? styles.carteSuivante : ''}`}
                  onClick={() => surProjeter(i)}
                >
                  <span className={styles.carteEntete}>
                    <span className={styles.libelle}>{libelle}</span>
                    <span className={styles.espace} />
                    {direct && <span className={styles.etiquetteDirect}>{t.enDirect}</span>}
                    {suivante && <span className={styles.etiquetteSuivante}>{t.suivanteEtiquette}</span>}
                  </span>
                  <span className={`${styles.texte} ${d.genre === 'refrain' ? styles.refrain : ''}`}>
                    {d.lignes.map((l) => l.texte).join('\n')}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      <Touches />
    </section>
  );
}
