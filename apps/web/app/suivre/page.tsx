import { Couleurs } from '@cmfi/design';
import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';

import { SuivreParoles } from '@/components/telephone/SuivreParoles';

export const metadata: Metadata = { title: 'Paroles en direct' };

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: Couleurs.surface };

// useSearchParams (?salle=) exige un <Suspense> à l'export statique.
export default function Page() {
  return (
    <Suspense>
      <SuivreParoles />
    </Suspense>
  );
}
