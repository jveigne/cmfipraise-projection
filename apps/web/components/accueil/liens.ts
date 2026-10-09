/**
 * Liens externes de l'accueil. [LIEN À DÉFINIR] : `null` tant que l'adresse n'existe pas ;
 * l'interface montre alors le bouton désactivé avec « Bientôt disponible », plutôt qu'un
 * lien qui ne mène nulle part.
 */
export const LIENS_ACCUEIL: Record<'windows' | 'macos' | 'mobile' | 'shephr' | 'confidentialite', string | null> = {
  /** [LIEN À DÉFINIR] installateur Windows (electron-builder, apps/desktop). */
  windows: null,
  /** [LIEN À DÉFINIR] image disque macOS. */
  macos: null,
  /** [LIEN À DÉFINIR] fiche de l'app mobile (Play Store / App Store, paquet org.cmfi.cmfipraise). */
  mobile: null,
  /** [LIEN À DÉFINIR] site public de Shephr. */
  shephr: null,
  /** [LIEN À DÉFINIR] politique de confidentialité. */
  confidentialite: null,
};
