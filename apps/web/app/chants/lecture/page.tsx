import type { Metadata } from 'next';
import { Suspense } from 'react';

import { EcranBibliotheque } from '@/components/bibliotheque/EcranBibliotheque';

export const metadata: Metadata = { title: 'Lecture d’un chant' };

// Le chant passe en query string (?id=…) : export statique, pas de segment [id].
export default function Page() {
  return (
    <Suspense>
      <EcranBibliotheque lecture />
    </Suspense>
  );
}
