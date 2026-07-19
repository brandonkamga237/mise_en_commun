import { useNavigate, useLocation } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../store/auth';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  active: boolean;
}

function NavItem({ icon, label, to, active }: NavItemProps) {
  const navigate = useNavigate();
  return (
    <button
      className={`nav-item${active ? ' active' : ''}`}
      onClick={() => navigate(to)}
      aria-current={active ? 'page' : undefined}
      style={{ width: 'calc(100% - 20px)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
    >
      <span style={{ flexShrink: 0, display: 'flex' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
    </button>
  );
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  responsable: 'Responsable',
  moniteur: 'Moniteur',
};

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const isResp = user?.role === 'responsable' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';
  const path = location.pathname;

  const at = (p: string) => path === p || (p !== '/preparations' && path.startsWith(p + '/'));

  return (
    <div style={{
      width: 'var(--sidebar-width)',
      background: 'var(--surface)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '100dvh',
    }}>
      {/* ── Brand ──────────────────────────────────────────── */}
      <div style={{
        padding: '18px 18px 16px',
        display: 'flex', alignItems: 'center', gap: 11,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: 'linear-gradient(150deg, var(--primary), var(--primary-active))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(30,45,74,0.26)',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text-strong)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            Mises en Commun
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2, fontWeight: 600 }}>
            Culte d'enfants
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '0 18px' }} />

      {/* ── Nav ────────────────────────────────────────────── */}
      <nav style={{ flex: 1, paddingTop: 4, overflowY: 'auto' }}>
        <div className="section-label">Espace</div>
        <NavItem icon={<IcoHome />} label="Tableau de bord" to="/tableau-de-bord" active={at('/tableau-de-bord')} />
        <NavItem icon={<IcoFile />} label="Mes préparations" to="/mes-preparations" active={at('/mes-preparations')} />
        <NavItem icon={<IcoPeople />} label="Équipe" to="/preparations" active={path === '/preparations'} />
        <NavItem icon={<IcoClock />} label="Historique" to="/historique" active={at('/historique')} />

        <div className="section-label">Ressources</div>
        <NavItem icon={<IcoBook />} label="Bibliothèque" to="/bibliotheque" active={at('/bibliotheque')} />
        <NavItem icon={<IcoGradCap />} label="Formation" to="/formation" active={at('/formation')} />

        {isResp && (
          <>
            <div className="section-label">Gestion</div>
            <NavItem icon={<IcoShield />} label="Présence" to="/presence" active={at('/presence')} />
            {isAdmin && (
              <NavItem icon={<IcoSettings />} label="Administration" to="/admin" active={at('/admin')} />
            )}
          </>
        )}
      </nav>

      {/* ── User footer ────────────────────────────────────── */}
      <div style={{ padding: 10, borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => navigate('/profil')}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: 8, borderRadius: 'var(--r-sm)', background: 'none', border: 'none',
            cursor: 'pointer', textAlign: 'left', transition: 'background 130ms ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          {user && <Avatar nom={user.nom} photoUrl={user.photo_url} size={34} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
              {user?.prenom ? `${user.prenom} ${user.nom}` : user?.nom}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 1 }}>
              {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
            </div>
          </div>
          <span
            role="button"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); logout(); navigate('/connexion'); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); logout(); navigate('/connexion'); } }}
            title="Se déconnecter"
            style={{
              cursor: 'pointer', color: 'var(--text-faint)', padding: 7, borderRadius: 8,
              display: 'flex', transition: 'color 0.15s, background 0.15s', flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--danger-soft)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <IcoLogout />
          </span>
        </button>
      </div>
    </div>
  );
}

function IcoHome() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function IcoFile() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
}
function IcoPeople() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
}
function IcoClock() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14.5"/></svg>;
}
function IcoShield() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
function IcoSettings() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
}
function IcoBook() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>;
}
function IcoGradCap() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 4 3 6 3s6-1 6-3v-5"/></svg>;
}
function IcoLogout() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
}
