import type { Metadata } from 'next';
import { Suspense } from 'react';

import { Regie } from '@/components/regie/Regie';

export const metadata: Metadata = { title: 'Régie de projection' };

/**
 * /regie/ — la régie de projection. Les paramètres (?setlist=, ?serveur=, ?exemple, ?chant=, ?bible=) se lisent
 * côté client : l'export statique ne connaît aucune setlist. <Suspense> est exigé par
 * useSearchParams dans une page exportée ; rien n'est affiché avant l'hydratation.
 */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Regie />
    </Suspense>
  );
}
