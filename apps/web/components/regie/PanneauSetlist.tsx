'use client';

/**
 * Colonne de gauche : la setlist du culte (ordre, glisser-déposer, ajout rapide) et l'ajout
 * d'un passage biblique.
 *
 * Aucune suppression ici (regieTip) : on retire un élément depuis l'éditeur de setlist,
 * jamais en plein culte. Réordonner, en revanche, reste possible à tout moment : la
 * position en direct suit l'élément, pas son rang.
 */
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type ScreenReaderInstructions,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { nouvelIdentifiant, type ElementSetlist, type SetlistLocale } from '@cmfi/api';
import { analyserReference, formaterReference, sourceEchantillon, type ElementProjete, type IdVersion } from '@cmfi/projection';
import { useMemo, useState, type FormEvent } from 'react';

import { Bouton, Icone, PastilleIcone, PoigneeGlisser } from '@/components/ui';
import { formater, pluriel, useLangue, useT, type Textes as TextesModule } from '@/lib/i18n';

import { estIdVersion } from './resolution';
import type { ElementResolu, Phase, PositionDirect } from './seance';
import styles from './Setlist.module.css';

type Textes = TextesModule<'regie'>;

export function texteCause(r: ElementResolu | undefined, t: Textes): string | null {
  if (r?.statut !== 'erreur') return null;
  switch (r.cause) {
    case 'reseau':
      return t.causeReseau;
    case 'introuvable':
      return t.causeIntrouvable;
    case 'reference':
      return t.causeReference;
    case 'bible-absente':
      return t.causeBibleAbsente;
    case 'version':
      return t.causeVersion;
  }
}

function titreElement(el: ElementSetlist, r: ElementResolu | undefined): string {
  if (r?.statut === 'pret') return r.projete.titre;
  return el.type === 'chant' ? el.titre : el.reference;
}

interface PropsLigne {
  el: ElementSetlist;
  index: number;
  total: number;
  resolu: ElementResolu | undefined;
  projete: ElementProjete | undefined;
  enDirect: boolean;
  passe: boolean;
  consulte: boolean;
  deplacable: boolean;
  surVoir: (id: string) => void;
  surReessayer: (id: string) => void;
}

function LigneSetlist({ el, index, total, resolu, projete, enDirect, passe, consulte, deplacable, surVoir, surReessayer }: PropsLigne) {
  const t = useT('regie');
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: el.id,
    disabled: !deplacable,
  });
  const titre = titreElement(el, resolu);
  const cause = texteCause(resolu, t);
  const meta =
    resolu?.statut === 'pret' ? resolu.projete.meta : resolu?.statut === 'erreur' ? cause : t.chargementElement;
  const personnel = !!projete?.personnel;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={[styles.ligne, consulte ? styles.consulte : '', isDragging ? styles.saisie : ''].filter(Boolean).join(' ')}
    >
      {deplacable && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          className={styles.poignee}
          data-clavier-libre=""
          aria-label={formater(t.deplacer, { titre, position: index + 1, total })}
          {...attributes}
          {...listeners}
        >
          <PoigneeGlisser />
        </button>
      )}
      <button type="button" className={styles.choix} aria-current={consulte ? 'true' : undefined} onClick={() => surVoir(el.id)}>
        <PastilleIcone icone={el.type === 'bible' ? 'bible' : 'musique'} teinte={personnel ? 'violet' : 'bleu'} taille={30} />
        <span className={styles.textes}>
          <span className={`${styles.titre} ${passe ? styles.titrePasse : ''}`}>{titre}</span>
          <span className="meta">{meta}</span>
        </span>
        {enDirect && <span className={styles.direct}>{t.enDirect}</span>}
        {passe && !enDirect && <Icone nom="coche" taille={18} epaisseur={1.6} titre={t.projete} className={styles.passe} />}
      </button>
      {resolu?.statut === 'erreur' && (resolu.cause === 'reseau' || resolu.cause === 'introuvable') && (
        <Bouton variante="discret" taille="compacte" className={styles.reessayer} onClick={() => surReessayer(el.id)}>
          {t.reessayer}
        </Bouton>
      )}
    </li>
  );
}

