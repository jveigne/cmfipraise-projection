/**
 * Paiement du don. Aucune intégration de paiement ici : le bouton mène chez le prestataire.
 *
 * [LIEN DE DON À DÉFINIR] : `null` tant que le prestataire n'est pas choisi ; le bouton
 * reste alors désactivé et la page le dit. Pour mémoire, l'app mobile ouvre aujourd'hui
 * https://buymeacoffee.com/cmfipraise (cmfipraise-app/app/support.tsx), qui ne gère ni le
 * Mobile Money ni le FCFA.
 */
export const LIEN_DON: string | null = null;

/** Nom du prestataire affiché sous le bouton ([PRESTATAIRE DE PAIEMENT] dans le design). */
export const PRESTATAIRE_DON: string | null = null;

/**
 * Lien vers le prestataire avec le choix fait sur la page, si le prestataire sait le lire.
 * Les noms de paramètres sont provisoires : à aligner sur ceux du prestataire retenu.
 */
export function construireLienDon(choix: { montant: number; devise: string; frequence: 'unique' | 'mensuel'; moyen: string; operateur?: string }): string | null {
  if (!LIEN_DON) return null;
  const url = new URL(LIEN_DON);
  url.searchParams.set('montant', String(choix.montant));
  url.searchParams.set('devise', choix.devise);
  url.searchParams.set('frequence', choix.frequence);
  url.searchParams.set('moyen', choix.moyen);
  if (choix.operateur) url.searchParams.set('operateur', choix.operateur);
  return url.toString();
}
