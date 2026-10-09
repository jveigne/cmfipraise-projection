'use client';

/**
 * Éditeur d'une setlist de cet appareil (design 07) : nom, éléments réordonnables,
 * ajout rapide, dupliquer, supprimer définitivement (alerte, avec confirmation).
 */
import { nouvelleSetlist, type ElementSetlist, type SetlistLocale } from '@cmfi/api';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type ScreenReaderInstructions,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';

import { useRecueils, useMesChants } from '@/components/bibliotheque/donnees';
import type { CandidatRecherche } from '@/components/bibliotheque/texte';
import { Bouton, Dialogue, Icone, PastilleIcone } from '@/components/ui';
import { obtenirClientApi } from '@/lib/api';
import { formater, pluriel, useLangue, useT } from '@/lib/i18n';
import { useEnLigne } from '@/lib/reseau';
import { useSession } from '@/lib/session';

import { cleElement, useDetailsElements } from './details';
import styles from './EditeurSetlist.module.css';
import { copierElements } from './elements';
import { LigneElement, LigneSoulevee } from './LigneElement';
import { effacerSetlist, sauverSetlist } from './magasinSetlists';
import { resoudreSaisie } from './saisie';

function titre(e: ElementSetlist): string {
  return e.type === 'chant' ? e.titre : e.reference;
}

