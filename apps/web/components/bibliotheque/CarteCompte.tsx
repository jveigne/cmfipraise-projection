'use client';

/**
 * Encadré « Mode visiteur » de la barre latérale, ou le compte connecté. La déconnexion
 * est l'un des deux seuls emplois de la couleur alerte.
 */
import { useState } from 'react';

import { Bouton } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { useSession } from '@/lib/session';

import styles from './CarteCompte.module.css';
import { DialogueConnexion } from '@/components/compte/DialogueConnexion';

export function CarteCompte() {
  const tc = useT('commun');
  const { statut, utilisateur, sessionExpiree, seDeconnecter } = useSession();
  const [connexion, setConnexion] = useState(false);

  if (statut === 'chargement') return null;

  if (statut === 'compte') {
    return (
      <div className={styles.carte}>
        <span className={styles.titre}>{utilisateur?.fullName || utilisateur?.email}</span>
        {utilisateur?.fullName && utilisateur.email && <span className={styles.texte}>{utilisateur.email}</span>}
        <Bouton variante="alerte" taille="compacte" icone="deconnexion" onClick={seDeconnecter} className={styles.action}>
          {tc.seDeconnecter}
        </Bouton>
      </div>
    );
  }

  return (
    <div className={styles.carte}>
      <span className={styles.titre}>{tc.modeVisiteur}</span>
      <span className={styles.texte} role={sessionExpiree ? 'status' : undefined}>
        {sessionExpiree ? tc.sessionExpiree : tc.modeVisiteurTexte}
      </span>
      <button type="button" className={styles.lien} onClick={() => setConnexion(true)}>
        {tc.seConnecter}
      </button>
      <DialogueConnexion ouvert={connexion} surFermeture={() => setConnexion(false)} />
    </div>
  );
}
