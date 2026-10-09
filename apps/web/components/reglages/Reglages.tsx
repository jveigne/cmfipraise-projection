'use client';

/**
 * Personnalisation (design 08) : thème de projection, police et taille, langue et Bible,
 * écrans, avec l'aperçu de la sortie à côté. Tout est enregistré sur l'appareil dès le
 * changement (pas de bouton « Enregistrer » : un bénévole ne doit rien pouvoir perdre).
 */
import { enregistrerMedia, nouvelIdentifiant } from '@cmfi/api';
import { CouleursProjection, Couleurs } from '@cmfi/design';
import { VERSIONS_ECHANTILLON, type IdVersion, type Notation } from '@cmfi/projection';
import { useId, useRef, useState, type ChangeEvent } from 'react';

import { Bouton, Interrupteur } from '@/components/ui';
import { formater, useLangue, useT, type Langue } from '@/lib/i18n';
import { useUrlMedia } from '@/lib/medias';

import { ApercuSortie } from './ApercuSortie';
import { formaterRapport, niveauContraste, rapportContraste } from './contraste';
import styles from './Reglages.module.css';
import { SectionEcrans } from './SectionEcrans';
import { useReglages, type ReglagesProjection, type TailleReglage, type ThemeReglage } from './stockage';

/** Au-delà, une photo alourdit IndexedDB sans rien gagner à 1080 p. */
const POIDS_MAX_PHOTO = 15 * 1024 * 1024;

const VERSIONS: IdVersion[] = ['LSG', 'KJV'];

function useEnregistre() {
  const [vu, setVu] = useState(false);
  return [vu, () => setVu(true)] as const;
}

