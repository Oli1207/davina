import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import App from './App';
import { persister, queryClient } from './lib/queryClient';
import { applyTheme, usePrefs } from './store/prefs';
import './lib/install';
import './index.css';

applyTheme(usePrefs.getState().theme);

// Mises à jour : on vérifie à chaque retour sur l'app (sur iPhone, une PWA
// reste ouverte des jours en arrière-plan). La page se recharge d'elle-même
// quand la nouvelle version est prête, jamais en plein milieu d'une saisie.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registration.update().catch(() => {});
    });
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 7 * 24 * 60 * 60 * 1000, buster: 'v1' }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PersistQueryClientProvider>
  </React.StrictMode>,
);
