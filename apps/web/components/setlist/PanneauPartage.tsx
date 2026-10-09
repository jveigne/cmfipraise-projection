'use client';

/**
 * Panneau « Partager » (design 07). Le partage passe par le compte : sans compte, on
 * invite à se connecter, sans rien bloquer d'autre. Avec un compte, la setlist est publiée
 * une fois (copie sur le compte, chants seuls), puis le code permanent du backend la fait
 * retrouver dans l'app mobile.
 */
import { estErreurApi, type SetlistLocale } from '@cmfi/api';
import { useEffect, useState } from 'react';

import { DialogueConnexion } from '@/components/compte/DialogueConnexion';
import { Bouton, CodeQr } from '@/components/ui';
import { obtenirClientApi } from '@/lib/api';
import { formater, useLangue, useT } from '@/lib/i18n';
import { useEstBureau, usePlateforme } from '@/lib/plateforme';
import { useSession } from '@/lib/session';
import { originePublique } from '@/lib/urlPublique';

import { chargerSetlistsCompte } from './compte';
import { sauverSetlist } from './magasinSetlists';
import styles from './PanneauPartage.module.css';
import { formaterCode, partageIncomplet, publierSetlist, pousserSetlist } from './serveur';

/** Codes déjà obtenus, par setlist du serveur : le code ne change jamais. */
const codes = new Map<string, string>();

type EtatCode = { idServeur: string; statut: 'pret'; code: string } | { idServeur: string; statut: 'erreur'; introuvable: boolean };

