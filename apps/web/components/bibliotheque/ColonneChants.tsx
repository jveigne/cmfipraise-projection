'use client';

/**
 * Colonne du milieu de la bibliothèque (design 02) : recherche globale, onglets
 * Langue / Catégorie / Favoris, liste des chants. Ou, selon la barre latérale, les chants
 * personnels.
 *
 * La recherche porte sur tous les recueils téléchargés, des deux langues, et sur les
 * chants personnels : titre, numéro ou premier vers. Sans aucun recueil local (premier
 * lancement hors-ligne, CORS…), elle passe par le moteur de recherche du serveur.
 */
import type { ChantDTO, LangueContenu } from '@cmfi/api';
import { nomTonalite } from '@cmfi/projection';
import { useEffect, useMemo, useState } from 'react';

import { Bouton, Champ, EtatCentre, Icone, Onglets, Squelette, idOnglet, idPanneau, type Onglet } from '@/components/ui';
import { obtenirClientApi } from '@/lib/api';
import { formater, pluriel, useLangue, useT, type Langue } from '@/lib/i18n';
import { useEnLigne } from '@/lib/reseau';

import styles from './ColonneChants.module.css';
import { DialogueConnexion } from '@/components/compte/DialogueConnexion';
import { useCategories, useMesChants, useRecueils } from './donnees';
import { changerFiltres, useFiltres, type OngletBibliotheque } from './etat';
import { useFavoris } from './favoris';
import { LigneChant } from './LigneChant';
import { premierVers, rechercherLocalement, type CandidatRecherche } from './texte';

const ID_ONGLETS = 'bibliotheque';

function tonaliteCourte(chant: ChantDTO, langue: Langue): string | null {
  return chant.keyRootIndex == null ? null : nomTonalite(chant.keyRootIndex, !!chant.keyIsMinor, langue);
}

function metaChant(chant: ChantDTO, langue: Langue, avant?: string | null): string {
  const vers = premierVers(chant);
  return [avant, vers ? `${vers}…` : null, tonaliteCourte(chant, langue)].filter(Boolean).join(' · ');
}

export function ColonneChants({ idSelectionne }: { idSelectionne: string | null }) {
  const filtres = useFiltres();
  return filtres.vue === 'mes-chants' ? <MesChants idSelectionne={idSelectionne} /> : <Catalogue idSelectionne={idSelectionne} />;
}

// ─── Recueils, catégories, favoris ───────────────────────────────────────────

function Catalogue({ idSelectionne }: { idSelectionne: string | null }) {
  const t = useT('bibliotheque');
  const filtres = useFiltres();

  const onglets: Onglet<OngletBibliotheque>[] = [
    { id: 'langue', libelle: formater(t.ongletLangue, { langue: filtres.langue.toUpperCase() }) },
    { id: 'categorie', libelle: t.ongletCategorie },
    { id: 'favoris', libelle: t.ongletFavoris },
  ];

  const recherche = filtres.recherche.trim();

  return (
    <section aria-label={t.colonneChants} className={styles.colonne}>
      <Champ
        libelle={t.rechercherChant}
        libelleMasque
        type="search"
        icone="recherche"
        fond="surface"
        placeholder={t.rechercherExemple}
        value={filtres.recherche}
        onChange={(e) => changerFiltres({ recherche: e.target.value })}
        autoComplete="off"
        enterKeyHint="search"
      />
      <Onglets
        idBase={ID_ONGLETS}
        aria-label={t.filtrer}
        variante="pastilles"
        onglets={onglets}
        actif={filtres.onglet}
        surChangement={(onglet) => changerFiltres({ onglet, recherche: '' })}
      />
      <div
        role="tabpanel"
        id={idPanneau(ID_ONGLETS, filtres.onglet)}
        aria-labelledby={idOnglet(ID_ONGLETS, filtres.onglet)}
        className={styles.panneau}
      >
        {recherche ? (
          <Resultats requete={recherche} idSelectionne={idSelectionne} />
        ) : filtres.onglet === 'langue' ? (
          <ParLangue idSelectionne={idSelectionne} />
        ) : filtres.onglet === 'categorie' ? (
          <ParCategorie idSelectionne={idSelectionne} />
        ) : (
          <Favoris idSelectionne={idSelectionne} />
        )}
      </div>
    </section>
  );
}

