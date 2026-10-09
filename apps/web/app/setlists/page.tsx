import type { Metadata } from 'next';
import { Suspense } from 'react';

import { EcranSetlists } from '@/components/setlist/EcranSetlists';

export const metadata: Metadata = { title: 'Setlists' };

// ?id=, ?code=, ?partagee= se lisent côté client : frontière Suspense exigée par l'export.
export default function Page() {
  return (
    <Suspense>
      <EcranSetlists />
    </Suspense>
  );
}
