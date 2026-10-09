import { Couleurs } from '@cmfi/design';
import type { Metadata, Viewport } from 'next';

import { EcranMusiciens } from '@/components/musiciens/EcranMusiciens';

export const metadata: Metadata = { title: 'Écran des musiciens' };

// Surface de projection : la barre du navigateur (mobile, tablette) se fond dans la nuit.
export const viewport: Viewport = { themeColor: Couleurs.nuit };

export default function Page() {
  return <EcranMusiciens />;
}
