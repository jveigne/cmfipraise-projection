'use client';

import { useEffect, type ReactNode } from 'react';

import { recopierInstantaneBureau } from '@/lib/bureau/instantane';
import { FournisseurLangue } from '@/lib/i18n';
import { FournisseurSession } from '@/lib/session';

/** Fournisseurs communs à toutes les routes, y compris la sortie et l'écran des musiciens. */
export function Fournisseurs({ children }: { children: ReactNode }) {
  // Bureau : les recueils embarqués dans l'installeur passent dans le cache au premier lancement.
  useEffect(() => {
    void recopierInstantaneBureau();
  }, []);

  return (
    <FournisseurLangue>
      <FournisseurSession>{children}</FournisseurSession>
    </FournisseurLangue>
  );
}
