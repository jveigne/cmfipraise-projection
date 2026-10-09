'use client';

/**
 * Connexion par e-mail et mot de passe (même compte que l'app mobile). Ouverte seulement
 * quand une action l'exige ou que l'utilisateur la demande : tout le reste marche sans.
 *
 * Un identifiant refusé n'est pas une suppression : le message reste en encre, jamais en
 * couleur alerte.
 */
import { estErreurApi } from '@cmfi/api';
import { useState, type FormEvent } from 'react';

import { Bouton, Champ, Dialogue } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { useSession } from '@/lib/session';

import styles from './DialogueConnexion.module.css';

export interface PropsDialogueConnexion {
  ouvert: boolean;
  surFermeture: () => void;
  /** Pourquoi on demande le compte (« Partager demande un compte »). */
  raison?: string;
  surConnecte?: () => void;
}

export function DialogueConnexion({ ouvert, surFermeture, raison, surConnecte }: PropsDialogueConnexion) {
  const t = useT('bibliotheque');
  const tc = useT('commun');
  const { seConnecter } = useSession();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer(e: FormEvent) {
    e.preventDefault();
    if (enCours) return;
    setEnCours(true);
    setErreur(null);
    try {
      await seConnecter(email, motDePasse);
      setMotDePasse('');
      surConnecte?.();
      surFermeture();
    } catch (cause) {
      console.log('[connexion] échec', cause);
      if (estErreurApi(cause) && cause.reseau) setErreur(t.erreurReseau);
      else if (estErreurApi(cause) && (cause.estRefus || cause.status === 400 || cause.status === 404)) setErreur(t.erreurIdentifiants);
      else setErreur(t.erreurConnexion);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Dialogue ouvert={ouvert} surFermeture={surFermeture} titre={tc.seConnecter} description={raison ?? t.connexionTexte}>
      <form className={styles.formulaire} onSubmit={envoyer} noValidate>
        <Champ
          libelle={t.champEmail}
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fond="surface"
        />
        <Champ
          libelle={t.champMotDePasse}
          type="password"
          autoComplete="current-password"
          required
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          fond="surface"
          erreur={erreur ?? undefined}
        />
        <Bouton type="submit" variante="plein" taille="grande" pleineLargeur disabled={enCours || !email || !motDePasse}>
          {enCours ? t.connexionEnCours : tc.seConnecter}
        </Bouton>
        <p className={styles.note}>{t.pasDeCompte}</p>
      </form>
    </Dialogue>
  );
}
