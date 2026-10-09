'use client';

/**
 * Les moments hors du direct, dans la colonne centrale (la setlist vide est
 * EtatRienAProjeter, de components/etats) :
 *  - prêt à projeter (Parcours-Pret.dc.html) : quatre vérifications, puis « Lancer » ;
 *  - fin du culte (Parcours-Fin.dc.html).
 */
import { useState, type ReactNode } from 'react';

import { Bouton, Icone, PastilleIcone, type NomIcone } from '@/components/ui';
import { formater, pluriel, useLangue, useT } from '@/lib/i18n';

import styles from './Parcours.module.css';

// ─── Prêt à projeter ─────────────────────────────────────────────────────────

interface Verification {
  cle: string;
  ok: boolean;
  titre: string;
  texte: string;
  action?: ReactNode;
}

export interface PropsListeControle {
  estBureau: boolean;
  sortieOuverte: boolean;
  /** « écran 2 (projecteur) » sur le bureau. */
  libelleEcran: string;
  dimensions: string | null;
  peutChoisirEcran: boolean;
  total: number;
  enChargement: number;
  enErreur: number;
  qrDisponible: boolean;
  qrAffiche: boolean;
  peutLancer: boolean;
  surOuvrirSortie: () => void;
  surChoisirEcran: () => void;
  surReessayer: () => void;
  surOuvrirMusiciens: () => void;
  surLancer: () => void;
}

export function ListeControle(p: PropsListeControle) {
  const t = useT('regie');
  const { langue } = useLangue();

  const sortie: Verification = p.estBureau
    ? {
        cle: 'sortie',
        ok: p.sortieOuverte,
        titre: formater(t.verifEcranBureau, { ecran: p.libelleEcran }),
        texte: p.sortieOuverte && p.dimensions ? formater(t.verifEcranBureauTexte, { dimensions: p.dimensions }) : t.verifEcranBureauFerme,
        action: p.peutChoisirEcran ? (
          <Bouton variante="secondaire" className={styles.actionBleue} onClick={p.surChoisirEcran}>
            {t.changer}
          </Bouton>
        ) : undefined,
      }
    : {
        cle: 'sortie',
        ok: p.sortieOuverte,
        titre: p.sortieOuverte ? t.verifFenetreOuverte : t.verifFenetreFermee,
        texte: t.verifFenetreTexte,
        action: (
          <Bouton variante="secondaire" className={styles.actionBleue} onClick={p.sortieOuverte && p.peutChoisirEcran ? p.surChoisirEcran : p.surOuvrirSortie}>
            {p.sortieOuverte ? (p.peutChoisirEcran ? t.choisirEcran : t.rouvrir) : t.ouvrirFenetre}
          </Bouton>
        ),
      };

  const horsLigne: Verification =
    p.enErreur > 0
      ? {
          cle: 'hors-ligne',
          ok: false,
          titre: pluriel(p.enErreur, t.verifIndisponibleUn, t.verifIndisponiblesN, langue),
          texte: t.verifIndisponibleTexte,
          action: (
            <Bouton variante="secondaire" className={styles.actionBleue} onClick={p.surReessayer}>
              {t.reessayer}
            </Bouton>
          ),
        }
      : p.enChargement > 0
        ? { cle: 'hors-ligne', ok: false, titre: pluriel(p.enChargement, t.verifChargementUn, t.verifChargementN, langue), texte: t.verifChargementTexte }
        : p.estBureau
          ? { cle: 'hors-ligne', ok: true, titre: t.verifHorsLigneBureau, texte: t.verifHorsLigneBureauTexte }
          : { cle: 'hors-ligne', ok: true, titre: t.verifHorsLigneWeb, texte: t.verifHorsLigneWebTexte };

  const telecommande: Verification = {
    cle: 'telecommande',
    ok: false,
    titre: t.verifTelecommande,
    texte: t.verifTelecommandeTexte,
    action: (
      <Bouton variante="secondaire" className={styles.actionBleue} href="/telecommande/">
        {t.appairer}
      </Bouton>
    ),
  };

  const assemblee: Verification = {
    cle: 'assemblee',
    ok: p.qrDisponible && p.qrAffiche,
    titre: t.verifAssemblee,
    texte: !p.qrDisponible ? t.verifQrIndisponible : !p.qrAffiche ? t.verifQrMasque : p.estBureau ? t.verifAssembleeBureau : t.verifAssembleeWeb,
    action: (
      <Bouton variante="secondaire" className={styles.actionBleue} onClick={p.surOuvrirMusiciens}>
        {t.ouvrirMusiciens}
      </Bouton>
    ),
  };

  const verifications = [sortie, horsLigne, telecommande, assemblee];
  const tout = sortie.ok && horsLigne.ok;

  return (
    <section className={`${styles.panneau} ${styles.pret}`} aria-labelledby="regie-pret-titre">
      <div>
        <h2 id="regie-pret-titre" className="titre-ecran">
          {tout ? t.pretTitre : t.presquePretTitre}
        </h2>
        <p className={styles.texte}>{t.pretTexte}</p>
      </div>
      <ul className={styles.verifications}>
        {verifications.map((v) => (
          <li key={v.cle} className={styles.verification}>
            <span className={`${styles.pastille} ${v.ok ? styles.pastilleOk : ''}`}>
              {v.ok ? <Icone nom="coche" taille={16} epaisseur={2} titre={t.verifOk} /> : <span className="visuellement-masque">{t.verifAFaire}</span>}
            </span>
            <span className={styles.verificationTextes}>
              <span className={styles.verificationTitre}>{v.titre}</span>
              <span className="meta">{v.texte}</span>
            </span>
            {v.action}
          </li>
        ))}
      </ul>
      <div className={styles.lancer}>
        <Bouton variante="plein" taille="suivant" icone="projeter" className={styles.boutonLancer} disabled={!p.peutLancer} onClick={p.surLancer}>
          {t.lancer}
        </Bouton>
        <span className="meta">{t.lancerAide}</span>
      </div>
    </section>
  );
}

