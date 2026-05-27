import { useEffect, useState } from 'react';
import { getUtilisateurs, createUtilisateur, updateUtilisateur, deleteUtilisateur, regenererMatricule } from '../api/client';
import { useAuthStore } from '../store/auth';
import { Spinner } from '../components/ui/Spinner';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import type { User, Role } from '../types';
import toast from 'react-hot-toast';

const ROLES: { value: Role; label: string }[] = [
  { value: 'moniteur',    label: 'Moniteur' },
  { value: 'responsable', label: 'Responsable' },
  { value: 'admin',       label: 'Administrateur' },
];

const ROLE_LABELS: Record<Role, string> = {
  moniteur:    'Moniteur',
  responsable: 'Responsable',
  admin:       'Administrateur',
};

const ROLE_COLORS: Record<Role, string> = {
  moniteur:    '#6B7280',
  responsable: '#2B4C7E',
  admin:       '#C9952A',
};

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

  const load = async () => {
    setLoading(true);
    try {
      const data = await getUtilisateurs();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const created = await createUtilisateur({
        nom: form.nom,
        prenom: form.prenom || undefined,
        role: form.role,
      });
      toast.success(
        <div>
          <strong>{form.nom}</strong> a été ajouté.<br />
          <span style={{ fontFamily: 'monospace', fontSize: 13, letterSpacing: '0.05em' }}>
            Matricule : {created.matricule}
          </span>
        </div>,
        { duration: 8000 }
      );
      setForm({ nom: '', prenom: '', role: 'moniteur' });
      setShowForm(false);
      load();
    } catch {} finally {
      setCreating(false);
    }
  };

  const confirmRoleChange = async () => {
    if (!roleConfirm) return;
    setChangingRole(true);
    try {
      await updateUtilisateur(roleConfirm.user.id, { role: roleConfirm.newRole });
      toast.success(`Rôle de ${roleConfirm.user.nom} mis à jour.`);
      setRoleConfirm(null);
      load();
    } catch {} finally {
      setChangingRole(false);
    }
  };

  const handleDelete = async () => {
    if (!userASupprimer) return;
    setDeleting(true);
    try {
      await deleteUtilisateur(userASupprimer.id);
      toast.success(`${userASupprimer.nom} a été supprimé.`);
      setUserASupprimer(null);
      load();
    } catch {} finally {
      setDeleting(false);
    }
  };

  const handleRegenerer = async (u: User) => {
    setRegenerating(u.id);
    try {
      const updated = await regenererMatricule(u.id);
      toast.success(
        <div>
          Nouveau matricule de <strong>{u.nom}</strong> :<br />
          <span style={{ fontFamily: 'monospace', fontSize: 13, letterSpacing: '0.05em' }}>
            {updated.matricule}
          </span>
        </div>,
        { duration: 10000 }
      );
      load();
    } catch {} finally {
      setRegenerating(null);
    }
  };

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Lora, serif', fontSize: 22, fontWeight: 600, color: 'var(--fg-primary)', margin: 0 }}>
            Administration
          </h1>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>
            Gestion des moniteurs, rôles et matricules
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Annuler' : '+ Ajouter un moniteur'}
        </button>
      </div>

      {/* Formulaire ajout */}
      {showForm && (
        <div className="card card-left-gold" style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 16, fontWeight: 600, color: 'var(--fg-primary)', marginBottom: 16 }}>
            Nouveau moniteur
          </h3>
          <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 16 }}>
            Le matricule sera généré automatiquement et affiché après la création.
          </p>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: '1 1 180px' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-secondary)', display: 'block', marginBottom: 4 }}>Nom *</label>
                <input
                  className="field"
                  type="text"
                  value={form.nom}
                  onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                  required
                  placeholder="Nom de famille"
                />
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-secondary)', display: 'block', marginBottom: 4 }}>Prénom</label>
                <input
                  className="field"
                  type="text"
                  value={form.prenom}
                  onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                  placeholder="Optionnel"
                />
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-secondary)', display: 'block', marginBottom: 4 }}>Rôle *</label>
                <select
                  className="field"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                >
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" type="submit" disabled={creating}>
                {creating ? <Spinner size={14} /> : 'Créer le compte'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner size={32} />
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--fg-secondary)', fontSize: 11, textTransform: 'uppercase' }}>Nom</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--fg-secondary)', fontSize: 11, textTransform: 'uppercase' }}>Matricule</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--fg-secondary)', fontSize: 11, textTransform: 'uppercase' }}>Rôle</th>
                  <th style={{ width: 120 }} />
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} style={{ background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-page)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500, color: 'var(--fg-primary)' }}>
                      {u.prenom ? `${u.prenom} ${u.nom}` : u.nom}
                      {u.id === me?.id && (
                        <span style={{ fontSize: 10, marginLeft: 6, color: 'var(--fg-muted)' }}>(vous)</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 12,
                            letterSpacing: '0.06em',
                            color: matriculeRevele === u.id ? 'var(--fg-primary)' : 'transparent',
                            background: matriculeRevele === u.id ? 'transparent' : 'var(--fg-muted)',
                            borderRadius: 4,
                            padding: '1px 4px',
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                          title="Cliquez pour révéler"
                          onClick={() => setMatriculeRevele(v => v === u.id ? null : u.id)}
                        >
                          {u.matricule ?? '—'}
                        </span>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 10, padding: '2px 6px', color: 'var(--fg-muted)' }}
                          disabled={regenerating === u.id}
                          onClick={() => handleRegenerer(u)}
                          title="Générer un nouveau matricule"
                        >
                          {regenerating === u.id ? <Spinner size={10} /> : '↻ Regénérer'}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {u.id === me?.id ? (
                        <span style={{ fontSize: 12, color: ROLE_COLORS[u.role], fontWeight: 600 }}>
                          {ROLE_LABELS[u.role]}
                        </span>
                      ) : (
                        <select
                          className="field"
                          style={{ padding: '3px 8px', fontSize: 12, width: 'auto' }}
                          value={u.role}
                          onChange={e => setRoleConfirm({ user: u, newRole: e.target.value as Role })}
                        >
                          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      )}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                      {u.id !== me?.id && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: '#DC2626', fontSize: 11 }}
                          onClick={() => setUserASupprimer(u)}
                        >
                          Supprimer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation changement de rôle */}
      {roleConfirm && (
        <ConfirmModal
          title="Modifier le rôle"
          message={
            <>
              Changer le rôle de <strong>{roleConfirm.user.nom}</strong> vers{' '}
              <strong style={{ color: ROLE_COLORS[roleConfirm.newRole] }}>
                {ROLE_LABELS[roleConfirm.newRole]}
              </strong> ?
            </>
          }
          confirmLabel="Confirmer le changement"
          variant="primary"
          loading={changingRole}
          onConfirm={confirmRoleChange}
          onCancel={() => setRoleConfirm(null)}
        />
      )}

      {/* Confirmation suppression */}
      {userASupprimer && (
        <ConfirmModal
          title="Supprimer ce compte"
          message={<>Le compte de <strong>{userASupprimer.nom}</strong> sera définitivement supprimé. Cette action est irréversible.</>}
          confirmLabel="Supprimer le compte"
          variant="danger"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setUserASupprimer(null)}
        />
      )}
    </div>
  );
}
