'use client';

/**
 * Télécommande du responsable (design 06, téléphone de gauche) : ce qui est à l'écran, la
 * suivante, Précédent / Suivant en très grandes cibles, Écran noir, et le verset demandé
 * par le prédicateur. Aucune action destructrice : le transport n'en connaît aucune.
 */
import {
  analyserReference,
  formaterReference,
  sourceEchantillon,
  VERSIONS_ECHANTILLON,
  type PassageBiblique,
} from '@cmfi/projection';
import { useEffect, useId, useState } from 'react';

import { useReglages } from '@/components/reglages/stockage';
import { Bouton, EtiquetteEtat, Icone } from '@/components/ui';
import { formater, useLangue, useT } from '@/lib/i18n';
import type { ModeTransport } from '@/lib/reseau/transport';

import { EcranLiaison, Rejoindre, extrait } from './communs';
import { useSessionTelephone } from './session';
import styles from './Telephone.module.css';

function VersetDemande({ envoyer }: { envoyer: ReturnType<typeof useSessionTelephone>['envoyer'] }) {
  const t = useT('telephone');
  const { langue } = useLangue();
  const [reglages] = useReglages();
  const id = useId();
  const [saisie, setSaisie] = useState('');
  const [passage, setPassage] = useState<PassageBiblique | null>(null);
  const [confirmation, setConfirmation] = useState('');

  const reference = saisie.trim() ? analyserReference(saisie) : null;
  const version = reglages.versionBible;

  // Aperçu tiré de la source biblique locale (échantillon) : la régie a le dernier mot.
  useEffect(() => {
    let actif = true;
    if (!reference) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- l'aperçu suit la saisie
      setPassage(null);
      return;
    }
    void sourceEchantillon.lirePassage(version, reference).then((p) => {
      if (actif) setPassage(p);
    });
    return () => {
      actif = false;
    };
    // `reference` est recalculée à chaque rendu : on suit la saisie elle-même.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saisie, version]);

  const libelleReference = reference ? formaterReference(reference, langue) : '';
  const premier = passage?.versets[0];
  const texte = premier ? (passage.versets.length > 1 || premier.texte.length > 140 ? `${premier.texte.slice(0, 140).replace(/[\s,;:.]+\S*$/, '')}…` : premier.texte) : null;

  function demander(quand: 'suivante' | 'maintenant') {
    if (!reference) return;
    const normalisee = formaterReference(reference, 'fr');
    if (envoyer({ type: 'passage', reference: normalisee, version, quand })) {
      setConfirmation(formater(quand === 'suivante' ? t.envoyeSuivante : t.envoyeMaintenant, { reference: libelleReference }));
    }
  }

  return (
    <div className={styles.carteVerset}>
      <label htmlFor={id} className={styles.libelleVerset}>
        {t.versetDemande}
      </label>
      <input
        id={id}
        type="text"
        className={styles.saisieVerset}
        value={saisie}
        placeholder={t.versetExemple}
        onChange={(e) => {
          setSaisie(e.target.value);
          setConfirmation('');
        }}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="send"
        aria-describedby={`${id}-apercu`}
      />
      <div id={`${id}-apercu`}>
        {saisie.trim() && !reference && <p className="meta">{t.referenceInconnue}</p>}
        {reference && texte && (
          <>
            <p className={styles.texteVerset}>{texte}</p>
            <p className="meta">
              {libelleReference} · {VERSIONS_ECHANTILLON[version].nom}
              {passage?.version.echantillon ? ` · ${t.echantillon}` : ''}
            </p>
          </>
        )}
        {reference && !texte && (
          <p className="meta">
            {libelleReference} · {t.horsEchantillon}
          </p>
        )}
      </div>
      <div className={styles.boutonsVerset}>
        <Bouton variante="secondaire" disabled={!reference} onClick={() => demander('suivante')}>
          {t.mettreEnSuivante}
        </Bouton>
        <Bouton variante="plein" disabled={!reference} onClick={() => demander('maintenant')}>
          {t.projeterMaintenant}
        </Bouton>
      </div>
      <p className="meta" role="status">
        {confirmation}
      </p>
    </div>
  );
}

function libelleLiaison(mode: ModeTransport, t: ReturnType<typeof useT<'telephone'>>): string {
  return mode === 'relais' ? t.liaisonRelais : mode === 'reseau-local' ? t.liaisonReseauLocal : t.liaisonLocal;
}

export function Telecommande() {
  const t = useT('telephone');
  const session = useSessionTelephone('telecommande');
  const { etat, liaison, envoyer, mode } = session;

  if (!session.rejoint) {
    return (
      <main className={styles.telephone}>
        <Rejoindre key={session.nomInitial} role="telecommande" codeConnu={session.codeAdresse} nomInitial={session.nomInitial} surRejoindre={session.rejoindre} />
        {mode === 'local' && <p className={styles.noteDemo}>{t.modeLocal}</p>}
      </main>
    );
  }

  if (liaison !== 'connecte') {
    return (
      <main className={styles.telephone}>
        <EcranLiaison
          liaison={liaison}
          codeVerification={session.codeVerification}
          surRedemander={session.redemander}
          surChangerSalle={session.changerSalle}
        />
      </main>
    );
  }

  const enDirect = etat?.enDirect ?? null;
  const suivante = etat?.suivante ?? null;
  const visible = !!enDirect && !etat?.ecranNoir;

  return (
    <main className={styles.telephone}>
      <header className={styles.entete}>
        <div className={styles.enteteTexte}>
          <h1 className={styles.titreTelecommande}>{t.telecommande}</h1>
          <p className={styles.liaison}>
            <span className={styles.point} aria-hidden="true" />
            {libelleLiaison(mode, t)}
          </p>
        </div>
        {visible && <EtiquetteEtat etat="direct" />}
      </header>

      <div className={styles.contenu}>
        {enDirect && etat?.titre ? (
          <div className={visible ? styles.carteDirect : styles.carteNeutre} role="status">
            <span className="meta">{formater(t.aLEcran, { titre: etat.titre, libelle: enDirect.libelle })}</span>
            <span className={styles.extrait}>{extrait(enDirect.lignes)}</span>
            {etat.ecranNoir && <span className="meta">{t.ecranNoirEnCours}</span>}
          </div>
        ) : (
          <div className={styles.carteNeutre} role="status">
            <span className="meta">{t.rienALEcran}</span>
          </div>
        )}

        <div className={styles.carteSuivante}>
          <span className={styles.motSuivante}>{t.suivante}</span>
          <span className={styles.extraitSuivant}>
            {suivante ? `${suivante.libelle} ${extrait(suivante.lignes, 1)}` : t.finSetlist}
          </span>
        </div>

        <div className={styles.grilleNavigation}>
          <button type="button" className={styles.boutonPrecedent} aria-label={t.precedente} onClick={() => envoyer({ type: 'precedente' })}>
            <Icone nom="chevronGauche" taille={30} />
          </button>
          <button type="button" className={styles.boutonSuivant} disabled={!suivante} onClick={() => envoyer({ type: 'suivante' })}>
            {t.suivant}
            <Icone nom="flecheDroite" taille={26} epaisseur={1.6} />
          </button>
        </div>

        <button
          type="button"
          className={styles.boutonNoir}
          aria-pressed={!!etat?.ecranNoir}
          onClick={() => envoyer({ type: 'ecran-noir' })}
        >
          <Icone nom="ecranNoir" taille={20} />
          {t.ecranNoir}
        </button>

        <VersetDemande envoyer={envoyer} />
      </div>
    </main>
  );
}
