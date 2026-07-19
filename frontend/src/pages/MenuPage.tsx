import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/ui/Avatar';
import { useAuthStore } from '../store/auth';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  responsable: 'Responsable',
  moniteur: 'Moniteur',
};

interface Tile {
  label: string;
  sub: string;
  to?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  fg: string;
  bg: string;
  show: boolean;
}

export default function MenuPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const isResp = user?.role === 'responsable' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  const tiles: Tile[] = [
    { label: 'Historique', sub: 'Cultes passés', to: '/historique', icon: <IcoClock />, fg: 'var(--primary)', bg: 'var(--primary-soft)', show: true },
    { label: 'Présence', sub: 'Répétitions du samedi', to: '/presence', icon: <IcoShield />, fg: 'var(--brand-blue)', bg: '#EAF0F6', show: isResp },
    { label: 'Administration', sub: 'Moniteurs & rôles', to: '/admin', icon: <IcoSettings />, fg: 'var(--accent-hover)', bg: 'var(--accent-soft)', show: isAdmin },
    { label: 'Mon profil', sub: 'Infos & photo', to: '/profil', icon: <IcoUser />, fg: 'var(--text)', bg: 'var(--surface-sunken)', show: true },
  ];

  return (
    <div className="page-wrapper">
      {/* En-tête profil */}
      <button
        onClick={() => navigate('/profil')}
        className="press"
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: 16, marginBottom: 20, borderRadius: 'var(--r-lg)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-xs)', cursor: 'pointer', textAlign: 'left',
        }}
      >
        {user && <Avatar nom={user.nom} photoUrl={user.photo_url} size={54} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-strong)' }}>
            {user?.prenom ? `${user.prenom} ${user.nom}` : user?.nom}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span className="chip chip-primary" style={{ textTransform: 'capitalize' }}>
              {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
            </span>
            {user?.matricule && (
              <span style={{ fontSize: 12, fontFamily: 'monospace', letterSpacing: '0.04em', color: 'var(--text-faint)' }}>
                {user.matricule}
              </span>
            )}
          </div>
        </div>
        <IcoChevron />
      </button>

      {/* Tuiles */}
      <div className="menu-grid">
        {tiles.filter(t => t.show).map(t => (
          <button
            key={t.label}
            className="menu-tile"
            onClick={() => (t.onClick ? t.onClick() : navigate(t.to!))}
          >
            <span className="menu-tile-icon" style={{ background: t.bg, color: t.fg }}>{t.icon}</span>
            <span>
              <span className="menu-tile-label" style={{ display: 'block' }}>{t.label}</span>
              <span className="menu-tile-sub">{t.sub}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Déconnexion */}
      <button
        onClick={() => { logout(); navigate('/connexion'); }}
        className="press"
        style={{
          width: '100%', marginTop: 20, display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', borderRadius: 'var(--r-md)',
          background: 'var(--danger-soft)', border: '1px solid var(--danger-border)',
          color: 'var(--danger-text)', fontSize: 14.5, fontWeight: 600, cursor: 'pointer',
        }}
      >
        <IcoLogout /> Se déconnecter
      </button>

      {/* À propos */}
      <div style={{ textAlign: 'center', marginTop: 28, fontSize: 12, color: 'var(--text-faint)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text-muted)', marginBottom: 2 }}>
          Mises en Commun
        </div>
        Culte d'enfants · v4.0
      </div>
    </div>
  );
}

function IcoClock() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14.5"/></svg>;
}
function IcoShield() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
function IcoSettings() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
}
function IcoUser() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function IcoLogout() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
}
function IcoChevron() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
}
