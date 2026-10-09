'use client';

/**
 * Aperçu de la sortie (design 08) : quelques lignes d'exemple rendues par la SURFACE DE
 * PROJECTION elle-même, avec le thème, la police, la taille et le bilingue choisis. L'aperçu
 * est donc exactement ce que verra la salle — y compris la photo voilée.
 */
import { THEME_PAR_DEFAUT, type Diapositive, type ThemeSortie } from '@cmfi/projection';
import { useMemo } from 'react';

import { SurfaceProjection } from '@/components/sortie/SurfaceProjection';
import { useT } from '@/lib/i18n';

import { themeSortieDepuisReglages, type ReglagesProjection } from './stockage';

export function ApercuSortie({ reglages }: { reglages: ReglagesProjection }) {
  const t = useT('reglages');

  const diapositive = useMemo<Diapositive>(
    () => ({
      id: 'apercu:0',
      genre: 'couplet',
      libelle: '1.',
      numero: 1,
      lignes: [t.apercuLigne1, t.apercuLigne2, t.apercuLigne3, t.apercuLigne4].map((texte) => ({ texte })),
      lignesSecondes: [t.apercuSeconde1, t.apercuSeconde2].map((texte) => ({ texte })),
      reference: null,
      referenceSeconde: null,
      morceau: null,
      partId: null,
    }),
    [t]
  );

  // Ni QR ni étiquette dans l'aperçu : on y juge le texte et le fond.
  const theme: ThemeSortie = { ...THEME_PAR_DEFAUT, ...themeSortieDepuisReglages(reglages), afficherQr: false, afficherReference: false };

  return (
    <div aria-hidden="true">
      <SurfaceProjection contenu="texte" diapositive={diapositive} titreElement={null} theme={theme} bilingue={reglages.bilingue} mode="apercu" />
    </div>
  );
}
