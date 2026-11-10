import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { Loading } from './components/ui';
import { Toaster } from './components/toast';
import { TourHost } from './components/Tour';
import { ConfirmHost } from './components/confirm';
import { useAuth } from './store/auth';
import { useProfile } from './hooks/useData';
import { supabaseReady } from './lib/supabase';
import Auth from './pages/Auth';
import Setup from './pages/Setup';
import Onboarding from './pages/Onboarding';
import Today from './pages/Today';

// Les écrans secondaires se chargent à la demande : « Aujourd'hui » s'ouvre vite.
const DomainPage = lazy(() => import('./pages/DomainPage'));
const JourneyPage = lazy(() => import('./pages/JourneyPage'));
const Progress = lazy(() => import('./pages/Progress'));
const More = lazy(() => import('./pages/More'));
const Library = lazy(() => import('./pages/Library'));
const BookPage = lazy(() => import('./pages/BookPage'));
const Guide = lazy(() => import('./pages/Guide'));
const Service = lazy(() => import('./pages/Service'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Etudes = lazy(() => import('./pages/Etudes'));
const Corps = lazy(() => import('./pages/Corps'));
const Esprit = lazy(() => import('./pages/Esprit'));
const Cards = lazy(() => import('./pages/Cards'));
const Journal = lazy(() => import('./pages/Journal'));
const Week = lazy(() => import('./pages/Week'));
const Pair = lazy(() => import('./pages/Pair'));
const Settings = lazy(() => import('./pages/Settings'));

export default function App() {
  const { session, ready, init } = useAuth();
  useEffect(() => { init(); }, [init]);

  if (!supabaseReady) return <Setup />;
  if (!ready) return <Loading />;
  if (!session) return <Auth />;
  return <><Signed /><Toaster /><ConfirmHost /></>;
}

function Signed() {
  const { data: profile, isLoading } = useProfile();
  if (isLoading && !profile) return <Loading />;
  if (profile && !profile.onboarded) return <Onboarding profile={profile} />;
  return (
    <Suspense fallback={<Loading />}>
      <TourHost />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Today />} />
          <Route path="parcours" element={<Navigate to="/semaine?onglet=parcours" replace />} />
          <Route path="parcours/:id" element={<JourneyPage />} />
          <Route path="lecture" element={<Library />} />
          <Route path="lecture/:id" element={<BookPage />} />
          <Route path="guide" element={<Guide />} />
          <Route path="emploi-du-temps" element={<Schedule />} />
          <Route path="etudes" element={<Etudes />} />
          <Route path="corps" element={<Corps />} />
          <Route path="esprit" element={<Esprit />} />
          <Route path="revision" element={<Cards />} />
          <Route path="chemin" element={<Progress />} />
          <Route path="plus" element={<More />} />
          <Route path="roue" element={<Navigate to="/semaine?onglet=roue" replace />} />
          <Route path="service" element={<Service />} />
          <Route path="terrain" element={<Navigate to="/service?onglet=terrain" replace />} />
          <Route path="cercle" element={<Navigate to="/service?onglet=cercle" replace />} />
          <Route path="impact" element={<Navigate to="/service?onglet=impact" replace />} />
          <Route path="domaine/:key" element={<DomainPage />} />
          <Route path="journal" element={<Journal />} />
          <Route path="semaine" element={<Week />} />
          <Route path="binome" element={<Pair />} />
          <Route path="reglages" element={<Settings profile={profile} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