export function Reglages() {
  const t = useT('reglages');
  const tc = useT('commun');
  const { langue, changerLangue } = useLangue();
  const [reglages, modifierReglages] = useReglages();
  const [enregistre, signalerEnregistre] = useEnregistre();
  const [erreurPhoto, setErreurPhoto] = useState<string | null>(null);
  const entreePhoto = useRef<HTMLInputElement>(null);
  const photo = useUrlMedia(reglages.theme === 'fond' ? reglages.imageFondId : null);
  const id = useId();

  const modifier = (m: Partial<ReglagesProjection>) => {
    modifierReglages(m);
    signalerEnregistre();
  };

  async function choisirPhoto(e: ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (!fichier) return;
    if (!fichier.type.startsWith('image/')) return setErreurPhoto(t.photoIllisible);
    if (fichier.size > POIDS_MAX_PHOTO) return setErreurPhoto(t.photoTropLourde);
    setErreurPhoto(null);
    const idMedia = nouvelIdentifiant();
    try {
      await enregistrerMedia({ id: idMedia, nom: fichier.name, type: fichier.type, blob: fichier, ajouteLe: Date.now() });
      modifier({ theme: 'fond', imageFondId: idMedia });
    } catch {
      setErreurPhoto(t.photoIllisible);
    }
  }

  const themes: { id: ThemeReglage; nom: string; desc: string; classe: string }[] = [
    { id: 'nuit', nom: t.themeNuit, desc: t.themeNuitDesc, classe: styles.fondNuit! },
    { id: 'fond', nom: t.themeFond, desc: t.themeFondDesc, classe: styles.fondNuit! },
    { id: 'noir', nom: t.themeNoir, desc: t.themeNoirDesc, classe: styles.fondNoir! },
  ];
  const tailles: { id: TailleReglage; nom: string; desc: string }[] = [
    { id: 'normale', nom: t.tailleNormale, desc: t.tailleNormaleDesc },
    { id: 'grande', nom: t.tailleGrande, desc: t.tailleGrandeDesc },
    { id: 'tres-grande', nom: t.tailleTresGrande, desc: t.tailleTresGrandeDesc },
  ];

  // Contraste réel des paroles (ivoire) sur le fond choisi ; une photo est voilée.
  const fondContraste = reglages.theme === 'noir' ? CouleursProjection.ecranNoir : Couleurs.nuit;
  const rapport = rapportContraste(CouleursProjection.ivoireProjection, fondContraste);
  const noteContraste = `${formater(t.contraste, { ratio: formaterRapport(rapport, langue), niveau: niveauContraste(rapport) })}${
    reglages.theme === 'fond' ? ` ${t.contrastePhoto}` : ''
  }`;

  return (
    <main className={styles.page}>
      <div className={styles.principal}>
        <div className={styles.titrePage}>
          <h1 className="titre-ecran">{t.titre}</h1>
          <Bouton variante="discret" icone="flecheGauche" href="/regie/">
            {t.retourRegie}
          </Bouton>
        </div>
        <p className="meta" role="status">
          {enregistre ? t.enregistre : ''}
        </p>

        {/* ─── Thème ─── */}
        <section className={styles.section} aria-labelledby={`${id}-theme`}>
          <h2 id={`${id}-theme`} className="titre-oeuvre">
            {t.themeTitre}
          </h2>
          <div role="radiogroup" aria-label={t.themeAria} className={styles.grilleThemes}>
            {themes.map((th) => {
              const coche = reglages.theme === th.id;
              return (
                <button
                  key={th.id}
                  type="button"
                  role="radio"
                  aria-checked={coche}
                  className={[styles.theme, coche ? styles.themeCoche : ''].filter(Boolean).join(' ')}
                  onClick={() => modifier({ theme: th.id })}
                >
                  <span className={`${styles.vignette} ${th.classe}`}>
                    {th.id === 'fond' && photo && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element -- Blob local */}
                        <img src={photo} alt="" className={styles.apercuPhoto} />
                        <span className={styles.apercuVoile} style={{ opacity: reglages.voile }} />
                      </>
                    )}
                    <span className={styles.vignetteTexte}>{t.vignetteTitre}</span>
                  </span>
                  <span className={styles.nomTheme}>{th.nom}</span>
                  <span className="meta">{th.desc}</span>
                </button>
              );
            })}
          </div>

          {reglages.theme === 'fond' && (
            <div className={styles.photo}>
              <input ref={entreePhoto} type="file" accept="image/*" className="visuellement-masque" tabIndex={-1} aria-hidden="true" onChange={(e) => void choisirPhoto(e)} />
              <Bouton variante="secondaire" icone="image" onClick={() => entreePhoto.current?.click()}>
                {reglages.imageFondId ? t.changerPhoto : t.choisirPhoto}
              </Bouton>
              {reglages.imageFondId && (
                <label className={styles.libelleVoile}>
                  {t.voile}
                  <input
                    type="range"
                    min={0.2}
                    max={0.8}
                    step={0.05}
                    value={reglages.voile}
                    onChange={(e) => modifier({ voile: Number(e.target.value) })}
                    className={styles.curseur}
                  />
                </label>
              )}
              <p className="meta" role={erreurPhoto ? 'alert' : undefined}>
                {erreurPhoto ?? (reglages.imageFondId ? '' : t.photoAbsente)}
              </p>
            </div>
          )}
        </section>

        {/* ─── Police et taille ─── */}
        <section className={styles.section} aria-labelledby={`${id}-police`}>
          <h2 id={`${id}-police`} className="titre-oeuvre">
            {t.policeTitre}
          </h2>
          <div className={styles.lignePolice}>
            <label className={`${styles.libelleChamp} ${styles.champPolice}`}>
              {t.police}
              <select
                className={styles.select}
                value={reglages.police}
                onChange={(e) => modifier({ police: e.target.value as ReglagesProjection['police'] })}
              >
                <option value="normale">{t.policeNormale}</option>
                <option value="grasse">{t.policeGrasse}</option>
              </select>
            </label>
            <div className={styles.champTaille}>
              <span className={styles.libelleChamp} id={`${id}-taille`}>
                {t.taille}
              </span>
              <div role="radiogroup" aria-labelledby={`${id}-taille`} className={styles.tailles}>
                {tailles.map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    role="radio"
                    aria-checked={reglages.taille === z.id}
                    className={styles.taille}
                    onClick={() => modifier({ taille: z.id })}
                  >
                    {z.nom}
                    <span className={styles.descTaille}>{z.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── Langue et Bible ─── */}
        <section className={`${styles.section} ${styles.sectionSerree}`} aria-labelledby={`${id}-langue`}>
          <h2 id={`${id}-langue`} className={`titre-oeuvre ${styles.titreSerre}`}>
            {t.langueBibleTitre}
          </h2>
          <div className={styles.grilleChamps}>
            <label className={styles.libelleChamp}>
              {t.langueInterface}
              <select className={styles.select} value={langue} onChange={(e) => changerLangue(e.target.value as Langue)}>
                <option value="fr">{tc.francais}</option>
                <option value="en">{tc.anglais}</option>
              </select>
            </label>
            <label className={styles.libelleChamp}>
              {t.langueParoles}
              <select
                className={styles.select}
                value={reglages.langueParoles}
                onChange={(e) => modifier({ langueParoles: e.target.value as 'fr' | 'en' })}
              >
                <option value="fr">{tc.francais}</option>
                <option value="en">{tc.anglais}</option>
              </select>
            </label>
            <label className={styles.libelleChamp}>
              {t.versionPrincipale}
              <select
                className={styles.select}
                value={reglages.versionBible}
                onChange={(e) => modifier({ versionBible: e.target.value as IdVersion })}
              >
                {VERSIONS.map((v) => (
                  <option key={v} value={v}>
                    {VERSIONS_ECHANTILLON[v].nom}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.libelleChamp}>
              {t.versionSeconde}
              <select
                className={styles.select}
                value={reglages.versionSeconde ?? ''}
                onChange={(e) => modifier({ versionSeconde: (e.target.value || null) as IdVersion | null })}
              >
                {VERSIONS.filter((v) => v !== reglages.versionBible).map((v) => (
                  <option key={v} value={v}>
                    {VERSIONS_ECHANTILLON[v].nom}
                  </option>
                ))}
                <option value="">{t.aucune}</option>
              </select>
            </label>
            <label className={styles.libelleChamp}>
              {t.notationAccords}
              <select
                className={styles.select}
                value={reglages.notationAccords}
                onChange={(e) => modifier({ notationAccords: e.target.value as Notation })}
              >
                <option value="en">{t.notationEn}</option>
                <option value="fr">{t.notationFr}</option>
                <option value="nns">{t.notationNns}</option>
              </select>
            </label>
          </div>
          {VERSIONS.some((v) => VERSIONS_ECHANTILLON[v].echantillon) && <p className={styles.note}>{t.echantillonBible}</p>}
          <Interrupteur
            coche={reglages.bilingue}
            surChangement={(bilingue) => modifier({ bilingue })}
            libelle={t.bilingue}
            description={t.bilingueDesc}
            className={styles.bascule}
          />
        </section>

        <SectionEcrans />
      </div>

      <aside aria-label={t.apercuTitre} className={styles.cote}>
        <span className="etiquette-etat">{t.apercuTitre}</span>
        <ApercuSortie reglages={reglages} />
        <span className="meta">{noteContraste}</span>
      </aside>
    </main>
  );
}
