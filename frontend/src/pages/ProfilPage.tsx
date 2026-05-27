import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfil, uploadPhoto } from '../api/client';
import { useAuthStore } from '../store/auth';
import { Spinner } from '../components/ui/Spinner';
import toast from 'react-hot-toast';

const ROLE_LABELS: Record<string, string> = {
  moniteur: 'Moniteur',
  responsable: 'Responsable',
  admin: 'Administrateur',
};

export default function ProfilPage() {
  const navigate = useNavigate();
  const { user, loadMe } = useAuthStore();
  const [nom, setNom] = useState(user?.nom ?? '');
  const [prenom, setPrenom] = useState(user?.prenom ?? '');
  const [adresse, setAdresse] = useState(user?.adresse ?? '');
  const [telephone, setTelephone] = useState(user?.telephone ?? '');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data: Parameters<typeof updateProfil>[0] = {};
      if (nom.trim() && nom.trim() !== user?.nom) data.nom = nom.trim();
      if (prenom.trim() !== (user?.prenom ?? '')) data.prenom = prenom.trim();
      if (adresse.trim() !== (user?.adresse ?? '')) data.adresse = adresse.trim();
      if (telephone.trim() !== (user?.telephone ?? '')) data.telephone = telephone.trim();
      if (Object.keys(data).length === 0) {
        toast('Aucune modification détectée.');
        return;
      }
      await updateProfil(data);
      await loadMe();
      toast.success('Profil mis à jour.');
    } catch {} finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      await uploadPhoto(file);
      await loadMe();
      toast.success('Photo mise à jour.');
    } catch {} finally {
      setUploadingPhoto(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const initials = [user?.prenom, user?.nom]
    .filter(Boolean)
    .map(s => s![0].toUpperCase())
    .join('') || (user?.nom?.[0]?.toUpperCase() ?? '?');

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Lora, serif', fontSize: 22, fontWeight: 600, color: 'var(--fg-primary)', margin: 0 }}>
          Mon profil
        </h1>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>
          Gérez vos informations personnelles et vos accès.
        </p>
      </div>

      {/* Carte identité + photo */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: '16px 20px', flexWrap: 'wrap' }}>
        {/* Avatar cliquable */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            style={{
              width: 64, height: 64, borderRadius: '50%',
              overflow: 'hidden',
              background: user?.photo_url ? 'transparent' : 'var(--brand-navy)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              border: '2px solid var(--border-medium)',
            }}
            onClick={() => fileRef.current?.click()}
            title="Changer la photo"
          >
            {user?.photo_url ? (
              <img src={user.photo_url} alt="Photo de profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: 'white', fontWeight: 700, fontSize: 22 }}>{initials}</span>
            )}
            {uploadingPhoto && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
              }}>
                <Spinner size={18} />
              </div>
            )}
          </div>
          <div
            style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 20, height: 20, borderRadius: '50%',
              background: 'var(--brand-gold)', border: '2px solid var(--bg-card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
            onClick={() => fileRef.current?.click()}
          >
            <IcoPen />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handlePhotoChange}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg-primary)' }}>
            {user?.prenom ? `${user.prenom} ${user.nom}` : user?.nom}
          </div>
          {user?.matricule && (
            <div style={{ fontSize: 12, fontFamily: 'monospace', letterSpacing: '0.06em', color: 'var(--fg-muted)', marginTop: 2 }}>
              {user.matricule}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
          </div>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Informations de base */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-secondary)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Nom *
              </label>
              <input
                className="field"
                type="text"
                value={nom}
                onChange={e => setNom(e.target.value)}
                required
                placeholder="Nom de famille"
              />
            </div>
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-secondary)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Prénom
              </label>
              <input
                className="field"
                type="text"
                value={prenom}
                onChange={e => setPrenom(e.target.value)}
                placeholder="Prénom (optionnel)"
              />
            </div>
          </div>

          {/* Informations de contact */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-secondary)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Téléphone
              </label>
              <input
                className="field"
                type="tel"
                value={telephone}
                onChange={e => setTelephone(e.target.value)}
                placeholder="+237 6XX XXX XXX"
              />
            </div>
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-secondary)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Adresse
              </label>
              <input
                className="field"
                type="text"
                value={adresse}
                onChange={e => setAdresse(e.target.value)}
                placeholder="Quartier, ville…"
              />
            </div>
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

      {/* Matricule (lecture seule) */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Matricule (identifiant de connexion)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--brand-navy)' }}>
            {user?.matricule ?? '—'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
            Transmis uniquement à l'admin en cas d'oubli.
          </span>
        </div>
        <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 8 }}>
          En cas d'oubli, contactez votre administrateur au <strong>+237 620 51 95 64</strong>.
        </p>
      </div>
    </div>
  );
}

function IcoPen() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
