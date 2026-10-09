'use client';

/**
 * Accueil (design 01) : découvrir sans compte. Chanter ouvre la bibliothèque, Projeter
 * ouvre la régie avec une setlist d'exemple. Le bandeau de don est le seul endroit doré.
 */
import Link from 'next/link';
import { useState } from 'react';

import { DialogueConnexion } from '@/components/compte/DialogueConnexion';
import { BandeauDon } from '@/components/don/BandeauDon';
import { Bouton, EtiquetteEtat, Icone, PastilleIcone } from '@/components/ui';
import { useLangue, useT } from '@/lib/i18n';
import { useEstBureau } from '@/lib/plateforme';
import { useSession } from '@/lib/session';

import styles from './EcranAccueil.module.css';
import { LIENS_ACCUEIL } from './liens';

function NavAccueil() {
  const t = useT('accueil');
  const tc = useT('commun');
  const { langue, changerLangue } = useLangue();
  const { statut, utilisateur, seDeconnecter } = useSession();
  const [connexion, setConnexion] = useState(false);

  return (
    <nav aria-label={t.navigation} className={styles.nav}>
      <div className={styles.navContenu}>
        <Link href="/" className={styles.marque} aria-label={tc.nomProduit}>
          <PastilleIcone icone="musique" teinte="plein" taille={34} />
          <span className={styles.nomMarque}>{tc.nomApp}</span>
        </Link>
        <div className={styles.liens}>
          <Link href="/chants/" className={styles.lienNav}>
            {t.navChants}
          </Link>
          <Link href="/regie/" className={styles.lienNav}>
            {t.navProjection}
          </Link>
          <Link href="/soutien/" className={styles.lienNav}>
            {t.navSoutenir}
          </Link>
        </div>
        <div className={styles.outils}>
          <button
            type="button"
            className={styles.langue}
            aria-label={langue === 'fr' ? t.langueVersAnglais : t.langueVersFrancais}
            onClick={() => changerLangue(langue === 'fr' ? 'en' : 'fr')}
          >
            <span className={langue === 'fr' ? styles.langueActive : undefined}>FR</span>
            <span aria-hidden="true"> · </span>
            <span className={langue === 'en' ? styles.langueActive : undefined}>EN</span>
          </button>
          {statut === 'compte' ? (
            <>
              <span className={`meta ${styles.utilisateur}`}>{utilisateur?.fullName || utilisateur?.email}</span>
              <Bouton variante="alerte" taille="compacte" onClick={seDeconnecter}>
                {tc.seDeconnecter}
              </Bouton>
            </>
          ) : (
            <Bouton onClick={() => setConnexion(true)} disabled={statut === 'chargement'}>
              {tc.seConnecter}
            </Bouton>
          )}
        </div>
      </div>
      <DialogueConnexion ouvert={connexion} surFermeture={() => setConnexion(false)} />
    </nav>
  );
}