export function PanneauPartage({ setlist }: { setlist: SetlistLocale }) {
  const t = useT('setlist');
  const tc = useT('commun');
  const { langue } = useLangue();
  const { statut } = useSession();
  const estBureau = useEstBureau();
  const plateforme = usePlateforme();
  const [connexion, setConnexion] = useState(false);
  const [etatCode, setEtatCode] = useState<EtatCode | null>(null);
  const [action, setAction] = useState<{ genre: 'publier' | 'pousser'; statut: 'enCours' | 'fait' | 'erreur'; a?: number } | null>(null);
  const [copie, setCopie] = useState(false);
  const [essai, setEssai] = useState(0);
  const idServeur = setlist.idServeur ?? null;

  useEffect(() => {
    if (statut !== 'compte' || !idServeur) return;
    let actif = true;
    const connu = codes.get(idServeur);
    const promesse = connu ? Promise.resolve(connu) : obtenirClientApi().codePartageSetlist(idServeur);
    promesse.then(
      (code) => {
        codes.set(idServeur, code);
        if (actif) setEtatCode({ idServeur, statut: 'pret', code });
      },
      (erreur) => actif && setEtatCode({ idServeur, statut: 'erreur', introuvable: estErreurApi(erreur) && (erreur.estIntrouvable || erreur.status === 500) })
    );
    return () => {
      actif = false;
    };
  }, [statut, idServeur, essai]);

  async function publier() {
    setAction({ genre: 'publier', statut: 'enCours' });
    try {
      const id = await publierSetlist(obtenirClientApi(), setlist);
      await sauverSetlist({ ...setlist, idServeur: id });
      void chargerSetlistsCompte(true);
      setAction({ genre: 'publier', statut: 'fait', a: Date.now() });
    } catch (erreur) {
      console.log('[partage] publication impossible', erreur);
      setAction({ genre: 'publier', statut: 'erreur' });
    }
  }

  async function pousser() {
    setAction({ genre: 'pousser', statut: 'enCours' });
    try {
      await pousserSetlist(obtenirClientApi(), setlist);
      setAction({ genre: 'pousser', statut: 'fait', a: Date.now() });
    } catch (erreur) {
      console.log('[partage] mise à jour impossible', erreur);
      setAction({ genre: 'pousser', statut: 'erreur' });
    }
  }

  /** La copie du compte a disparu (supprimée depuis le mobile) : on peut republier. */
  async function oublierCopie() {
    await sauverSetlist({ ...setlist, idServeur: null });
    setEtatCode(null);
  }

  const code = etatCode?.idServeur === idServeur && etatCode.statut === 'pret' ? etatCode.code : null;
  const lien = code ? `${originePublique()}/setlists/?code=${encodeURIComponent(code)}` : null;
  const incomplet = partageIncomplet(setlist);
  const heure = (a?: number) =>
    a ? new Date(a).toLocaleTimeString(langue === 'fr' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) : '';

  async function copierLien() {
    if (!lien) return;
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
      window.setTimeout(() => setCopie(false), 2500);
    } catch {
      // Presse-papiers refusé : le champ est sélectionnable à la main.
    }
  }

  return (
    <aside aria-labelledby="titre-partage" className={styles.panneau}>
      <div>
        <h2 id="titre-partage" className="titre-oeuvre">
          {t.partager}
        </h2>
        <p className={`meta ${styles.intro}`}>{t.partagerTexte}</p>
      </div>

      {statut === 'chargement' ? null : statut !== 'compte' ? (
        <div className={styles.encadre}>
          <span className={styles.fort}>{t.partageCompte}</span>
          <span className="meta">{t.partageCompteTexte}</span>
          <Bouton variante="secondaire" onClick={() => setConnexion(true)} className={styles.debut}>
            {tc.seConnecter}
          </Bouton>
          <DialogueConnexion ouvert={connexion} surFermeture={() => setConnexion(false)} raison={t.partageCompteTexte} />
        </div>
      ) : !idServeur ? (
        <div className={styles.encadre}>
          <span className="meta">{t.publierTexte}</span>
          <Bouton
            variante="secondaire"
            icone="partager"
            onClick={() => void publier()}
            disabled={action?.statut === 'enCours' || setlist.elements.every((e) => e.type !== 'chant')}
            className={styles.debut}
          >
            {action?.genre === 'publier' && action.statut === 'enCours' ? t.publication : t.publier}
          </Bouton>
          {setlist.elements.every((e) => e.type !== 'chant') && <span className="meta">{t.publierSansChant}</span>}
          {action?.genre === 'publier' && action.statut === 'erreur' && (
            <span role="alert" className="meta">
              {t.publierEchec}
            </span>
          )}
        </div>
      ) : etatCode?.idServeur === idServeur && etatCode.statut === 'erreur' ? (
        <div className={styles.encadre} role="alert">
          <span className="meta">{etatCode.introuvable ? t.copieDisparue : t.codeIndisponible}</span>
          <Bouton
            variante="secondaire"
            onClick={() => (etatCode.introuvable ? void oublierCopie() : setEssai((n) => n + 1))}
            className={styles.debut}
          >
            {etatCode.introuvable ? t.republier : tc.reessayer}
          </Bouton>
        </div>
      ) : !code ? (
        <p className="meta" role="status">
          {tc.chargement}
        </p>
      ) : (
        <>
          <div className={styles.code}>
            <CodeQr valeur={lien ?? code} libelle={formater(t.qrLibelle, { code: formaterCode(code) })} taille={120} marge={8} />
            <div className={styles.codeTexte}>
              <span className="meta">{t.codePartage}</span>
              <span className={styles.valeurCode}>{formaterCode(code)}</span>
              <span className="meta">{t.codePermanent}</span>
            </div>
          </div>
          {lien && (
            <div className={styles.lien}>
              <label htmlFor="lien-partage" className="meta">
                {t.lien}
              </label>
              <div className={styles.ligneLien}>
                <input id="lien-partage" readOnly value={lien} className={styles.champLien} onFocus={(e) => e.currentTarget.select()} />
                <Bouton onClick={() => void copierLien()} className={styles.fort}>
                  {copie ? t.copie : t.copier}
                </Bouton>
              </div>
            </div>
          )}
          <div className={styles.encadre}>
            <span className="meta">{t.miseAJourTexte}</span>
            <Bouton variante="secondaire" onClick={() => void pousser()} disabled={action?.statut === 'enCours'} className={styles.debut}>
              {action?.genre === 'pousser' && action.statut === 'enCours' ? t.miseAJourEnCours : t.miseAJour}
            </Bouton>
            <span className="meta" role="status">
              {action?.statut === 'fait' ? formater(t.miseAJourFaite, { heure: heure(action.a) }) : action?.statut === 'erreur' ? t.miseAJourEchec : ''}
            </span>
          </div>
        </>
      )}

      {statut === 'compte' && (incomplet.bible || incomplet.doublons) && (
        <p className={`meta ${styles.note}`}>
          {[incomplet.bible ? t.partageSansBible : null, incomplet.doublons ? t.partageSansDoublons : null].filter(Boolean).join(' ')}
        </p>
      )}

      <div className={styles.musiciens}>
        <span className={styles.fort}>{t.musiciens}</span>
        <span className="meta">{t.musiciensTexte}</span>
        <Bouton
          onClick={() => void plateforme.ouvrirSortie({ nom: 'musiciens', route: '/musiciens/' }).catch((e) => console.log('[partage] fenêtre musiciens', e))}
          className={`${styles.debut} ${styles.fort}`}
          icone="ecran"
        >
          {t.ouvrirMusiciens}
        </Bouton>
      </div>
    </aside>
  );
}