// ─── Fin du culte ────────────────────────────────────────────────────────────

type EtatAction = { genre: 'repos' } | { genre: 'encours' } | { genre: 'fait'; texte: string } | { genre: 'echec'; texte: string };

function CarteAction({
  icone,
  teinte,
  titre,
  texte,
  etat,
  desactive,
  surClic,
}: {
  icone: NomIcone;
  teinte: 'bleu' | 'violet';
  titre: string;
  texte: string;
  etat?: EtatAction;
  desactive?: boolean;
  surClic: () => void;
}) {
  const t = useT('regie');
  const message = etat?.genre === 'fait' || etat?.genre === 'echec' ? etat.texte : etat?.genre === 'encours' ? t.enCours : null;
  return (
    <button type="button" className={styles.carteAction} onClick={surClic} disabled={desactive || etat?.genre === 'encours'} aria-describedby={undefined}>
      <PastilleIcone icone={icone} teinte={teinte} taille={30} />
      <span className={styles.carteActionTitre}>{titre}</span>
      <span className="meta">{texte}</span>
      {message && (
        <span className={styles.carteActionEtat} role="status">
          {message}
        </span>
      )}
    </button>
  );
}

export interface PropsFinCulte {
  diapositivesProjetees: number;
  dejaGardee: boolean;
  estConnecte: boolean;
  /** Adresse de Shephr, si elle est configurée (NEXT_PUBLIC_URL_SHEPHR). */
  urlShephr: string | null;
  surGarder: () => Promise<void>;
  /** Renvoie le code de partage. */
  surPartager: () => Promise<string>;
  surPreparer: () => void;
  surReprendre: () => void;
}

export function FinCulte(p: PropsFinCulte) {
  const t = useT('regie');
  const { langue } = useLangue();
  const [garde, setGarde] = useState<EtatAction>(p.dejaGardee ? { genre: 'fait', texte: t.gardeeDansSetlists } : { genre: 'repos' });
  const [partage, setPartage] = useState<EtatAction>({ genre: 'repos' });
  const [shephr, setShephr] = useState(true);

  async function garder() {
    setGarde({ genre: 'encours' });
    try {
      await p.surGarder();
      setGarde({ genre: 'fait', texte: t.gardeeDansSetlists });
    } catch {
      setGarde({ genre: 'echec', texte: t.gardeeEchec });
    }
  }

  async function partager() {
    setPartage({ genre: 'encours' });
    try {
      const code = await p.surPartager();
      setPartage({ genre: 'fait', texte: formater(t.partageFait, { code }) });
    } catch {
      setPartage({ genre: 'echec', texte: t.partageEchec });
    }
  }

  return (
    <div className={styles.colonneFin}>
      <section className={`${styles.panneau} ${styles.fin}`} aria-labelledby="regie-fin-titre">
        <div>
          <h2 id="regie-fin-titre" className="titre-ecran">
            {t.finTitre}
          </h2>
          <p className={styles.texte}>{pluriel(p.diapositivesProjetees, t.finBilanUne, t.finBilanN, langue)}</p>
        </div>
        <div className={styles.actionsFin}>
          <CarteAction
            icone="liste"
            teinte="violet"
            titre={t.garderSetlist}
            texte={t.garderSetlistTexte}
            etat={garde}
            desactive={garde.genre === 'fait'}
            surClic={() => void garder()}
          />
          <CarteAction
            icone="partager"
            teinte="bleu"
            titre={t.envoyerChants}
            texte={p.estConnecte ? t.envoyerChantsTexte : t.envoyerChantsCompte}
            etat={partage}
            desactive={!p.estConnecte}
            surClic={() => void partager()}
          />
          <CarteAction icone="plus" teinte="bleu" titre={t.preparerProchain} texte={t.preparerProchainTexte} surClic={p.surPreparer} />
        </div>
        <div>
          <Bouton variante="discret" icone="chevronGauche" onClick={p.surReprendre}>
            {t.reprendre}
          </Bouton>
        </div>
      </section>

      {p.urlShephr && shephr && (
        <section className={`${styles.panneau} ${styles.shephr}`} aria-labelledby="regie-shephr-titre">
          <div className={styles.shephrTextes}>
            <span className="meta">{t.shephrSurtitre}</span>
            <h2 id="regie-shephr-titre" className="titre-oeuvre">
              {t.shephrTitre}
            </h2>
            <p className={styles.texte}>{t.shephrTexte}</p>
          </div>
          <div className={styles.shephrActions}>
            <Bouton variante="secondaire" href={p.urlShephr} target="_blank" rel="noopener noreferrer">
              {t.shephrDecouvrir}
            </Bouton>
            <Bouton variante="discret" className={styles.plusTard} onClick={() => setShephr(false)}>
              {t.plusTard}
            </Bouton>
          </div>
        </section>
      )}
    </div>
  );
}
