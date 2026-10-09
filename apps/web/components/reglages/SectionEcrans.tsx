'use client';

/**
 * Écrans (design 08) : ce que chaque écran branché affiche. Le choix n'existe que s'il y a
 * plusieurs écrans ET que la plateforme sait placer une fenêtre (bureau toujours ; web
 * seulement avec la Window Management API, Chrome et Edge). Sinon on dit simplement
 * comment faire sur le web.
 *
 * L'écran retenu est une préférence de la PLATEFORME (`ecrirePreference`) : le bureau le
 * retrouve d'un culte à l'autre ; le web n'a pas d'identifiant d'écran stable.
 */
import type { Ecran } from '@cmfi/plateforme';
import { useEffect, useId, useState } from 'react';

import { Bouton } from '@/components/ui';
import { formater, useT } from '@/lib/i18n';
import { usePlateforme } from '@/lib/plateforme';

import styles from './Reglages.module.css';
import { CLE_AFFECTATIONS_ECRANS, lireAffectationsEcrans, type AffectationEcran } from './stockage';

/** Sans choix enregistré : la régie sur l'écran principal, puis sortie, puis musiciens. */
function affectationsParDefaut(ecrans: readonly Ecran[]): Record<string, AffectationEcran> {
  const resultat: Record<string, AffectationEcran> = {};
  const ordre: AffectationEcran[] = ['sortie', 'musiciens'];
  let i = 0;
  for (const e of ecrans) {
    if (e.principal) continue;
    resultat[e.id] = ordre[i] ?? 'rien';
    i += 1;
  }
  return resultat;
}

export function SectionEcrans() {
  const t = useT('reglages');
  const plateforme = usePlateforme();
  const idTitre = useId();
  const [ecrans, setEcrans] = useState<Ecran[] | null>(null);
  const [recherche, setRecherche] = useState(false);
  const [affectations, setAffectations] = useState<Record<string, AffectationEcran>>({});

  const peutChoisir = plateforme.peutChoisirEcran();
  const bureau = plateforme.estBureau();

  async function detecter() {
    setRecherche(true);
    try {
      const liste = await plateforme.listerEcrans();
      const memorisees = await lireAffectationsEcrans(plateforme);
      setEcrans(liste);
      setAffectations({ ...affectationsParDefaut(liste), ...memorisees });
    } catch {
      setEcrans([]);
    } finally {
      setRecherche(false);
    }
  }

  // Le bureau connaît ses écrans sans rien demander ; le web attend un clic (autorisation).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- liste des écrans lue une fois côté client
    if (bureau) void detecter();
    return plateforme.surChangementEcrans(setEcrans);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une fois par plateforme
  }, [plateforme, bureau]);

  function affecter(id: string, affectation: AffectationEcran) {
    const suivant: Record<string, AffectationEcran> = { ...affectations, [id]: affectation };
    // Une seule sortie, un seul écran musiciens : l'ancien titulaire n'affiche plus rien.
    if (affectation !== 'rien') {
      for (const [autre, a] of Object.entries(suivant)) if (autre !== id && a === affectation) suivant[autre] = 'rien';
    }
    setAffectations(suivant);
    void plateforme.ecrirePreference(CLE_AFFECTATIONS_ECRANS, suivant);
  }

  const plusieurs = !!ecrans && ecrans.length > 1;

  return (
    <section className={styles.section} aria-labelledby={idTitre}>
      <div className={styles.titreAvecBadge}>
        <h2 id={idTitre} className="titre-oeuvre">
          {t.ecransTitre}
        </h2>
        <span className={styles.badge}>{t.badgeBureau}</span>
      </div>

      {plusieurs && (
        <div className={styles.grilleEcrans}>
          {ecrans.map((e, i) => {
            const affectation = e.principal ? null : (affectations[e.id] ?? 'rien');
            return (
              <div key={e.id} className={[styles.ecran, affectation === 'sortie' ? styles.ecranSortie : ''].filter(Boolean).join(' ')}>
                <div
                  className={[
                    styles.vignetteEcran,
                    e.principal ? styles.vignetteRegie : styles.vignetteNuit,
                    affectation === 'musiciens' ? styles.vignetteMusiciens : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-hidden="true"
                >
                  {i + 1}
                </div>
                <span className={styles.nomEcran}>{e.libelle || formater(t.ecranNumero, { n: i + 1 })}</span>
                {e.principal ? (
                  <span className="meta">{formater(t.ecranPrincipal, { l: e.largeur, h: e.hauteur })}</span>
                ) : (
                  <label className={styles.libelleAffiche}>
                    {t.affiche}
                    <select
                      className={styles.selectCompact}
                      value={affectation ?? 'rien'}
                      onChange={(ev) => affecter(e.id, ev.target.value as AffectationEcran)}
                    >
                      <option value="sortie">{t.afficheSortie}</option>
                      <option value="musiciens">{t.afficheMusiciens}</option>
                      <option value="rien">{t.afficheRien}</option>
                    </select>
                  </label>
                )}
              </div>
            );
          })}
        </div>
      )}

      {ecrans && ecrans.length <= 1 && peutChoisir && <p className={styles.note}>{t.unSeulEcran}</p>}

      {!bureau && peutChoisir && !plusieurs && (
        <div className={styles.detection}>
          <Bouton variante="secondaire" icone="ecran" onClick={() => void detecter()} disabled={recherche}>
            {recherche ? t.recherchEcrans : t.detecterEcrans}
          </Bouton>
          <p className={styles.note}>{t.detecterAide}</p>
        </div>
      )}

      {!bureau && <p className={styles.note}>{t.noteWeb}</p>}
    </section>
  );
}
