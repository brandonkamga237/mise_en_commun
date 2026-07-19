import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPreparations, getHistorique, dupliquerPreparation, createPreparation, downloadPdf } from '../api/client';
import { useAuthStore } from '../store/auth';
import { StatusPill } from '../components/ui/StatusPill';
import { Spinner } from '../components/ui/Spinner';
import { Skeleton } from '../components/ui/Skeleton';
import type { PreparationSummary } from '../types';
import toast from 'react-hot-toast';

function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getUpcomingSundays(): [string, string] {
  const d = new Date();
  const day = d.getDay();
  const d1 = new Date(d);
  d1.setDate(d.getDate() + (day === 0 ? 7 : 7 - day));
  const d2 = new Date(d1);
  d2.setDate(d1.getDate() + 7);
  return [localDateStr(d1), localDateStr(d2)];
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function fmtLong(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}


export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isResp = user?.role === 'responsable' || user?.role === 'admin';
  const [dimanche1, dimanche2] = getUpcomingSundays();
  const jours1 = daysUntil(dimanche1);

  const [preparations1, setPreparations1] = useState<PreparationSummary[]>([]);
  const [preparations2, setPreparations2] = useState<PreparationSummary[]>([]);
  const [historique, setHistorique] = useState<PreparationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const [sem1, sem2, hist] = await Promise.all([
          getPreparations({ date_dimanche: dimanche1 }),
          getPreparations({ date_dimanche: dimanche2 }),
          getHistorique(),
        ]);
        setPreparations1(sem1);
        setPreparations2(sem2);
        setHistorique(hist.slice(0, 5));
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [dimanche1, dimanche2]);

  const handleCreate = async (date: string) => {
    setCreating(date);
    try {
      const b = await createPreparation({ date_dimanche: date });
      navigate(`/preparations/${b.id}`);
    } catch {} finally { setCreating(null); }
  };

  const handleDupliquer = async (sourceId: number, targetDate: string) => {
    try {
      const b = await dupliquerPreparation(sourceId, targetDate);
      toast.success('Préparation dupliquée.');
      navigate(`/preparations/${b.id}`);
    } catch {}
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div style={{ marginBottom: 20 }}>
          <Skeleton w={180} h={26} r={10} />
          <Skeleton w={130} h={13} style={{ marginTop: 8 }} />
        </div>
        <Skeleton h={120} r={13} style={{ marginBottom: 16 }} />
        <Skeleton h={150} r={18} style={{ marginBottom: 12 }} />
        <Skeleton h={90} r={13} style={{ marginBottom: 16 }} />
        <Skeleton h={180} r={13} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page-wrapper">
        <div className="empty-state" style={{ paddingTop: 48 }}>
          <div className="empty-state-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--fg-primary)', marginBottom: 4 }}>
            Impossible de charger le tableau de bord
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 16 }}>
            Vérifie ta connexion puis réessaie.
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => window.location.reload()}>Réessayer</button>
        </div>
      </div>
    );
  }

  const maPreparation1 = preparations1.find(b => b.auteur.id === user?.id);
  const maPreparation2 = preparations2.find(b => b.auteur.id === user?.id);
  const candidats1 = preparations1.filter(b => b.statut === 'en_revision' && b.visible);
  const officiel1 = preparations1.find(b => b.statut === 'officiel');
  const officiel2 = preparations2.find(b => b.statut === 'officiel');
  const prenom = user?.nom.trim().split(/\s+/)[0] ?? '';

  return (
    <div className="page-wrapper">

      {/* Greeting */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--fg-primary)', margin: 0 }}>
          Bonjour{prenom ? `, ${prenom}` : ''}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 3 }}>
          {jours1 === 0 ? "C'est dimanche aujourd'hui !" : jours1 === 1 ? "Demain c'est le culte." : `Prochain culte dans ${jours1} jours`}
        </p>
      </div>

      {/* ── Mon action (P0: user action first) ───────────────── */}
      <MyActionCard
        maPreparation={maPreparation1}
        dimanche={dimanche1}
        creating={creating === dimanche1}
        onCreate={() => handleCreate(dimanche1)}
        onOpen={(id) => navigate(`/preparations/${id}`)}
        isResp={isResp}
        candidats={candidats1}
        onVoirCandidats={() => navigate('/preparations')}
      />

      {/* ── État de l'équipe pour ce dimanche ────────────────── */}
      <div className="hero-card" style={{ marginBottom: 12 }}>
        <div className="hero-card-header">
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-muted)', marginBottom: 3 }}>
              Prochain dimanche
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--fg-primary)' }}>
              {fmtLong(dimanche1)}
            </div>
          </div>
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 99,
            background: jours1 <= 2 ? '#FEE2E2' : 'var(--brand-stone)',
            color: jours1 <= 2 ? '#DC2626' : 'var(--fg-secondary)',
            flexShrink: 0,
          }}>
            {jours1 === 0 ? "Aujourd'hui" : jours1 === 1 ? 'Demain' : `J-${jours1}`}
          </span>
        </div>

        <div className="hero-card-body">
          {officiel1 ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>✅</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#14532D' }}>Préparation validée</div>
                  <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
                    par {officiel1.auteur.nom} · {officiel1.nb_chants} chant{officiel1.nb_chants !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/preparations/${officiel1.id}`)}>Consulter</button>
                <button className="btn btn-secondary btn-sm" onClick={() => downloadPdf(officiel1.id)}>
                  PDF ↓
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-page)', border: '2px dashed var(--border-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IcoFile />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-primary)' }}>
                  {preparations1.length === 0 ? 'Aucune préparation proposée' : `${preparations1.length} préparation${preparations1.length > 1 ? 's' : ''} en cours`}
                </div>
                <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Pas encore de préparation validée</div>
              </div>
            </div>
          )}
        </div>

        <div className="hero-card-footer">
          <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>
            {preparations1.length} préparation{preparations1.length !== 1 ? 's' : ''} soumise{preparations1.length !== 1 ? 's' : ''}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/preparations')}>
            Voir l'équipe →
          </button>
        </div>
      </div>

      {/* Dimanche suivant */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
              Dimanche suivant
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--fg-secondary)' }}>
              {fmtLong(dimanche2)}
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 2 }}>
              {preparations2.length === 0 ? 'Aucune préparation' : `${preparations2.length} préparation${preparations2.length > 1 ? 's' : ''}`}
              {officiel2 && <span style={{ color: '#16A34A', marginLeft: 6, fontWeight: 600 }}>· Validée</span>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            {officiel2 ? (
              <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/preparations/${officiel2.id}`)}>Consulter</button>
            ) : maPreparation2 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <StatusPill statut={maPreparation2.statut} />
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/preparations/${maPreparation2.id}`)}>→</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => handleCreate(dimanche2)} disabled={creating === dimanche2}>
                  {creating === dimanche2 ? <Spinner size={12} /> : '+ Créer'}
                </button>
                {historique.length > 0 && (
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                    onClick={() => handleDupliquer(historique[0].id, dimanche2)}>
                    Partir du dernier →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historique récent */}
      {historique.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-muted)' }}>
              Historique
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/historique')}>
              Tout voir
            </button>
          </div>
          {historique.map((h, i) => (
            <div key={h.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: i < historique.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              cursor: 'pointer',
            }} onClick={() => navigate(`/preparations/${h.id}`)}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-primary)' }}>
                  {new Date(h.date_dimanche + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                  {h.auteur.nom} · {h.nb_chants} chant{h.nb_chants !== 1 ? 's' : ''}
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={e => { e.stopPropagation(); downloadPdf(h.id); }}
              >
                PDF ↓
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Mon action card ──────────────────────────────────────────
interface MyActionCardProps {
  maPreparation: PreparationSummary | undefined;
  dimanche: string;
  creating: boolean;
  onCreate: () => void;
  onOpen: (id: number) => void;
  isResp: boolean;
  candidats: PreparationSummary[];
  onVoirCandidats: () => void;
}

function MyActionCard({ maPreparation, dimanche, creating, onCreate, onOpen, isResp, candidats, onVoirCandidats }: MyActionCardProps) {
  if (isResp && candidats.length > 0) {
    return (
      <div style={{
        background: 'var(--brand-gold-pale)', border: '1px solid #FDE68A',
        borderRadius: 12, padding: '14px 16px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEF3C7', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>⏳</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#92400E' }}>
            {candidats.length} préparation{candidats.length > 1 ? 's' : ''} à valider
          </div>
          <div style={{ fontSize: 13, color: '#B45309', marginTop: 2 }}>
            En attente de ta validation pour ce dimanche
          </div>
        </div>
        <button className="btn btn-sm" style={{ background: '#D97706', color: '#fff', flexShrink: 0 }} onClick={onVoirCandidats}>
          Examiner
        </button>
      </div>
    );
  }

  if (!maPreparation) {
    return (
      <div style={{
        background: 'var(--brand-navy)', borderRadius: 12,
        padding: '16px', marginBottom: 16,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
          Mon action
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
          Propose ta préparation
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 14, lineHeight: 1.5 }}>
          Tu n'as pas encore créé de préparation pour {fmtLong(dimanche)}.
        </div>
        <button
          className="btn btn-lg"
          style={{ background: 'var(--brand-gold)', color: '#fff', width: '100%', justifyContent: 'center' }}
          onClick={onCreate}
          disabled={creating}
        >
          {creating ? <Spinner size={16} /> : '+ Créer ma préparation'}
        </button>
      </div>
    );
  }

  const statusMsg: Record<string, { icon: string; text: string; color: string }> = {
    cree:           { icon: '✏️', text: 'Complète et soumets ta préparation.', color: 'var(--fg-primary)' },
    en_revision:    { icon: '↩️', text: 'Un retour t\'a été envoyé. Corrige et resoumets.', color: '#DC2626' },
    candidat_final: { icon: '⏳', text: 'Soumise — en attente de validation.', color: '#B45309' },
    officiel:       { icon: '✅', text: 'Ta préparation est validée pour ce dimanche !', color: '#14532D' },
    archive:        { icon: '📦', text: 'Cette préparation est archivée.', color: 'var(--fg-muted)' },
  };

  const info = statusMsg[maPreparation.statut] ?? statusMsg.cree;
  const isUrgent = maPreparation.statut === 'cree' || maPreparation.statut === 'en_revision';

  return (
    <div style={{
      background: isUrgent ? 'var(--brand-navy)' : 'var(--bg-card)',
      border: isUrgent ? 'none' : '1px solid var(--border-subtle)',
      borderRadius: 12, padding: '14px 16px', marginBottom: 16,
      boxShadow: isUrgent ? '0 4px 16px rgba(30,45,74,0.20)' : 'var(--shadow-card)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: isUrgent ? 'rgba(255,255,255,0.5)' : 'var(--fg-muted)', marginBottom: 6 }}>
        Ma préparation
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>{info.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: isUrgent ? '#fff' : info.color }}>
            {info.text}
          </div>
          <div style={{ fontSize: 12, color: isUrgent ? 'rgba(255,255,255,0.55)' : 'var(--fg-muted)', marginTop: 2 }}>
            {maPreparation.nb_chants} chant{maPreparation.nb_chants !== 1 ? 's' : ''}
          </div>
        </div>
        <button
          className="btn btn-sm"
          style={isUrgent ? { background: 'var(--brand-gold)', color: '#fff', flexShrink: 0 } : { flexShrink: 0 }}
          onClick={() => onOpen(maPreparation.id)}
        >
          {isUrgent ? 'Ouvrir →' : 'Consulter →'}
        </button>
      </div>
    </div>
  );
}

function IcoFile() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
}
