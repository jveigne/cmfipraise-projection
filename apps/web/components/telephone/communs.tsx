'use client';

/**
 * Morceaux communs aux deux vues téléphone : rejoindre une salle, écrans de liaison
 * (recherche, vérification, refus, fin, coupure), et petites préférences locales.
 */
import { useState, type FormEvent, type ReactNode } from 'react';

import { Bouton, Champ, Icone, type NomIcone } from '@/components/ui';
import { formater, useT } from '@/lib/i18n';
import { normaliserCodeSalle, type EtatLiaison, type RoleDistant } from '@/lib/reseau/transport';

import styles from './Telephone.module.css';

// ─── Préférences du téléphone (localStorage, préfixe app_) ───────────────────

export function lireLocal(cle: string): string | null {
  try {
    return window.localStorage.getItem(cle);
  } catch {
    return null;
  }
}

export function ecrireLocal(cle: string, valeur: string) {
  try {
    window.localStorage.setItem(cle, valeur);
  } catch {
    // Sans stockage, le choix vaut pour la page ouverte.
  }
}

// ─── Rejoindre ───────────────────────────────────────────────────────────────

export interface PropsRejoindre {
  role: RoleDistant;
  /** Code déjà connu (lu dans l'adresse) : on ne demande que le prénom. */
  codeConnu: string | null;
  nomInitial: string;
  surRejoindre: (codeSalle: string, nom: string) => void;
}

export function Rejoindre({ role, codeConnu, nomInitial, surRejoindre }: PropsRejoindre) {
  const t = useT('telephone');
  const [code, setCode] = useState(codeConnu ?? '');
  const [nom, setNom] = useState(nomInitial);
  const [erreur, setErreur] = useState<string | null>(null);
  const telecommande = role === 'telecommande';

  function valider(e: FormEvent) {
    e.preventDefault();
    const normalise = normaliserCodeSalle(code);
    if (!normalise) {
      setErreur(t.codeSalleInvalide);
      return;
    }
    surRejoindre(normalise, nom.trim());
  }

  return (
    <div className={styles.panneau}>
      <h1 className="titre-ecran">{telecommande ? t.rejoindreTelecommande : t.rejoindreSuivre}</h1>
      {!codeConnu && <p className={styles.texteCentre}>{t.rejoindreTexte}</p>}
      <form className={styles.formulaire} onSubmit={valider} noValidate>
        {!codeConnu && (
          <Champ
            libelle={t.codeSalle}
            aide={erreur ? undefined : t.codeSalleAide}
            erreur={erreur ?? undefined}
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setErreur(null);
            }}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
            maxLength={9}
            fond="surface"
          />
        )}
        {telecommande && (
          <Champ
            libelle={t.prenom}
            aide={t.prenomAide}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            autoComplete="given-name"
            maxLength={40}
            fond="surface"
          />
        )}
        <Bouton type="submit" variante="plein" taille="grande" pleineLargeur>
          {telecommande ? t.demanderPiloter : t.suivre}
        </Bouton>
      </form>
    </div>
  );
}

// ─── États de la liaison ─────────────────────────────────────────────────────

function Centre({ icone, titre, texte, children, iconeArdoise }: { icone: NomIcone; titre: string; texte: string; children?: ReactNode; iconeArdoise?: boolean }) {
  return (
    <div className={styles.centre} role="status">
      <Icone nom={icone} taille={48} epaisseur={1.1} className={iconeArdoise ? styles.iconeArdoise : styles.iconeBleue} />
      <h1 className="titre-ecran">{titre}</h1>
      <p className={styles.texteCentre}>{texte}</p>
      {children}
    </div>
  );
}

export interface PropsEcranLiaison {
  liaison: Exclude<EtatLiaison, 'connecte'>;
  codeVerification: string | null;
  surRedemander: () => void;
  surChangerSalle: () => void;
}

/** Tout ce qui n'est pas « relié » : un seul écran clair à la fois. */
export function EcranLiaison({ liaison, codeVerification, surRedemander, surChangerSalle }: PropsEcranLiaison) {
  const t = useT('telephone');
  const changer = (
    <Bouton variante="discret" onClick={surChangerSalle}>
      {t.changerSalle}
    </Bouton>
  );
  switch (liaison) {
    case 'en-attente':
      return (
        <div className={styles.centre} role="status">
          <h1 className="titre-ecran">{t.attenteTitre}</h1>
          {codeVerification && (
            <span className={styles.grandCode} aria-label={formater(t.codeVerificationAria, { code: codeVerification.split('').join(' ') })}>
              {codeVerification}
            </span>
          )}
          <p className={styles.texteCentre}>{t.attenteTexte}</p>
          {changer}
        </div>
      );
    case 'refuse':
      return (
        <Centre icone="telephone" titre={t.refuseTitre} texte={t.refuseTexte} iconeArdoise>
          <Bouton variante="plein" taille="grande" onClick={surRedemander}>
            {t.redemander}
          </Bouton>
          {changer}
        </Centre>
      );
    case 'termine':
      return (
        <Centre icone="telephone" titre={t.termineTitre} texte={t.termineTexte} iconeArdoise>
          <Bouton variante="secondaire" taille="grande" onClick={surRedemander}>
            {t.redemander}
          </Bouton>
          {changer}
        </Centre>
      );
    case 'interrompu':
      return <Centre icone="nuageBarre" titre={t.interrompuTitre} texte={t.interrompuTexte} iconeArdoise />;
    case 'connexion':
    case 'deconnecte':
    default:
      return (
        <Centre icone="telephone" titre={t.connexion} texte={t.connexionTexte}>
          {changer}
        </Centre>
      );
  }
}

/** « 2. » + premières lignes, coupées proprement : de quoi reconnaître la diapositive. */
export function extrait(lignes: readonly string[], max = 2): string {
  const debut = lignes.slice(0, max).join(', ').replace(/[,;:.]\s*,/g, ',');
  return lignes.length > max ? `${debut.replace(/[,;:.\s]+$/, '')}…` : debut;
}
