import { MutationCache, QueryClient } from '@tanstack/react-query';
import { toast } from '../components/toast';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

export const queryClient = new QueryClient({
  // Toute ecriture qui echoue le dit, au lieu d'echouer en silence.
  mutationCache: new MutationCache({
    onError: (e) => toast(navigator.onLine ? `Échec de l'enregistrement : ${e.message}` : 'Pas de connexion : réessaie quand le réseau revient.', { tone: 'error' }),
  }),
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      // Garde 7 jours en cache : sans reseau, elle consulte ses dernieres donnees.
      gcTime: 7 * 24 * 60 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

export const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'davina-cache',
  throttleTime: 2000,
});
