import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import { Spinner } from './components/ui/Spinner';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BrouillonListPage from './pages/BrouillonListPage';
import BrouillonDetailPage from './pages/BrouillonDetailPage';
import HistoriquePage from './pages/HistoriquePage';
import PresencePage from './pages/PresencePage';
import AdminPage from './pages/AdminPage';
import ProfilPage from './pages/ProfilPage';
import BibliothequeChants from './pages/BibliothequeChants';
import FormationPage from './pages/FormationPage';
import CoursDetailPage from './pages/CoursDetailPage';
import MenuPage from './pages/MenuPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, user, loading } = useAuthStore();
  if (!token) return <Navigate to="/connexion" replace />;
  if (loading || !user) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: 12 }}>
      <Spinner size={28} />
      <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Chargement…</span>
    </div>
  );
  return <>{children}</>;
}

function RequireResp({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (user?.role !== 'responsable' && user?.role !== 'admin') {
    return <Navigate to="/tableau-de-bord" replace />;
  }
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (user?.role !== 'admin') return <Navigate to="/tableau-de-bord" replace />;
  return <>{children}</>;
}

export default function App() {
  const { token, loadMe } = useAuthStore();

  useEffect(() => {
    if (token) loadMe();
  }, [token]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/connexion" element={<LoginPage />} />

        <Route element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }>
          <Route path="/tableau-de-bord" element={<DashboardPage />} />
          <Route path="/mes-preparations" element={<BrouillonListPage mineOnly />} />
          <Route path="/preparations" element={<BrouillonListPage />} />
          <Route path="/preparations/:id" element={<BrouillonDetailPage />} />
          <Route path="/historique" element={<HistoriquePage />} />
          <Route path="/presence" element={
            <RequireResp><PresencePage /></RequireResp>
          } />
          <Route path="/admin" element={
            <RequireAdmin><AdminPage /></RequireAdmin>
          } />
          <Route path="/profil" element={<ProfilPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/bibliotheque" element={<BibliothequeChants />} />
          <Route path="/formation" element={<FormationPage />} />
          <Route path="/formation/:id" element={<CoursDetailPage />} />

          {/* Redirections des anciens chemins */}
          <Route path="/mes-brouillons" element={<Navigate to="/mes-preparations" replace />} />
          <Route path="/brouillons" element={<Navigate to="/preparations" replace />} />
          <Route path="/brouillons/:id" element={<NavigatePreparation />} />
        </Route>

        <Route path="/" element={<Navigate to="/tableau-de-bord" replace />} />
        <Route path="*" element={<Navigate to="/tableau-de-bord" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function NavigatePreparation() {
  const id = window.location.pathname.split('/').pop();
  return <Navigate to={`/preparations/${id}`} replace />;
}
