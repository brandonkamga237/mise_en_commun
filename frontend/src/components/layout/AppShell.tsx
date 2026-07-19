import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '../../store/auth';
import { Avatar } from '../ui/Avatar';

function getPageTitle(pathname: string): string {
  if (pathname === '/tableau-de-bord') return 'Accueil';
  if (pathname === '/mes-preparations') return 'Préparations';
  if (/^\/preparations\/\d+/.test(pathname)) return 'Préparation';
  if (pathname === '/preparations') return 'Préparations';
  if (pathname === '/historique') return 'Historique';
  if (pathname === '/presence') return 'Présence';
  if (pathname === '/admin') return 'Administration';
  if (pathname === '/profil') return 'Mon profil';
  if (pathname === '/bibliotheque') return 'Bibliothèque';
  if (pathname === '/menu') return 'Menu';
  if (/^\/formation\/\d+/.test(pathname)) return 'Formation';
  if (pathname === '/formation') return 'Formation';
  return 'Mises en Commun';
}

const MENU_PATHS = ['/menu', '/historique', '/presence', '/admin', '/profil'];

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const path = location.pathname;
  const isDetailPage = /^\/preparations\/\d+/.test(path) || /^\/formation\/\d+/.test(path);
  const pageTitle = getPageTitle(path);

  const tabs = [
    { to: '/tableau-de-bord', label: 'Accueil',      icon: <IcoHome />,    match: (p: string) => p === '/tableau-de-bord' },
    { to: '/mes-preparations', label: 'Préparations', icon: <IcoFile />,    match: (p: string) => p.startsWith('/preparations') || p.startsWith('/mes-preparations') },
    { to: '/formation',       label: 'Formation',     icon: <IcoGradCap />, match: (p: string) => p.startsWith('/formation') },
    { to: '/bibliotheque',    label: 'Biblio',        icon: <IcoBook />,    match: (p: string) => p.startsWith('/bibliotheque') },
    { to: '/menu',            label: 'Menu',          icon: <IcoMenu />,    match: (p: string) => MENU_PATHS.some(m => p.startsWith(m)) },
  ];

  return (
    <div className="app-shell">
      <div className="sidebar-desktop"><Sidebar /></div>

      <div className="app-main">
        {/* Mobile topbar */}
        <div className="mobile-topbar">
          {isDetailPage ? (
            <button className="topbar-btn press" onClick={() => navigate(-1)} aria-label="Retour à la page précédente">
              <IcoBack />
            </button>
          ) : (
            <div style={{
              width: 32, height: 32, marginLeft: 4, borderRadius: 9, flexShrink: 0,
              background: 'linear-gradient(150deg, var(--primary), var(--primary-active))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 3px 9px rgba(30,45,74,0.28)',
            }} aria-hidden="true">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
          )}
          <span className="topbar-title">{pageTitle}</span>
          <button className="topbar-btn press" onClick={() => navigate('/menu')} aria-label="Ouvrir le menu">
            {user ? <Avatar nom={user.nom} photoUrl={user.photo_url} size={28} /> : <IcoUser />}
          </button>
        </div>

        <main className="page-content"><Outlet /></main>

        {/* Bottom navigation */}
        <nav className="bottom-nav" aria-label="Navigation principale">
          {tabs.map(tab => {
            const active = tab.match(path);
            return (
              <button
                key={tab.to}
                className={`bottom-nav-item${active ? ' active' : ''}`}
                onClick={() => navigate(tab.to)}
                aria-label={tab.label}
                aria-current={active ? 'page' : undefined}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function IcoBack() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
}
function IcoHome() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function IcoFile() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
}
function IcoGradCap() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 4 3 6 3s6-1 6-3v-5"/></svg>;
}
function IcoBook() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>;
}
function IcoMenu() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
}
function IcoUser() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
