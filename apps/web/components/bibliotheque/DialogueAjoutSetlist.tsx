'use client';

/**
 * « Ajouter à une setlist » : vers une setlist de cet appareil, ou une nouvelle. Pas de
 * compte requis — les setlists locales sont celles que la régie projette.
 */
import { nouvelleSetlist, type ChantDTO, type SetlistLocale } from '@cmfi/api';
import { useState, type FormEvent } from 'react';

import { elementPourChant } from '@/components/setlist/elements';
import { sauverSetlist, useSetlistsLocales } from '@/components/setlist/magasinSetlists';
import { Bouton, Champ, Dialogue, Icone } from '@/components/ui';
import { formater, pluriel, useLangue, useT } from '@/lib/i18n';

import styles from './DialogueAjoutSetlist.module.css';

export interface PropsDialogueAjoutSetlist {
  ouvert: boolean;
  surFermeture: () => void;
  chant: ChantDTO;
  recueil: string | null;
}

export function DialogueAjoutSetlist({ ouvert, surFermeture, chant, recueil }: PropsDialogueAjoutSetlist) {
  const t = useT('bibliotheque');
  const tc = useT('commun');
  const { langue } = useLangue();
  const { setlists } = useSetlistsLocales();
  const [nom, setNom] = useState('');
  const [ajouteA, setAjouteA] = useState<SetlistLocale | null>(null);

  async function ajouter(setlist: SetlistLocale) {
    const aJour = await sauverSetlist({ ...setlist, elements: [...setlist.elements, elementPourChant(chant, recueil)] });
    setAjouteA(aJour);
  }

  async function creer(e: FormEvent) {
    e.preventDefault();
    const nomPropre = nom.trim();
    if (!nomPropre) return;
    const aJour = await sauverSetlist(nouvelleSetlist(nomPropre, [elementPourChant(chant, recueil)]));
    setNom('');
    setAjouteA(aJour);
  }

  function fermer() {
    setAjouteA(null);
    surFermeture();
  }

  return (
    <Dialogue
      ouvert={ouvert}
      surFermeture={fermer}
      titre={t.ajoutTitre}
      description={ajouteA ? undefined : formater(t.ajoutTexte, { titre: chant.title })}
      actions={
        ajouteA ? (
          <>
            <Bouton variante="secondaire" onClick={fermer}>
              {tc.fermer}
            </Bouton>
            <Bouton variante="plein" href={`/setlists/?id=${encodeURIComponent(ajouteA.id)}`}>
              {t.ajoutOuvrir}
            </Bouton>
          </>
        ) : undefined
      }
    >
      {ajouteA ? (
        <p role="status" className={styles.confirmation}>
          <Icone nom="coche" taille={20} className={styles.coche} />
          {formater(t.ajoutFait, { titre: chant.title, setlist: ajouteA.nom })}
        </p>
      ) : (
        <>
          {setlists.length > 0 && (
            <ul className={styles.liste}>
              {setlists.map((s) => {
                const deja = s.elements.some((el) => el.type === 'chant' && el.chantId === chant.id);
                return (
                  <li key={s.id}>
                    <button type="button" className={styles.setlist} onClick={() => void ajouter(s)}>
                      <span className={styles.nom}>{s.nom}</span>
                      <span className="meta">
                        {pluriel(s.elements.length, t.nElement, t.nElements, langue)}
                        {deja ? ` · ${t.ajoutDeja}` : ''}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <form className={styles.nouvelle} onSubmit={creer}>
            <Champ
              libelle={t.ajoutNouvelle}
              placeholder={t.ajoutNouvelleExemple}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              fond="surface"
              className={styles.champ}
            />
            <Bouton type="submit" variante="secondaire" icone="plus" disabled={!nom.trim()}>
              {t.ajoutCreer}
            </Bouton>
          </form>
        </>
      )}
    </Dialogue>
  );
}
