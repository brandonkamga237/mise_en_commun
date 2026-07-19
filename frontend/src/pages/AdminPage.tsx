import { useEffect, useMemo, useState } from 'react';
import { getUtilisateurs, createUtilisateur, updateUtilisateur, deleteUtilisateur, regenererMatricule } from '../api/client';
import { useAuthStore } from '../store/auth';
import { Spinner } from '../components/ui/Spinner';
import { Avatar } from '../components/ui/Avatar';
import { SkeletonList } from '../components/ui/Skeleton';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import type { User, Role } from '../types';
import toast from 'react-hot-toast';

const ROLES: { value: Role; label: string }[] = [
  { value: 'moniteur',    label: 'Moniteur' },
  { value: 'responsable', label: 'Responsable' },
  { value: 'admin',       label: 'Administrateur' },
];
const ROLE_LABELS: Record<Role, string> = { moniteur: 'Moniteur', responsable: 'Responsable', admin: 'Administrateur' };
const ROLE_COLORS: Record<Role, string> = { moniteur: 'var(--text-muted)', responsable: 'var(--primary)', admin: 'var(--accent-hover)' };

type RoleFiltre = 'tous' | Role;

export default function AdminPage() {
  const { user: me } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: '', prenom: '', role: 'moniteur' as Role });
  const [creating, setCreating] = useState(false);
  const [userASupprimer, setUserASupprimer] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [roleConfirm, setRoleConfirm] = useState<{ user: User; newRole: Role } | null>(null);
  const [changingRole, setChangingRole] = useState(false);
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [matriculeRevele, setMatriculeRevele] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [roleFiltre, setRoleFiltre] = useState<RoleFiltre>('tous');

  const load = async () => {
    setLoading(true);
    try { setUsers(await getUtilisateurs()); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const created = await createUtilisateur({ nom: form.nom, prenom: form.prenom || undefined, role: form.role });
      toast.success(
        <div><strong>{form.nom}</strong> a été ajouté.<br />
          <span style={{ fontFamily: 'monospace', fontSize: 13, letterSpacing: '0.05em' }}>Matricule : {created.matricule}</span>
        </div>, { duration: 8000 });
      setForm({ nom: '', prenom: '', role: 'moniteur' });
      setShowForm(false);
      load();
    } catch {} finally { setCreating(false); }
  };

  const confirmRoleChange = async () => {
    if (!roleConfirm) return;
    setChangingRole(true);
    try {
      await updateUtilisateur(roleConfirm.user.id, { role: roleConfirm.newRole });
      toast.success(`Rôle de ${roleConfirm.user.nom} mis à jour.`);
      setRoleConfirm(null);
      load();
    } catch {} finally { setChangingRole(false); }
  };

  const handleDelete = async () => {
    if (!userASupprimer) return;
    setDeleting(true);
    try {
      await deleteUtilisateur(userASupprimer.id);
      toast.success(`${userASupprimer.nom} a été supprimé.`);
      setUserASupprimer(null);
      load();
    } catch {} finally { setDeleting(false); }
  };

  const handleRegenerer = async (u: User) => {
    setRegenerating(u.id);
    try {
      const updated = await regenererMatricule(u.id);
      setMatriculeRevele(u.id);
      toast.success(
        <div>Nouveau matricule de <strong>{u.nom}</strong> :<br />
          <span style={{ fontFamily: 'monospace', fontSize: 13, letterSpacing: '0.05em' }}>{updated.matricule}</span>
        </div>, { duration: 10000 });
      load();
    } catch {} finally { setRegenerating(null); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u => {
      if (roleFiltre !== 'tous' && u.role !== roleFiltre) return false;
      if (!q) return true;
      const name = `${u.prenom ?? ''} ${u.nom}`.toLowerCase();
      return name.includes(q) || (u.matricule ?? '').toLowerCase().includes(q);
    });
  }, [users, search, roleFiltre]);

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--fg-primary)', margin: 0 }}>
            Administration
          </h1>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>
            {users.length} membre{users.length !== 1 ? 's' : ''} · rôles &amp; matricules
          </p>
        </div>
        <button className="btn btn-primary press" onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Annuler' : '+ Ajouter'}
        </button>
      </div>

      {/* Formulaire ajout */}
      {showForm && (
        <div className="card card-left-gold" style={{ marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--fg-primary)', marginBottom: 6 }}>
            Nouveau membre
          </h3>
          <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 16 }}>
            Le matricule sera généré automatiquement et affiché après la création.
          </p>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: '1 1 180px' }}>
                <label className="field-label">Nom *</label>
                <input className="field" type="text" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} required placeholder="Nom de famille" />
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <label className="field-label">Prénom</label>
                <input className="field" type="text" value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} placeholder="Optionnel" />
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <label className="field-label">Rôle *</label>
                <select className="field" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary press" type="submit" disabled={creating}>
                {creating ? <Spinner size={14} /> : 'Créer le compte'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Recherche + filtre rôle */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <input
          className="field"
          style={{ flex: '1 1 200px' }}
          placeholder="Rechercher un membre…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {([['tous', 'Tous'], ...ROLES.map(r => [r.value, r.label])] as [RoleFiltre, string][]).map(([val, lbl]) => (
            <button key={val} className="chip press" onClick={() => setRoleFiltre(val)}
              style={{
                flexShrink: 0, cursor: 'pointer',
                background: roleFiltre === val ? 'var(--primary-soft)' : 'var(--surface)',
                color: roleFiltre === val ? 'var(--primary-hover)' : 'var(--text-muted)',
                borderColor: roleFiltre === val ? 'var(--primary-border)' : 'var(--border)',
              }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Liste (cartes) */}
      {loading ? (
        <SkeletonList count={5} />
      ) : filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon"><IcoUsers /></div>
          <div style={{ fontWeight: 600, color: 'var(--fg-primary)' }}>Aucun membre trouvé</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(u => {
            const isMe = u.id === me?.id;
            return (
              <div key={u.id} className="card" style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar nom={u.nom} photoUrl={u.photo_url} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--fg-primary)' }}>
                      {u.prenom ? `${u.prenom} ${u.nom}` : u.nom}
                      {isMe && <span style={{ fontSize: 11, marginLeft: 6, color: 'var(--fg-muted)' }}>(vous)</span>}
                    </div>
                    <button
                      onClick={() => setMatriculeRevele(v => v === u.id ? null : u.id)}
                      style={{
                        marginTop: 3, fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.06em',
                        color: matriculeRevele === u.id ? 'var(--fg-secondary)' : 'var(--text-faint)',
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                      }}
                      title="Cliquer pour révéler / masquer"
                    >
                      {matriculeRevele === u.id ? <IcoEye /> : <IcoEyeOff />}
                      {matriculeRevele === u.id ? (u.matricule ?? '—') : '••••••••'}
                    </button>
                  </div>
                  <span className="chip" style={{ color: ROLE_COLORS[u.role], borderColor: 'transparent', background: 'var(--surface-sunken)', fontWeight: 700, flexShrink: 0 }}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </div>

                {!isMe && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <select
                      className="field"
                      style={{ width: 'auto', flex: '1 1 140px', fontSize: 13, padding: '7px 10px' }}
                      value={u.role}
                      onChange={e => setRoleConfirm({ user: u, newRole: e.target.value as Role })}
                    >
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <button className="btn btn-secondary btn-sm press" disabled={regenerating === u.id} onClick={() => handleRegenerer(u)} title="Générer un nouveau matricule">
                      {regenerating === u.id ? <Spinner size={12} /> : '↻ Matricule'}
                    </button>
                    <button className="btn btn-secondary btn-sm press" style={{ color: 'var(--danger)' }} onClick={() => setUserASupprimer(u)}>
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {roleConfirm && (
        <ConfirmModal
          title="Modifier le rôle"
          message={<>Changer le rôle de <strong>{roleConfirm.user.nom}</strong> vers <strong style={{ color: ROLE_COLORS[roleConfirm.newRole] }}>{ROLE_LABELS[roleConfirm.newRole]}</strong> ?</>}
          confirmLabel="Confirmer" variant="primary" loading={changingRole}
          onConfirm={confirmRoleChange} onCancel={() => setRoleConfirm(null)}
        />
      )}

      {userASupprimer && (
        <ConfirmModal
          title="Supprimer ce compte"
          message={<>Le compte de <strong>{userASupprimer.nom}</strong> sera définitivement supprimé. Cette action est irréversible.</>}
          confirmLabel="Supprimer le compte" variant="danger" loading={deleting}
          onConfirm={handleDelete} onCancel={() => setUserASupprimer(null)}
        />
      )}
    </div>
  );
}

function IcoUsers() {
  return <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
}
function IcoEye() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function IcoEyeOff() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
}
