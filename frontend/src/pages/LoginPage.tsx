import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/client';
import { useAuthStore } from '../store/auth';
import { Spinner } from '../components/ui/Spinner';

const CONTACT_ADMIN = '+237 620 51 95 64';
const MAX_ATTEMPTS = 3;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setToken, loadMe } = useAuthStore();
  const [matricule, setMatricule] = useState('');
  const [loading, setLoading] = useState(false);
  const [failCount, setFailCount] = useState(0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(matricule.trim().toUpperCase());
      setToken(res.access_token);
      await loadMe();
      setFailCount(0);
      navigate('/tableau-de-bord');
    } catch {
      setFailCount(n => n + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg-page)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* En-tête */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 48, height: 48,
            background: 'var(--brand-navy)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
              <path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
          <div style={{
            fontFamily: 'Lora, Georgia, serif',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--brand-navy)',
            lineHeight: 1.2,
          }}>
            Mises en Commun
          </div>
          <div style={{
            fontSize: 11,
            color: 'var(--fg-muted)',
            marginTop: 5,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>
            Culte d'enfants
          </div>
        </div>

        {/* Carte de connexion */}
        <div className="card" style={{ padding: '28px 24px' }}>
          <h2 style={{
            fontFamily: 'Lora, Georgia, serif',
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--fg-primary)',
            marginBottom: 4,
          }}>
            Connexion
          </h2>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 24 }}>
            Entrez votre matricule pour accéder à l'application.
          </p>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-secondary)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Matricule
              </label>
              <input
                className="field"
                type="text"
                placeholder="MCM-XXXXXX"
                value={matricule}
                onChange={e => setMatricule(e.target.value.toUpperCase())}
                autoComplete="username"
                autoFocus
                required
                style={{ fontFamily: 'monospace', letterSpacing: '0.08em', fontSize: 16 }}
              />
            </div>
            <button
              className="btn btn-primary btn-lg"
              type="submit"
              disabled={loading}
              style={{ width: '100%', marginTop: 4 }}
            >
              {loading ? <Spinner size={16} /> : 'Se connecter'}
            </button>
          </form>

          {/* Message après 3 tentatives échouées */}
          {failCount >= MAX_ATTEMPTS && (
            <div style={{
              marginTop: 16,
              padding: '12px 14px',
              background: '#FEF3C7',
              border: '1px solid #F59E0B',
              borderRadius: 8,
              fontSize: 12,
              color: '#92400E',
              lineHeight: 1.6,
            }}>
              <strong>Matricule oublié ?</strong><br />
              Contactez votre administrateur au{' '}
              <strong>{CONTACT_ADMIN}</strong> pour qu'il vous génère un nouveau matricule.
            </div>
          )}
        </div>

        {/* Note informative */}
        <p style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--fg-muted)',
          marginTop: 20,
          lineHeight: 1.6,
        }}>
          Vous n'avez pas de compte ?<br />
          Contactez votre administrateur pour en obtenir un.
        </p>
      </div>
    </div>
  );
}
