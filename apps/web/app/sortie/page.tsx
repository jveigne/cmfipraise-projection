import type { Metadata } from 'next';

import { Sortie } from '@/components/sortie/Sortie';

export const metadata: Metadata = { title: 'Sortie' };

/** /sortie/ — fenêtre (web) ou écran (bureau) projeté. Tout se passe côté client. */
export default function Page() {
  return <Sortie />;
}
