import type { Metadata } from 'next';

import { Reglages } from '@/components/reglages/Reglages';

export const metadata: Metadata = { title: 'Personnalisation' };

export default function Page() {
  return <Reglages />;
}
