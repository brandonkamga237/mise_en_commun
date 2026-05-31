import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCours, createCours } from '../api/client';
import { useAuthStore } from '../store/auth';
import { Spinner } from '../components/ui/Spinner';
import toast from 'react-hot-toast';
import type { CoursSummary } from '../types';

export default function FormationPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isResp = user?.role === 'responsable' || user?.role === 'admin';

  const [cours, setCours] = useState<CoursSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setCours(await getCours());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim()) return;
    setSaving(true);
    try {
      const c = await createCours({ titre: titre.trim(), description: description.trim() || undefined });
      setShowModal(false);
      setTitre('');
      setDescription('');
      toast.success('Cours créé.');
      navigate(`/formation/${c.id}`);
    } catch {} finally {
      setSaving(false);
    }
  };

  const publie = cours.filter(c => c.publie);
  const brouillons = cours.filter(c => !c.publie);

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Lora, serif', fontSize: 22, fontWeight: 600, color: 'var(--fg-primary)', margin: 0 }}>
            Formation
          </h1>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>
            {cours.length} cours · Ressources pour les moniteurs
          </p>
        </div>
        {isResp && (
          <button className="btn btn-primary" style={{ gap: 6 }} onClick={() => setShowModal(true)}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Nouveau cours
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner size={32} />
        </div>
      ) : cours.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📚</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg-primary)', marginBottom: 4 }}>Aucun cours pour l'instant</p>
          {isResp && <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Créez le premier cours pour commencer.</p>}
        </div>
      ) : (
        <>
          {publie.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
                Cours publiés
              </h2>
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {publie.map(c => <CoursCard key={c.id} cours={c} onClick={() => navigate(`/formation/${c.id}`)} />)}
              </div>
            </section>
          )}

          {isResp && brouillons.length > 0 && (
            <section>
              <h2 style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
                Brouillons (non publiés)
              </h2>
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {brouillons.map(c => <CoursCard key={c.id} cours={c} onClick={() => navigate(`/formation/${c.id}`)} />)}
              </div>
            </section>
          )}
        </>
      )}

      {/* Modal création cours */}
      {showModal && (
        <>
          <div className="overlay" style={{ zIndex: 80 }} onClick={() => setShowModal(false)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            zIndex: 90, width: '90%', maxWidth: 440,
            background: 'var(--bg-card)', borderRadius: 12, padding: '24px 24px 20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          }}>
            <h3 style={{ fontFamily: 'Lora, serif', fontSize: 17, fontWeight: 600, color: 'var(--fg-primary)', margin: '0 0 16px' }}>
              Nouveau cours
            </h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>
                  Titre *
                </label>
                <input
                  className="field"
                  autoFocus
                  value={titre}
                  onChange={e => setTitre(e.target.value)}
                  placeholder="Ex: Introduction au culte d'enfants"
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>
                  Description <span style={{ fontWeight: 400, textTransform: 'none' }}>(optionnel)</span>
                </label>
                <textarea
                  className="field"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Résumé du cours…"
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving || !titre.trim()}>
                  {saving ? <Spinner size={14} /> : 'Créer le cours'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

function CoursCard({ cours, onClick }: { cours: CoursSummary; onClick: () => void }) {
  return (
    <div
      className="card"
      onClick={onClick}
      style={{ cursor: 'pointer', padding: '16px 18px', transition: 'box-shadow 0.15s', position: 'relative' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}
    >
      {!cours.publie && (
        <span style={{
          position: 'absolute', top: 12, right: 12,
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
          background: '#FEF3C7', color: '#92400E', padding: '2px 7px', borderRadius: 99,
          border: '1px solid #FCD34D',
        }}>
          Brouillon
        </span>
      )}
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg-primary)', marginBottom: 6, paddingRight: cours.publie ? 0 : 60 }}>
        {cours.titre}
      </div>
      {cours.description && (
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 10, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {cours.description}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--fg-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <IcoBook /> {cours.nb_lecons} leçon{cours.nb_lecons !== 1 ? 's' : ''}
        </span>
        {cours.cree_par && (
          <span>par {cours.cree_par.prenom ?? cours.cree_par.nom}</span>
        )}
      </div>
    </div>
  );
}

function IcoBook() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>;
}
