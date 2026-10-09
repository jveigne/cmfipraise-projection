'use client';

/**
 * Colonne « Setlists » (design 07). Violet : ce sont les setlists de l'utilisateur. Les
 * setlists de cet appareil d'abord ; avec un compte, celles du compte qui n'ont pas encore
 * de copie ici, et celles qu'on m'a partagées ; enfin, rejoindre avec un code.
 */
import { nouvelleSetlist, type SetlistLocale } from '@cmfi/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { DialogueConnexion } from '@/components/compte/DialogueConnexion';
import { Bouton, Champ, Icone, PastilleIcone } from '@/components/ui';
import { formater, pluriel, useLangue, useT, type Langue } from '@/lib/i18n';

import { importerSetlistCompte, useSetlistsCompte } from './compte';
import { sauverSetlist, useSetlistsLocales } from './magasinSetlists';
import styles from './NavSetlists.module.css';

/** « à l'instant », « il y a 5 min », « aujourd'hui », « vendredi », « 11 oct. ». */
export function quand(horodatage: number, langue: Langue, textes: { instant: string; aujourdhui: string }, maintenant = Date.now()): string {
  const ecart = maintenant - horodatage;
  const locale = langue === 'fr' ? 'fr-FR' : 'en-GB';
  if (ecart < 60_000) return textes.instant;
  if (ecart < 3_600_000) return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-Math.round(ecart / 60_000), 'minute');
  const date = new Date(horodatage);
  if (date.toDateString() === new Date(maintenant).toDateString()) return textes.aujourdhui;
  if (ecart < 6 * 86_400_000) return date.toLocaleDateString(locale, { weekday: 'long' });
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

export function NavSetlists({ idActif, partageeActive }: { idActif: string | null; partageeActive: string | null }) {
  const t = useT('setlist');
  const tc = useT('commun');
  const { langue } = useLangue();
  const router = useRouter();
  const { setlists, statut, persistantes } = useSetlistsLocales();
  const compte = useSetlistsCompte();
  const [code, setCode] = useState('');
  const [connexion, setConnexion] = useState(false);
  const [import_, setImport] = useState<{ id: string; erreur: boolean } | null>(null);

  async function creer() {
    const s = await sauverSetlist(nouvelleSetlist(t.nouvelleNom));
    router.push(`/setlists/?id=${encodeURIComponent(s.id)}`);
  }

  async function ouvrirDuCompte(idServeur: string) {
    setImport({ id: idServeur, erreur: false });
    try {
      const s = await importerSetlistCompte(idServeur);
      setImport(null);
      router.push(`/setlists/?id=${encodeURIComponent(s.id)}`);
    } catch (erreur) {
      console.log('[setlists] import impossible', erreur);
      setImport({ id: idServeur, erreur: true });
    }
  }

  function rejoindre(e: FormEvent) {
    e.preventDefault();
    const net = code.replace(/[\s·.-]/g, '').toUpperCase();
    if (net) router.push(`/setlists/?code=${encodeURIComponent(net)}`);
  }

  const idsServeurLocaux = new Set(setlists.map((s) => s.idServeur).filter(Boolean));
  const duCompte = compte.miennes.filter((s) => !idsServeurLocaux.has(s.id));

  const metaLocale = (s: SetlistLocale) =>
    `${pluriel(s.elements.length, t.nElement, t.nElements, langue)} · ${formater(t.modifiee, {
      quand: quand(s.modifieLe, langue, { instant: t.alInstant, aujourdhui: t.aujourdhui }),
    })}`;

  return (
    <nav aria-label={t.mesSetlists} className={styles.nav}>
      <div className={styles.entete}>
        <Link href="/chants/" className={styles.retour} aria-label={t.retourBibliotheque}>
          <Icone nom="chevronGauche" />
        </Link>
        <h1 className={styles.titre}>{t.setlists}</h1>
        <button type="button" className={styles.nouvelle} aria-label={t.nouvelle} onClick={() => void creer()}>
          <Icone nom="plus" epaisseur={1.6} />
        </button>
      </div>

      {!persistantes && (
        <p role="status" className={`meta ${styles.note}`}>
          {t.nonPersistantes}
        </p>
      )}

      {statut === 'pret' && setlists.length === 0 && <p className={`meta ${styles.note}`}>{t.aucuneLocale}</p>}
      <ul className={styles.liste}>
        {setlists.map((s) => (
          <li key={s.id}>
            <Link
              href={`/setlists/?id=${encodeURIComponent(s.id)}`}
              className={styles.setlist}
              aria-current={s.id === idActif ? 'page' : undefined}
            >
              <span className="titre-oeuvre-liste">{s.nom || t.sansNom}</span>
              <span className="meta">{metaLocale(s)}</span>
            </Link>
          </li>
        ))}
      </ul>

      {compte.estConnecte ? (
        <>
          {duCompte.length > 0 && (
            <section aria-labelledby="setlists-compte" className={styles.section}>
              <h2 id="setlists-compte" className={`etiquette-etat ${styles.sousTitre}`}>
                {t.surMonCompte}
              </h2>
              <ul className={styles.liste}>
                {duCompte.map((s) => (
                  <li key={s.id}>
                    <button type="button" className={styles.setlist} onClick={() => void ouvrirDuCompte(s.id)} aria-busy={import_?.id === s.id && !import_.erreur}>
                      <span className="titre-oeuvre-liste">{s.name}</span>
                      <span className="meta" role={import_?.id === s.id ? 'status' : undefined}>
                        {import_?.id === s.id ? (import_.erreur ? t.importEchec : tc.chargement) : t.ouvrirIci}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {compte.partagees.length > 0 && (
            <section aria-labelledby="setlists-partagees" className={styles.section}>
              <h2 id="setlists-partagees" className={`etiquette-etat ${styles.sousTitre}`}>
                {t.partageesAvecMoi}
              </h2>
              <ul className={styles.liste}>
                {compte.partagees.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/setlists/?partagee=${encodeURIComponent(s.id)}`}
                      className={styles.setlist}
                      aria-current={s.id === partageeActive ? 'page' : undefined}
                    >
                      <span className="titre-oeuvre-liste">{s.name}</span>
                      <span className="meta">{t.partageeParEquipe}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {compte.statut === 'erreur' && <p className={`meta ${styles.note}`}>{t.compteIndisponible}</p>}
        </>
      ) : (
        <div className={styles.invitation}>
          <PastilleIcone icone="utilisateur" teinte="violet" taille={30} />
          <p className="meta">{t.inviteCompte}</p>
          <Bouton variante="discret" taille="compacte" onClick={() => setConnexion(true)} className={styles.lienConnexion}>
            {tc.seConnecter}
          </Bouton>
          <DialogueConnexion ouvert={connexion} surFermeture={() => setConnexion(false)} raison={t.inviteCompte} />
        </div>
      )}

      <form className={styles.code} onSubmit={rejoindre}>
        <Champ
          libelle={t.rejoindreCode}
          placeholder={t.codeExemple}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
          fond="surface"
          className={styles.champCode}
        />
        <Bouton type="submit" disabled={!code.trim()}>
          {t.voir}
        </Bouton>
      </form>
    </nav>
  );
}
