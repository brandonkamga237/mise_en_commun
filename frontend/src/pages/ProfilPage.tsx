import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfil } from '../api/client';
import { useAuthStore } from '../store/auth';
import { Spinner } from '../components/ui/Spinner';
import { Avatar } from '../components/ui/Avatar';
import toast from 'react-hot-toast';

export default function ProfilPage() {
  const navigate = useNavigate();
  const { user, loadMe } = useAuthStore();
  const [nom, setNom] = useState(user?.nom ?? '');
  const [mdp, setMdp] = useState('');
  const [mdpConfirm, setMdpConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const ROLE_LABELS: Record<string, string> = {
    moniteur: 'Moniteur',
    responsable: 'Responsable',
    admin: 'Administrateur',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mdp && mdp !== mdpConfirm) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }
    if (mdp && mdp.length < 6) {
      toast.error('Le mot de passe doit faire au moins 6 caractères.');
      return;
    }
    setSaving(true);
    try {
      const data: { nom?: string; mot_de_passe?: string } = {};
      if (nom.trim() && nom.trim() !== user?.nom) data.nom = nom.trim();
      if (mdp) data.mot_de_passe = mdp;
      if (Object.keys(data).length === 0) {
        toast('Aucune modification détectée.');
        return;
      }
      await updateProfil(data);
      await loadMe();
      toast.success('Profil mis à jour.');
      setMdp('');
      setMdpConfirm('');
    } catch {} finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Lora, serif', fontSize: 22, fontWeight: 600, color: 'var(--fg-primary)', margin: 0 }}>
          Mon profil
        </h1>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>
          Modifie ton nom ou ton mot de passe.
        </p>
      </div>

      {/* Carte identité */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, padding: '16px 20px' }}>
        {user && <Avatar nom={user.nom} size={48} />}
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg-primary)' }}>{user?.nom}</div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{user?.email}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
          </div>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-secondary)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Nom d'affichage
            </label>
            <input
              className="field"
              type="text"
              value={nom}
              onChange={e => setNom(e.target.value)}
              required
              placeholder="Prénom Nom"
            />
          </div>

          <div style={{ height: 1, background: 'var(--border-subtle)' }} />

          <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>
            Laisse les champs ci-dessous vides pour ne pas changer ton mot de passe.
          </p>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-secondary)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Nouveau mot de passe
            </label>
            <input
              className="field"
              type="password"
              value={mdp}
              onChange={e => setMdp(e.target.value)}
              placeholder="6 caractères minimum"
              autoComplete="new-password"
              minLength={6}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-secondary)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Confirmer le mot de passe
            </label>
            <input
              className="field"
              type="password"
              value={mdpConfirm}
              onChange={e => setMdpConfirm(e.target.value)}
              placeholder="Répète le nouveau mot de passe"
              autoComplete="new-password"
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Spinner size={14} /> : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
