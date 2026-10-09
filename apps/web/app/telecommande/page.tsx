import { Couleurs } from '@cmfi/design';
import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';

import { Telecommande } from '@/components/telephone/Telecommande';

export const metadata: Metadata = { title: 'Télécommande' };

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: Couleurs.surface };

// useSearchParams (?salle=) exige un <Suspense> à l'export statique.
export default function Page() {
  return (
    <Suspense>
      <Telecommande />
    </Suspense>
  );
}