export interface PropsPanneauSetlist {
  setlist: SetlistLocale;
  nav: readonly ElementProjete[];
  resolus: ReadonlyMap<string, ElementResolu>;
  phase: Phase;
  direct: PositionDirect | null;
  vue: string | null;
  version: IdVersion;
  seconde: IdVersion | null;
  surVersion: (v: IdVersion) => void;
  surSeconde: (v: IdVersion | null) => void;
  surVoir: (id: string) => void;
  surDeplacer: (idActif: string, idCible: string) => void;
  surReessayer: (id: string) => void;
  surAjoutRapide: () => void;
  surAjouterElements: (elements: { element: ElementSetlist }[]) => void;
  surGlissement: (actif: boolean) => void;
}

export function PanneauSetlist(props: PropsPanneauSetlist) {
  const { setlist, nav, resolus, phase, direct, vue, surVoir, surDeplacer, surReessayer, surAjoutRapide, surGlissement } = props;
  const t = useT('regie');
  const { langue } = useLangue();
  const n = setlist.elements.length;
  const indexDirect = direct ? nav.findIndex((e) => e.id === direct.idElement) : -1;
  const totalDiapos = nav.reduce((s, e) => s + e.diapositives.length, 0);
  const fin = phase === 'fin';

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const titres = useMemo(() => new Map(setlist.elements.map((el) => [el.id, titreElement(el, resolus.get(el.id))])), [setlist.elements, resolus]);
  const rang = (id: string | number) => setlist.elements.findIndex((e) => e.id === id) + 1;

  const instructions: ScreenReaderInstructions = { draggable: t.glisserInstructions };
  const annonces: Announcements = {
    onDragStart: ({ active }) => formater(t.glisserDebut, { titre: titres.get(String(active.id)) ?? '', position: rang(active.id), total: n }),
    onDragOver: ({ active, over }) =>
      over ? formater(t.glisserSurvol, { titre: titres.get(String(active.id)) ?? '', position: rang(over.id), total: n }) : undefined,
    onDragEnd: ({ active, over }) =>
      over ? formater(t.glisserFin, { titre: titres.get(String(active.id)) ?? '', position: rang(over.id), total: n }) : undefined,
    onDragCancel: ({ active }) => formater(t.glisserAnnule, { titre: titres.get(String(active.id)) ?? '' }),
  };

  function auDepot(e: DragEndEvent) {
    surGlissement(false);
    if (e.over && e.active.id !== e.over.id) surDeplacer(String(e.active.id), String(e.over.id));
  }

  const meta =
    fin
      ? pluriel(n, t.elementProjete, t.elementsProjetes, langue)
      : phase === 'direct'
        ? `${pluriel(n, t.elementUn, t.elementsN, langue)} · ${t.glisserPourReordonner}`
        : `${pluriel(n, t.elementUn, t.elementsN, langue)} · ${pluriel(totalDiapos, t.diapositiveUne, t.diapositivesN, langue)}`;

  return (
    <section aria-labelledby="regie-setlist-titre" className={styles.panneau}>
      <div className={styles.entete}>
        <PastilleIcone icone="liste" teinte="violet" taille={32} />
        <div className={styles.enteteTextes}>
          <span className={styles.surtitre}>{t.setlist}</span>
          <h2 id="regie-setlist-titre" className="titre-oeuvre-liste">
            {setlist.nom}
          </h2>
          {n > 0 && <span className="meta">{meta}</span>}
        </div>
      </div>

      <div className={styles.corps}>
        {n === 0 ? (
          <div className={styles.vide}>
            <Icone nom="liste" taille={36} epaisseur={1.3} className={styles.videIcone} />
            <span className="titre-oeuvre-liste">{t.setlistVide}</span>
            <span className="meta">{t.setlistVideAide}</span>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            accessibility={{ announcements: annonces, screenReaderInstructions: instructions }}
            onDragStart={() => surGlissement(true)}
            onDragCancel={() => surGlissement(false)}
            onDragEnd={auDepot}
          >
            <SortableContext items={setlist.elements.map((e) => e.id)} strategy={verticalListSortingStrategy}>
              <ol className={styles.liste}>
                {setlist.elements.map((el, i) => (
                  <LigneSetlist
                    key={el.id}
                    el={el}
                    index={i}
                    total={n}
                    resolu={resolus.get(el.id)}
                    projete={nav[i]}
                    enDirect={phase === 'direct' && i === indexDirect}
                    passe={fin || (indexDirect >= 0 && i < indexDirect)}
                    consulte={!fin && vue === el.id}
                    deplacable={!fin && n > 1}
                    surVoir={surVoir}
                    surReessayer={surReessayer}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        )}
        {!fin && (
          <Bouton variante="pointilles" icone="plus" pleineLargeur className={styles.ajout} onClick={surAjoutRapide}>
            {t.ajouterRapide}
          </Bouton>
        )}
      </div>

      {!fin && <AjoutBible {...props} />}
    </section>
  );
}

// ─── Ajout d'un passage biblique ─────────────────────────────────────────────

function AjoutBible({ version, seconde, surVersion, surSeconde, surAjouterElements }: PropsPanneauSetlist) {
  const t = useT('regie');
  const [reference, setReference] = useState('');
  const [message, setMessage] = useState<{ genre: 'erreur' | 'ok'; texte: string } | null>(null);
  const versions = sourceEchantillon.versions();
  const echantillon = versions.some((v) => v.echantillon);

  async function ajouter(e: FormEvent) {
    e.preventDefault();
    const saisie = reference.trim();
    if (!saisie) return;
    const ref = analyserReference(saisie);
    if (!ref) {
      setMessage({ genre: 'erreur', texte: t.referenceInconnue });
      return;
    }
    const contient = await sourceEchantillon.contient(version, ref).catch(() => false);
    if (!contient) {
      setMessage({ genre: 'erreur', texte: t.horsEchantillon });
      return;
    }
    // Référence normalisée (« jn 3.16 » → « Jean 3:16 ») : c'est elle que la setlist affiche.
    const normalisee = formaterReference(ref, 'fr');
    surAjouterElements([
      {
        element: {
          type: 'bible',
          id: nouvelIdentifiant(),
          reference: normalisee,
          version,
          secondeVersion: seconde && seconde !== version ? seconde : null,
        },
      },
    ]);
    setReference('');
    setMessage({ genre: 'ok', texte: formater(t.passageAjoute, { reference: normalisee }) });
  }

  return (
    <form className={styles.bible} onSubmit={ajouter} aria-labelledby="regie-bible-titre">
      <h3 id="regie-bible-titre" className={styles.bibleTitre}>
        <Icone nom="livre" taille={16} />
        {t.bible}
      </h3>
      <div className={styles.bibleSaisie}>
        <label htmlFor="regie-reference" className="visuellement-masque">
          {t.referenceLibelle}
        </label>
        <input
          id="regie-reference"
          type="text"
          className={styles.champ}
          placeholder={t.referenceIndication}
          value={reference}
          autoComplete="off"
          spellCheck={false}
          aria-describedby="regie-bible-message"
          onChange={(e) => {
            setReference(e.target.value);
            setMessage(null);
          }}
        />
        <Bouton type="submit" variante="secondaire" taille="compacte" disabled={!reference.trim()}>
          {t.ajouter}
        </Bouton>
      </div>
      <div className={styles.versions}>
        <label className={styles.selecteur}>
          {t.version}
          <select value={version} onChange={(e) => estIdVersion(e.target.value) && surVersion(e.target.value)}>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nom}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.selecteur}>
          {t.secondeVersion}
          <select value={seconde ?? ''} onChange={(e) => surSeconde(estIdVersion(e.target.value) ? e.target.value : null)}>
            <option value="">{t.aucune}</option>
            {versions
              .filter((v) => v.id !== version)
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nom}
                </option>
              ))}
          </select>
        </label>
      </div>
      <p id="regie-bible-message" role="status" className={message?.genre === 'erreur' ? styles.messageErreur : 'meta'}>
        {message?.texte ?? (echantillon ? t.noteEchantillon : '')}
      </p>
    </form>
  );
}
