import type { Metadata } from 'next';
import { Suspense } from 'react';

import { EcranBibliotheque } from '@/components/bibliotheque/EcranBibliotheque';

export const metadata: Metadata = { title: 'Bibliothèque' };

// useSearchParams exige une frontière Suspense dans l'export statique.
export default function Page() {
  return (
    <Suspense>
      <EcranBibliotheque lecture={false} />
    </Suspense>
  );
}
