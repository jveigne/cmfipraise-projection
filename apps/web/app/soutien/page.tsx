import type { Metadata } from 'next';

import { EcranSoutien } from '@/components/don/EcranSoutien';

export const metadata: Metadata = { title: 'Soutenir CMFIPraise' };

export default function Page() {
  return <EcranSoutien />;
}