function LienExterne({ href, children, className }: { href: string | null; children: string; className?: string }) {
  const t = useT('accueil');
  if (!href) {
    return (
      <span className={`${className ?? ''} ${styles.bientot}`} title={t.bientot}>
        {children}
        <span className="visuellement-masque"> ({t.bientot})</span>
      </span>
    );
  }
  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export function EcranAccueil() {
  const t = useT('accueil');
  const estBureau = useEstBureau();

  const etapes = [
    { titre: t.etape1Titre, texte: t.etape1Texte },
    { titre: t.etape2Titre, texte: t.etape2Texte },
    { titre: t.etape3Titre, texte: t.etape3Texte },
  ];
  const atouts = [
    { titre: t.atout1Titre, texte: t.atout1Texte },
    { titre: t.atout2Titre, texte: t.atout2Texte },
    { titre: t.atout3Titre, texte: t.atout3Texte },
    { titre: t.atout4Titre, texte: t.atout4Texte },
  ];
  const telechargements = [
    { href: LIENS_ACCUEIL.windows, libelle: t.telechargerWindows },
    { href: LIENS_ACCUEIL.macos, libelle: t.telechargerMac },
  ];
  const aucunTelechargement = telechargements.every((l) => !l.href);

  return (
    <div className={styles.page}>
      <NavAccueil />

      <main>
        <section className={styles.hero} aria-labelledby="accroche">
          <div className={styles.heroTexte}>
            <h1 id="accroche" className="accroche">
              {t.accroche}
            </h1>
            <p className={styles.chapeau}>{t.chapeau}</p>
            <div className={styles.entrees}>
              <Link href="/chants/" className={styles.entreeChanter}>
                <PastilleIcone icone="musique" teinte="bleu" taille={40} />
                <span className="titre-oeuvre">{t.chanter}</span>
                <span className="meta">{t.chanterTexte}</span>
              </Link>
              <Link href="/regie/?exemple=1" className={styles.entreeProjeter}>
                <span className={styles.pastilleProjeter} aria-hidden="true">
                  <Icone nom="projeter" taille={20} />
                </span>
                <span className="titre-oeuvre">{t.projeter}</span>
                <span className={styles.projeterTexte}>{t.projeterTexte}</span>
              </Link>
            </div>
          </div>

          {/* Illustration : une sortie projetée et un téléphone qui suit. Décorative. */}
          <div className={styles.illustration} aria-hidden="true">
            <div className={styles.ecranProjete}>
              <p className={styles.parolesProjetees}>
                {t.exempleRefrain1}
                <br />
                {t.exempleRefrain2}
                <br />
                {t.exempleRefrain3}
                <br />
                {t.exempleRefrain4}
              </p>
            </div>
            <div className={styles.telephone}>
              <span className={styles.encoche} />
              <EtiquetteEtat etat="direct" className={styles.debut} />
              <span className="titre-oeuvre-vignette">{t.exempleTitre}</span>
              <span className={styles.parolesTelephone}>{t.exempleExtrait}</span>
              <span className={styles.secondeTelephone}>{t.exempleSeconde}</span>
            </div>
          </div>
        </section>

        <section aria-label={t.soutien} className={styles.section}>
          <BandeauDon action={t.faireUnDon}>{t.bandeauDon}</BandeauDon>
        </section>

        <section className={styles.sectionEtapes} aria-labelledby="etapes">
          <h2 id="etapes" className={`titre-ecran ${styles.titreSection}`}>
            {t.etapesTitre}
          </h2>
          <ol className={styles.grille}>
            {etapes.map((e, i) => (
              <li key={i} className={styles.etape}>
                <span className={`titre-oeuvre ${styles.numeroEtape}`}>{i + 1}.</span>
                <span className="titre-oeuvre">{e.titre}</span>
                <span className={styles.texteEtape}>{e.texte}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.sectionAtouts} aria-label={t.atouts}>
          <ul className={styles.grille}>
            {atouts.map((a, i) => (
              <li key={i} className={styles.atout}>
                <span className={styles.titreAtout}>{a.titre}</span>
                <span className="meta">{a.texte}</span>
              </li>
            ))}
          </ul>
        </section>

        {!estBureau && (
          <section className={styles.sectionBureau} aria-labelledby="bureau">
            <div className={styles.bureau}>
              <div className={styles.bureauTexte}>
                <h2 id="bureau" className="titre-oeuvre">
                  {t.bureauTitre}
                </h2>
                <p className={styles.ardoise}>{t.bureauTexte}</p>
              </div>
              <div className={styles.telechargements}>
                {telechargements.map((l) =>
                  l.href ? (
                    <a key={l.libelle} href={l.href} className={styles.telecharger}>
                      <Icone nom="telecharger" />
                      {l.libelle}
                    </a>
                  ) : (
                    <Bouton key={l.libelle} taille="grande" icone="telecharger" disabled className={styles.fort}>
                      {l.libelle}
                    </Bouton>
                  )
                )}
                {aucunTelechargement && <span className={`meta ${styles.pleineLigne}`}>{t.bientotDisponible}</span>}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className={styles.pied}>
        <div className={styles.piedContenu}>
          <span>{t.piedSlogan}</span>
          <span className={styles.ressort} />
          <LienExterne href={LIENS_ACCUEIL.mobile}>{t.appMobile}</LienExterne>
          <LienExterne href={LIENS_ACCUEIL.shephr}>{t.shephr}</LienExterne>
          <LienExterne href={LIENS_ACCUEIL.confidentialite}>{t.confidentialite}</LienExterne>
        </div>
      </footer>
    </div>
  );
}
