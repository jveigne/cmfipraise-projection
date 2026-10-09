'use client';

/**
 * Vide · première ouverture de la régie (design 09). Deux portes d'entrée : la setlist
 * d'exemple (bouton plein) et ses propres setlists (secondaire).
 */
import { Bouton, EtatCentre } from '@/components/ui';
import { useT } from '@/lib/i18n';

export interface PropsEtatRienAProjeter {
  /** Lien vers la setlist d'exemple, ou… */
  hrefExemple?: string;
  /** …action qui la charge sur place. */
  surEssayerExemple?: () => void;
  /** Lien vers les setlists de l'utilisateur ; bouton masqué sans lui. */
  hrefSetlists?: string;
  className?: string;
}

export function EtatRienAProjeter({ hrefExemple, surEssayerExemple, hrefSetlists, className }: PropsEtatRienAProjeter) {
  const t = useT('etats');
  const exemple = hrefExemple ? (
    <Bouton variante="plein" taille="grande" href={hrefExemple}>
      {t.essayerExemple}
    </Bouton>
  ) : surEssayerExemple ? (
    <Bouton variante="plein" taille="grande" onClick={surEssayerExemple}>
      {t.essayerExemple}
    </Bouton>
  ) : null;

  return (
    <EtatCentre
      genre="vide"
      icone="projeter"
      titre={t.rienAProjeterTitre}
      texte={t.rienAProjeterTexte}
      className={className}
      actions={
        exemple || hrefSetlists ? (
          <>
            {exemple}
            {hrefSetlists && (
              <Bouton variante="secondaire" taille="grande" href={hrefSetlists}>
                {t.ouvrirMesSetlists}
              </Bouton>
            )}
          </>
        ) : undefined
      }
    />
  );
}
