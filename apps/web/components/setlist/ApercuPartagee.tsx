'use client';

/**
 * Setlist d'un autre, vue en lecture : par son code (`?code=`) ou parce qu'on l'a rejointe
 * (`?partagee=`). Le backend ne donne pas le droit de la modifier : on peut la projeter
 * ou en faire sa propre copie. Le code exige un compte : sans compte, une invitation, pas
 * un blocage.
 */
import { estErreurApi, type SetlistDTO } from '@cmfi/api';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { DialogueConnexion } from '@/components/compte/DialogueConnexion';
import { Bouton, EtatCentre, PastilleIcone } from '@/components/ui';
import { obtenirClientApi } from '@/lib/api';
import { formater, pluriel, useLangue, useT } from '@/lib/i18n';
import { useSession } from '@/lib/session';

import styles from './ApercuPartagee.module.css';
import { chargerSetlistsCompte, copierSetlistPartagee, useSetlistsCompte } from './compte';
import { formaterCode } from './serveur';

type Source = { genre: 'code'; code: string } | { genre: 'partagee'; id: string };

interface EtatApercu {
  cle: string;
  statut: 'pret' | 'erreur';
  setlist: SetlistDTO | null;
  introuvable: boolean;
}

export function ApercuPartagee({ source }: { source: Source }) {
  const t = useT('setlist');
  const tc = useT('commun');
  const { langue } = useLangue();
  const router = useRouter();
  const { statut } = useSession();
  const compte = useSetlistsCompte();
  const [etat, setEtat] = useState<EtatApercu | null>(null);
  const [connexion, setConnexion] = useState(false);
  const [action, setAction] = useState<'rejoindre' | 'copier' | 'quitter' | null>(null);
  const [erreurAction, setErreurAction] = useState(false);

  // Une setlist rejointe se relit par son code de partage, seul accès des abonnés au détail.
  const code =
    source.genre === 'code' ? source.code : (compte.partagees.find((s) => s.id === source.id)?.shareCode ?? null);
  const cle = code ?? '';
  const dejaRejointe = !!code && compte.partagees.some((s) => s.shareCode === code);

  useEffect(() => {
    if (statut !== 'compte' || !code) return;
    let actif = true;
    obtenirClientApi()
      .setlistParCode(code)
      .then(
        (setlist) => actif && setEtat({ cle: code, statut: 'pret', setlist, introuvable: false }),
        (erreur) =>
          actif &&
          setEtat({ cle: code, statut: 'erreur', setlist: null, introuvable: estErreurApi(erreur) && !erreur.reseau && !erreur.estRefus })
      );
    return () => {
      actif = false;
    };
  }, [statut, code]);

  if (statut === 'chargement') return <EtatCentre genre="chargement" />;

  if (statut !== 'compte') {
    return (
      <div className={styles.apercu}>
        <EtatCentre
          genre="vide"
          icone="partager"
          titre={source.genre === 'code' ? formater(t.codeRecu, { code: formaterCode(source.code) }) : t.setlistPartagee}
          texte={t.codeCompteTexte}
          actions={
            <Bouton variante="plein" onClick={() => setConnexion(true)}>
              {tc.seConnecter}
            </Bouton>
          }
        />
        <DialogueConnexion ouvert={connexion} surFermeture={() => setConnexion(false)} raison={t.codeCompteTexte} />
      </div>
    );
  }

  if (!code) {
    return compte.statut === 'pret' ? (
      <EtatCentre genre="vide" icone="liste" titre={t.partageeIntrouvable} />
    ) : (
      <EtatCentre genre="chargement" />
    );
  }

  if (!etat || etat.cle !== cle) return <EtatCentre genre="chargement" />;
  if (etat.statut === 'erreur' || !etat.setlist) {
    return (
      <EtatCentre
        genre="erreur"
        titre={etat.introuvable ? formater(t.codeInconnu, { code: formaterCode(code) }) : undefined}
        texte={etat.introuvable ? t.codeInconnuTexte : undefined}
      />
    );
  }

  const setlist = etat.setlist;
  const chants = [...(setlist.songs ?? [])].sort((a, b) => a.position - b.position);

  async function executer(genre: 'rejoindre' | 'copier' | 'quitter') {
    setAction(genre);
    setErreurAction(false);
    try {
      const api = obtenirClientApi();
      if (genre === 'rejoindre') {
        await api.rejoindreSetlist(cle);
        await chargerSetlistsCompte(true);
        router.replace(`/setlists/?partagee=${encodeURIComponent(setlist.id)}`);
      } else if (genre === 'copier') {
        const copie = await copierSetlistPartagee(setlist, t.suffixeCopie);
        router.push(`/setlists/?id=${encodeURIComponent(copie.id)}`);
      } else {
        await api.quitterSetlistPartagee(setlist.id);
        await chargerSetlistsCompte(true);
        router.replace('/setlists/');
      }
    } catch (erreur) {
      console.log('[partage] action impossible', erreur);
      setErreurAction(true);
    } finally {
      setAction(null);
    }
  }

  return (
    <div className={styles.apercu}>
      <div className={styles.entete}>
        <div className={styles.marque}>
          <PastilleIcone icone="partager" teinte="violet" taille={24} />
          {dejaRejointe ? t.partageeAvecMoi : formater(t.codeRecu, { code: formaterCode(cle) })}
        </div>
        <h2 className="titre-ecran">{setlist.name}</h2>
        <p className="meta">
          {pluriel(chants.length, t.nChant, t.nChants, langue)} · {t.lectureSeule}
        </p>
      </div>

      <ol className={styles.liste}>
        {chants.map((c, i) => (
          <li key={c.id} className={styles.ligne}>
            <span className={styles.rang}>{i + 1}</span>
            <span className="titre-oeuvre-liste">{c.title}</span>
            {c.artist && <span className="meta">{c.artist}</span>}
          </li>
        ))}
      </ol>

      <div className={styles.actions}>
        {!dejaRejointe && (
          <Bouton variante="plein" onClick={() => void executer('rejoindre')} disabled={!!action}>
            {t.rejoindre}
          </Bouton>
        )}
        <Bouton onClick={() => void executer('copier')} disabled={!!action}>
          {t.copierDansMesSetlists}
        </Bouton>
        {dejaRejointe && (
          <Bouton variante="discret" onClick={() => void executer('quitter')} disabled={!!action}>
            {t.quitter}
          </Bouton>
        )}
      </div>
      <p className="meta" role="status">
        {erreurAction ? t.actionEchec : dejaRejointe ? t.quitterTexte : t.rejoindreTexte}
      </p>
    </div>
  );
}
