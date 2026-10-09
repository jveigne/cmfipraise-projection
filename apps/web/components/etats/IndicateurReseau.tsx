'use client';

/**
 * Bandeau d'état du réseau, à poser en haut d'un écran qui charge des données : rien en
 * ligne, « Réseau perdu » hors-ligne, « Le serveur ne répond pas » quand le navigateur a du
 * réseau mais que l'API échoue (signalé par `signalerEchecApi`). Jamais en couleur alerte.
 */
import { BandeauHorsLigne } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { useReseau } from '@/lib/reseau/etat';

export function IndicateurReseau({ className }: { className?: string }) {
  const { etat } = useReseau();
  const t = useT('etats');
  if (etat === 'en-ligne') return null;
  if (etat === 'erreur') {
    return <BandeauHorsLigne enLigne={false} titre={t.erreurServeurTitre} texte={t.erreurServeurTexte} className={className} />;
  }
  return <BandeauHorsLigne enLigne={false} className={className} />;
}