function ChargementListe() {
  const tc = useT('commun');
  return (
    <div role="status" aria-busy="true" className={styles.squelettes}>
      <span className="visuellement-masque">{tc.chargement}</span>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={styles.squelette} aria-hidden="true">
          <Squelette largeur={28} />
          <span className={styles.squeletteCorps}>
            <Squelette largeur="70%" hauteur={14} />
            <Squelette largeur="45%" />
          </span>
        </div>
      ))}
    </div>
  );
}

function EtatRecueils() {
  const t = useT('bibliotheque');
  const { progres, copieLocaleSeulement, recueils } = useRecueils();
  const { langue } = useLangue();
  if (progres?.etape === 'telechargement' && progres.recueil) {
    return (
      <p role="status" className={`meta ${styles.compte}`}>
        {formater(t.telechargement, { recueil: progres.recueil, courant: progres.courant + 1, total: progres.total })}
      </p>
    );
  }
  if (copieLocaleSeulement) {
    const plusRecent = Math.max(0, ...recueils.map((r) => r.enregistreLe));
    const date = new Date(plusRecent).toLocaleDateString(langue === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long' });
    return (
      <p role="status" className={`meta ${styles.compte}`}>
        <Icone nom="nuageBarre" taille={16} className={styles.iconeEnLigne} />
        {formater(t.copieLocale, { date })}
      </p>
    );
  }
  return null;
}

function ParLangue({ idSelectionne }: { idSelectionne: string | null }) {
  const t = useT('bibliotheque');
  const tc = useT('commun');
  const { langue: langueUi } = useLangue();
  const filtres = useFiltres();
  const { statut, recueils, reessayer } = useRecueils();

  const recueilsLangue = useMemo(() => recueils.filter((r) => r.langue === filtres.langue), [recueils, filtres.langue]);
  const recueilChoisi = recueilsLangue.some((r) => r.titre === filtres.recueil) ? filtres.recueil : null;
  const lignes = useMemo(() => {
    const choisis = recueilChoisi ? recueilsLangue.filter((r) => r.titre === recueilChoisi) : recueilsLangue;
    return choisis.flatMap((r) =>
      [...r.chants]
        .sort((a, b) => a.position - b.position)
        .map((chant) => ({
          chant,
          // Plusieurs recueils mêlés : on rappelle d'où vient chaque chant.
          meta: metaChant(chant, langueUi, choisis.length > 1 ? r.titre : null),
        }))
    );
  }, [recueilsLangue, recueilChoisi, langueUi]);

  const langues: { id: LangueContenu; libelle: string }[] = [
    { id: 'fr', libelle: tc.francais },
    { id: 'en', libelle: tc.anglais },
  ];

  return (
    <>
      <div className={styles.reglages}>
        <div role="group" aria-label={t.langueChants} className={styles.segments}>
          {langues.map((l) => (
            <button
              key={l.id}
              type="button"
              className={styles.segment}
              aria-pressed={filtres.langue === l.id}
              onClick={() => changerFiltres({ langue: l.id, recueil: null, categorie: null })}
            >
              {l.libelle}
            </button>
          ))}
        </div>
        {recueilsLangue.length > 1 && (
          <label className={styles.choix}>
            <span className="visuellement-masque">{t.recueil}</span>
            <select
              className={styles.select}
              value={recueilChoisi ?? ''}
              onChange={(e) => changerFiltres({ recueil: e.target.value || null })}
            >
              <option value="">{t.tousLesRecueils}</option>
              {recueilsLangue.map((r) => (
                <option key={r.titre} value={r.titre}>
                  {r.titre}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <EtatRecueils />
      {statut === 'chargement' && lignes.length === 0 ? (
        <ChargementListe />
      ) : statut === 'erreur' && lignes.length === 0 ? (
        <EtatCentre
          genre="erreur"
          titre={t.recueilsIndisponibles}
          texte={t.recueilsIndisponiblesTexte}
          actions={
            <Bouton variante="secondaire" onClick={reessayer}>
              {tc.reessayer}
            </Bouton>
          }
        />
      ) : lignes.length === 0 ? (
        <EtatCentre genre="vide" icone="livre" titre={t.aucunRecueil} />
      ) : (
        <>
          <p className={`meta ${styles.compte}`}>{pluriel(lignes.length, t.nChant, t.nChants, langueUi)}</p>
          <ul className={styles.liste}>
            {lignes.map(({ chant, meta }) => (
              <LigneChant
                key={chant.id}
                id={chant.id}
                numero={chant.position > 0 ? String(chant.position) : '—'}
                titre={chant.title}
                meta={meta}
                selectionne={chant.id === idSelectionne}
              />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function ParCategorie({ idSelectionne }: { idSelectionne: string | null }) {
  const t = useT('bibliotheque');
  const tc = useT('commun');
  const { langue } = useLangue();
  const filtres = useFiltres();
  const { statut, categories, reessayer } = useCategories(filtres.langue, true);
  const categorie = categories.find((c) => c.id === filtres.categorie) ?? null;

  if (statut === 'chargement' && categories.length === 0) return <ChargementListe />;
  if (statut === 'erreur') {
    return (
      <EtatCentre
        genre="erreur"
        titre={t.categoriesIndisponibles}
        actions={
          <Bouton variante="secondaire" onClick={reessayer}>
            {tc.reessayer}
          </Bouton>
        }
      />
    );
  }
  if (categories.length === 0) return <EtatCentre genre="vide" icone="liste" titre={t.aucuneCategorie} />;

  if (!categorie) {
    return (
      <>
        <p className={`meta ${styles.compte}`}>
          {formater(t.categoriesDeLaLangue, { langue: filtres.langue === 'fr' ? tc.francais : tc.anglais })}
        </p>
        <ul className={styles.liste}>
          {categories.map((c) => (
            <li key={c.id}>
              <button type="button" className={styles.categorie} onClick={() => changerFiltres({ categorie: c.id })}>
                <span className="titre-oeuvre-liste">{c.name}</span>
                <span className="meta">{pluriel(c.songs.length, t.nChant, t.nChants, langue)}</span>
                <Icone nom="chevronDroite" className={styles.chevron} />
              </button>
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <>
      <Bouton variante="discret" icone="chevronGauche" onClick={() => changerFiltres({ categorie: null })} className={styles.retour}>
        {t.toutesCategories}
      </Bouton>
      <h2 className={`titre-oeuvre ${styles.titreCategorie}`}>{categorie.name}</h2>
      <ul className={styles.liste}>
        {categorie.songs.map((s) => (
          <LigneChant
            key={s.songId}
            id={s.songId}
            numero="—"
            titre={s.title}
            meta={[s.author, s.hasChord ? t.avecAccords : null].filter(Boolean).join(' · ')}
            selectionne={s.songId === idSelectionne}
          />
        ))}
      </ul>
    </>
  );
}

function Favoris({ idSelectionne }: { idSelectionne: string | null }) {
  const t = useT('bibliotheque');
  const { langue } = useLangue();
  const { favoris } = useFavoris();
  if (favoris.length === 0) {
    return <EtatCentre genre="vide" icone="coeur" titre={t.aucunFavori} texte={t.aucunFavoriTexte} />;
  }
  return (
    <>
      <p className={`meta ${styles.compte}`}>
        {pluriel(favoris.length, t.nFavori, t.nFavoris, langue)} · {t.favorisLocaux}
      </p>
      <ul className={styles.liste}>
        {favoris.map((f) => (
          <LigneChant
            key={f.id}
            id={f.id}
            numero={f.numero ? String(f.numero) : '—'}
            titre={f.titre}
            meta={f.personnel ? t.mesChants : (f.recueil ?? '')}
            personnel={f.personnel}
            selectionne={f.id === idSelectionne}
          />
        ))}
      </ul>
    </>
  );
}

// ─── Recherche ───────────────────────────────────────────────────────────────

interface EtatRechercheServeur {
  requete: string;
  statut: 'pret' | 'erreur';
  chants: ChantDTO[];
}

function Resultats({ requete, idSelectionne }: { requete: string; idSelectionne: string | null }) {
  const t = useT('bibliotheque');
  const { langue } = useLangue();
  const filtres = useFiltres();
  const enLigne = useEnLigne();
  const { recueils, statut } = useRecueils();
  const { chants: mesChants } = useMesChants(false);
  const [serveur, setServeur] = useState<EtatRechercheServeur | null>(null);

  const candidats = useMemo<CandidatRecherche[]>(
    () => [
      ...recueils.flatMap((r) => r.chants.map((chant) => ({ chant, recueil: r.titre }))),
      ...mesChants.map((chant) => ({ chant, recueil: t.mesChants })),
    ],
    [recueils, mesChants, t.mesChants]
  );
  const locaux = useMemo(() => rechercherLocalement(requete, candidats), [requete, candidats]);

  // Aucun recueil local : le moteur du serveur prend le relais (une requête après la frappe).
  const parServeur = recueils.length === 0 && statut !== 'chargement' && requete.length >= 2 && enLigne;
  useEffect(() => {
    if (!parServeur) return;
    let actif = true;
    const minuterie = window.setTimeout(() => {
      obtenirClientApi()
        .rechercher(requete)
        .then(
          (chants) => actif && setServeur({ requete, statut: 'pret', chants }),
          () => actif && setServeur({ requete, statut: 'erreur', chants: [] })
        );
    }, 300);
    return () => {
      actif = false;
      window.clearTimeout(minuterie);
    };
  }, [parServeur, requete]);

  const resultats: { chant: ChantDTO; recueil: string | null }[] = parServeur
    ? serveur?.requete === requete
      ? serveur.chants.map((chant) => ({ chant, recueil: null }))
      : []
    : locaux;
  const enAttente = parServeur && serveur?.requete !== requete;

  if (enAttente) return <ChargementListe />;
  if (parServeur && serveur?.statut === 'erreur') {
    return <EtatCentre genre="erreur" titre={t.rechercheIndisponible} texte={t.recueilsIndisponiblesTexte} />;
  }

  return (
    <>
      <p role="status" className={`meta ${styles.compte}`}>
        {pluriel(resultats.length, t.nResultat, t.nResultats, langue)} · {t.rechercheAide}
      </p>
      {resultats.length === 0 ? (
        <EtatCentre genre="vide" icone="recherche" titre={formater(t.aucunResultat, { requete })} texte={t.aucunResultatTexte} />
      ) : (
        <ul className={styles.liste}>
          {resultats.map(({ chant, recueil }) => {
            const autreLangue = chant.language && chant.language !== filtres.langue ? ` ${String(chant.language).toUpperCase()}` : '';
            const personnel = !!chant.ownerId;
            return (
              <LigneChant
                key={`${recueil ?? ''}:${chant.id}`}
                id={chant.id}
                numero={!personnel && chant.position > 0 ? `${chant.position}${autreLangue}` : '—'}
                titre={chant.title}
                meta={metaChant(chant, langue, recueil)}
                personnel={personnel}
                selectionne={chant.id === idSelectionne}
              />
            );
          })}
        </ul>
      )}
    </>
  );
}

// ─── Mes chants (compte) ─────────────────────────────────────────────────────

function MesChants({ idSelectionne }: { idSelectionne: string | null }) {
  const t = useT('bibliotheque');
  const tc = useT('commun');
  const { langue } = useLangue();
  const { statut, chants, estConnecte, reessayer } = useMesChants(true);
  const [connexion, setConnexion] = useState(false);

  return (
    <section aria-label={t.mesChants} className={styles.colonne}>
      <h2 className={`titre-oeuvre ${styles.titreVue}`}>{t.mesChants}</h2>
      {!estConnecte ? (
        <>
          <EtatCentre
            genre="vide"
            icone="musique"
            titre={t.mesChantsCompte}
            texte={t.mesChantsCompteTexte}
            actions={
              <Bouton variante="plein" onClick={() => setConnexion(true)}>
                {tc.seConnecter}
              </Bouton>
            }
          />
          <DialogueConnexion ouvert={connexion} surFermeture={() => setConnexion(false)} raison={t.mesChantsCompteTexte} />
        </>
      ) : statut === 'chargement' && chants.length === 0 ? (
        <ChargementListe />
      ) : statut === 'erreur' ? (
        <EtatCentre
          genre="erreur"
          actions={
            <Bouton variante="secondaire" onClick={reessayer}>
              {tc.reessayer}
            </Bouton>
          }
        />
      ) : chants.length === 0 ? (
        <EtatCentre genre="vide" icone="musique" titre={t.aucunChantPerso} texte={t.aucunChantPersoTexte} />
      ) : (
        <>
          <p className={`meta ${styles.compte}`}>{pluriel(chants.length, t.nChant, t.nChants, langue)}</p>
          <ul className={styles.liste}>
            {chants.map((chant) => (
              <LigneChant
                key={chant.id}
                id={chant.id}
                numero="—"
                titre={chant.title}
                meta={metaChant(chant, langue, t.mesChants)}
                personnel
                selectionne={chant.id === idSelectionne}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