export function EditeurSetlist({ setlist }: { setlist: SetlistLocale }) {
  const t = useT('setlist');
  const tc = useT('commun');
  const { langue } = useLangue();
  const router = useRouter();
  const enLigne = useEnLigne();
  const { estConnecte } = useSession();
  const { recueils } = useRecueils();
  const { chants: mesChants } = useMesChants(true);
  const details = useDetailsElements(setlist.elements);

  const [nom, setNom] = useState(setlist.nom);
  const [saisie, setSaisie] = useState('');
  const [ajoutEnCours, setAjoutEnCours] = useState(false);
  const [bilan, setBilan] = useState<string | null>(null);
  const [glisse, setGlisse] = useState<string | null>(null);
  const [suppression, setSuppression] = useState<'ferme' | 'ouvert' | 'enCours'>('ferme');
  const [erreurSuppression, setErreurSuppression] = useState<string | null>(null);
  const [localSeulement, setLocalSeulement] = useState(false);

  const capteurs = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Langue préférée d'abord : « 112 » ouvre le 112 du recueil de sa langue.
  const candidats = useMemo<CandidatRecherche[]>(() => {
    const tous = recueils.flatMap((r) => r.chants.map((chant) => ({ chant, recueil: r.titre, langue: r.langue })));
    tous.sort((a, b) => Number(b.langue === langue) - Number(a.langue === langue));
    return [...tous, ...mesChants.map((chant) => ({ chant, recueil: t.monChant }))];
  }, [recueils, mesChants, langue, t.monChant]);

  const totalDiapositives = setlist.elements.reduce((n, e) => {
    const d = details.get(cleElement(e));
    return n + (d?.statut === 'pret' ? d.diapositives : 0);
  }, 0);

  const enregistrer = (changement: Partial<SetlistLocale>) => sauverSetlist({ ...setlist, ...changement });

  function validerNom() {
    const net = nom.trim();
    if (!net) {
      setNom(setlist.nom);
      return;
    }
    if (net !== setlist.nom) void enregistrer({ nom: net });
  }

  async function ajouter(e: FormEvent) {
    e.preventDefault();
    if (!saisie.trim() || ajoutEnCours) return;
    setAjoutEnCours(true);
    try {
      const resultat = await resoudreSaisie(saisie, {
        candidats,
        version: langue === 'en' ? 'KJV' : 'LSG',
        rechercherServeur: enLigne ? (texte) => obtenirClientApi().rechercher(texte, 0, 5) : undefined,
      });
      if (resultat.ajoutes.length > 0) await enregistrer({ elements: [...setlist.elements, ...resultat.ajoutes] });
      // Ce qui n'a rien donné reste dans le champ, à corriger.
      setSaisie(resultat.introuvables.join(', '));
      const parties: string[] = [];
      if (resultat.ajoutes.length > 0) parties.push(formater(t.ajoutes, { liste: resultat.ajoutes.map(titre).join(', ') }));
      if (resultat.introuvables.length > 0) parties.push(formater(t.introuvables, { liste: resultat.introuvables.join(', ') }));
      setBilan(parties.join(' '));
    } finally {
      setAjoutEnCours(false);
    }
  }

  function retirer(element: ElementSetlist) {
    void enregistrer({ elements: setlist.elements.filter((e) => e.id !== element.id) });
    setBilan(formater(t.retire, { titre: titre(element) }));
  }

  function surDebut(e: DragStartEvent) {
    setGlisse(String(e.active.id));
  }

  function surFin(e: DragEndEvent) {
    setGlisse(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const de = setlist.elements.findIndex((x) => x.id === active.id);
    const vers = setlist.elements.findIndex((x) => x.id === over.id);
    if (de < 0 || vers < 0) return;
    void enregistrer({ elements: arrayMove(setlist.elements, de, vers) });
  }

  async function dupliquer() {
    const copie = await sauverSetlist(nouvelleSetlist(formater(t.copieDe, { nom: setlist.nom }), copierElements(setlist.elements)));
    router.push(`/setlists/?id=${encodeURIComponent(copie.id)}`);
  }

  async function supprimer() {
    setSuppression('enCours');
    setErreurSuppression(null);
    // La copie du compte d'abord. Si elle résiste (réseau), on le dit et l'utilisateur
    // choisit : un second clic ne supprime alors que sur cet appareil.
    if (setlist.idServeur && estConnecte && !localSeulement) {
      try {
        await obtenirClientApi().supprimerSetlist(setlist.idServeur);
      } catch (erreur) {
        console.log('[setlists] suppression sur le compte impossible', erreur);
        setErreurSuppression(t.suppressionCompteEchec);
        setLocalSeulement(true);
        setSuppression('ouvert');
        return;
      }
    }
    try {
      await effacerSetlist(setlist.id);
      setSuppression('ferme');
      router.replace('/setlists/');
    } catch {
      setSuppression('ouvert');
      setErreurSuppression(t.suppressionEchec);
    }
  }

  const position = (id: string | number) => setlist.elements.findIndex((e) => e.id === id) + 1;
  const titreDe = (id: string | number) => {
    const e = setlist.elements.find((x) => x.id === id);
    return e ? titre(e) : '';
  };
  const annonces: Announcements = {
    onDragStart: ({ active }) => formater(t.annonceSaisi, { titre: titreDe(active.id), rang: position(active.id), total: setlist.elements.length }),
    onDragOver: ({ active, over }) => (over ? formater(t.annonceSurvol, { titre: titreDe(active.id), rang: position(over.id) }) : ''),
    onDragEnd: ({ active, over }) => (over ? formater(t.annoncePose, { titre: titreDe(active.id), rang: position(over.id) }) : t.annonceAnnule),
    onDragCancel: () => t.annonceAnnule,
  };
  const instructions: ScreenReaderInstructions = { draggable: t.instructionsGlisser };

  const elementGlisse = glisse ? setlist.elements.find((e) => e.id === glisse) : undefined;
  const idsServeur = !!setlist.idServeur;

  return (
    <div className={styles.editeur}>
      <div className={styles.entete}>
        <div className={styles.titres}>
          <div className={styles.marque}>
            <PastilleIcone icone="liste" teinte="violet" taille={24} />
            {t.maSetlist}
          </div>
          <label htmlFor="nom-setlist" className="visuellement-masque">
            {t.nomSetlist}
          </label>
          <input
            id="nom-setlist"
            className={styles.nom}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            onBlur={validerNom}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') setNom(setlist.nom);
            }}
            placeholder={t.sansNom}
          />
          <div className="meta">
            {pluriel(setlist.elements.length, t.nElement, t.nElements, langue)}
            {totalDiapositives > 0 && ` · ${pluriel(totalDiapositives, t.nDiapositive, t.nDiapositives, langue)}`}
            {idsServeur && ` · ${t.surLeCompte}`}
          </div>
        </div>
        <Bouton variante="plein" taille="grande" icone="projeter" href={`/regie/?setlist=${encodeURIComponent(setlist.id)}`}>
          {t.ouvrirRegie}
        </Bouton>
      </div>

      {setlist.elements.length === 0 ? (
        <div className={styles.vide}>
          <Icone nom="liste" taille={36} epaisseur={1.2} className={styles.iconeVide} />
          <p className="titre-oeuvre-liste">{t.videTitre}</p>
          <p className="meta">{t.videTexte}</p>
        </div>
      ) : (
        <DndContext
          sensors={capteurs}
          collisionDetection={closestCenter}
          onDragStart={surDebut}
          onDragEnd={surFin}
          onDragCancel={() => setGlisse(null)}
          accessibility={{ announcements: annonces, screenReaderInstructions: instructions }}
        >
          <SortableContext items={setlist.elements.map((e) => e.id)} strategy={verticalListSortingStrategy}>
            <ol className={styles.liste} aria-label={t.elements}>
              {setlist.elements.map((e, i) => (
                <LigneElement key={e.id} element={e} rang={i + 1} detail={details.get(cleElement(e))} surRetirer={() => retirer(e)} />
              ))}
            </ol>
          </SortableContext>
          <DragOverlay>
            {elementGlisse ? (
              <LigneSoulevee element={elementGlisse} rang={position(elementGlisse.id)} detail={details.get(cleElement(elementGlisse))} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <form className={styles.ajout} onSubmit={ajouter}>
        <label htmlFor="ajout-setlist" className="visuellement-masque">
          {t.ajouter}
        </label>
        <Icone nom="plus" epaisseur={1.6} className={styles.iconeAjout} />
        <input
          id="ajout-setlist"
          className={styles.saisie}
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          placeholder={t.ajouterExemple}
          autoComplete="off"
          enterKeyHint="done"
          aria-describedby="ajout-aide"
        />
        <Bouton type="submit" variante="secondaire" disabled={!saisie.trim() || ajoutEnCours} className={styles.boutonAjout}>
          {ajoutEnCours ? tc.chargement : t.ajouterBouton}
        </Bouton>
      </form>
      <p id="ajout-aide" className="meta" role="status">
        {bilan ?? t.aide}
      </p>

      <span className={styles.ressort} />
      <div className={styles.pied}>
        <Bouton onClick={() => void dupliquer()}>{t.dupliquer}</Bouton>
        <span className={styles.ressort} />
        <Bouton variante="alerte" onClick={() => setSuppression('ouvert')}>
          {t.supprimer}
        </Bouton>
      </div>

      <Dialogue
        ouvert={suppression !== 'ferme'}
        surFermeture={() => {
          if (suppression === 'enCours') return;
          setSuppression('ferme');
          setLocalSeulement(false);
          setErreurSuppression(null);
        }}
        titre={formater(t.supprimerTitre, { nom: setlist.nom || t.sansNom })}
        description={idsServeur && estConnecte ? t.supprimerTexteCompte : t.supprimerTexte}
        actions={
          <>
            <Bouton onClick={() => setSuppression('ferme')} disabled={suppression === 'enCours'} autoFocus>
              {tc.annuler}
            </Bouton>
            <Bouton variante="alerte" onClick={() => void supprimer()} disabled={suppression === 'enCours'}>
              {localSeulement ? t.supprimerIci : t.supprimerConfirmer}
            </Bouton>
          </>
        }
      >
        {erreurSuppression && (
          <p role="alert" className="meta">
            {erreurSuppression}
          </p>
        )}
      </Dialogue>
    </div>
  );
}
