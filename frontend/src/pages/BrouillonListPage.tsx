import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPreparations, createPreparation } from '../api/client';
import { useAuthStore } from '../store/auth';
import { BrouillonCard } from '../components/brouillon/BrouillonCard';
import { Spinner } from '../components/ui/Spinner';
import { SkeletonList } from '../components/ui/Skeleton';
import type { PreparationSummary } from '../types';
import toast from 'react-hot-toast';

function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function nextSunday(): string {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? 7 : 7 - day));
  return localDateStr(d);
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

const STATUS_ORDER = ['officiel', 'en_revision'];

type StatutFiltre = 'tous' | 'en_revision' | 'officiel';
const FILTRES: { value: StatutFiltre; label: string }[] = [
  { value: 'tous', label: 'Toutes' },
  { value: 'en_revision', label: 'En révision' },
  { value: 'officiel', label: 'Validées' },
];

interface BrouillonListPageProps {
  mineOnly?: boolean;
}

export default function BrouillonListPage({ mineOnly = false }: BrouillonListPageProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [preparations, setPreparations] = useState<PreparationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedDate, setSelectedDate] = useState(nextSunday());
  const [fabOpen, setFabOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [filtre, setFiltre] = useState<StatutFiltre>('tous');
  const fabRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const params: { auteur_id?: number } = {};
      if (mineOnly && user) params.auteur_id = user.id;
      const data = await getPreparations(params);
      setPreparations(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [mineOnly, user?.id]);

  useEffect(() => {
    if (!fabOpen) return;
    const handler = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) setFabOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [fabOpen]);

  const handleCreate = async (date: string) => {
    setCreating(true);
    setFabOpen(false);
    try {
      const b = await createPreparation({ date_dimanche: date });
      navigate(`/preparations/${b.id}`);
    } catch {
      toast.error('Impossible de créer la préparation.');
    } finally {
      setCreating(false);
    }
  };

  const matchFiltre = (b: PreparationSummary) =>
    filtre === 'tous' ? true : b.statut === filtre;

  // Group by date_dimanche desc, sort each group by status priority
  const grouped = preparations.filter(matchFiltre).reduce<Record<string, PreparationSummary[]>>((acc, b) => {
    (acc[b.date_dimanche] ??= []).push(b);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  sortedDates.forEach(d => {
    grouped[d].sort((a, b) => STATUS_ORDER.indexOf(a.statut) - STATUS_ORDER.indexOf(b.statut));
  });

  const today = localDateStr();
  const isStale = (date: string, items: PreparationSummary[]) =>
    date < today && items.length > 0 && items.every(b => b.statut === 'en_revision');

  const staleDatesCount = sortedDates.filter(date => {
    const items = mineOnly ? grouped[date].filter((b: PreparationSummary) => b.auteur.id === user?.id) : grouped[date];
    return isStale(date, items);
  }).length;

  const visibleDates = showAll
    ? sortedDates
    : sortedDates.filter(date => {
        const items = mineOnly ? grouped[date].filter(b => b.auteur.id === user?.id) : grouped[date];
        return !isStale(date, items);
      });

  const segmented = (
    <div className="segmented" style={{ marginBottom: 16 }}>
      <button
        className={`segmented-item${mineOnly ? ' active' : ''}`}
        onClick={() => !mineOnly && navigate('/mes-preparations')}
      >
        Mes préparations
      </button>
      <button
        className={`segmented-item${!mineOnly ? ' active' : ''}`}
        onClick={() => mineOnly && navigate('/preparations')}
      >
        Équipe
      </button>
    </div>
  );

  return (
    <div className="page-wrapper" style={{ paddingBottom: 80 }}>
      {segmented}

      {/* Desktop: row de création */}
      <div className="desktop-create-row" style={{ alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <input
          type="date"
          className="field"
          style={{ width: 'auto', fontSize: 13, padding: '7px 10px' }}
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
        />
        <button className="btn btn-primary btn-sm" onClick={() => handleCreate(selectedDate)} disabled={creating}>
          {creating ? <Spinner size={14} /> : '+ Nouvelle préparation'}
        </button>
      </div>

      {/* Filtres statut */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {FILTRES.map(f => (
          <button
            key={f.value}
            className="chip press"
            onClick={() => setFiltre(f.value)}
            style={{
              flexShrink: 0, cursor: 'pointer',
              background: filtre === f.value ? 'var(--primary-soft)' : 'var(--surface)',
              color: filtre === f.value ? 'var(--primary-hover)' : 'var(--text-muted)',
              borderColor: filtre === f.value ? 'var(--primary-border)' : 'var(--border)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : error ? (
        <div className="empty-state" style={{ paddingTop: 32 }}>
          <div className="empty-state-icon"><IcoAlertCircle /></div>
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--fg-primary)', marginBottom: 4 }}>
            Impossible de charger les préparations
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 16 }}>
            Vérifie ta connexion puis réessaie.
          </div>
          <button className="btn btn-primary btn-sm" onClick={load}>Réessayer</button>
        </div>
      ) : visibleDates.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: 32 }}>
          <div className="empty-state-icon"><IcoFileEmpty /></div>
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--fg-primary)', marginBottom: 4 }}>
            {filtre !== 'tous'
              ? 'Aucune préparation pour ce filtre'
              : mineOnly ? 'Aucune préparation pour l\'instant' : 'Aucune préparation cette semaine'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 16 }}>
            {mineOnly
              ? 'Crée ta première préparation pour commencer.'
              : 'Personne n\'a encore soumis de préparation.'}
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => handleCreate(selectedDate)} disabled={creating}>
            {creating ? <Spinner size={14} /> : '+ Créer une préparation'}
          </button>
        </div>
      ) : (
        <>
          {visibleDates.map(date => {
            const items = mineOnly
              ? grouped[date].filter(b => b.auteur.id === user?.id)
              : grouped[date];
            if (items.length === 0) return null;
            return (
              <div key={date} style={{ marginBottom: 20 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.07em', color: 'var(--fg-muted)',
                  marginBottom: 8, paddingLeft: 2,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {fmtDate(date)}
                  {!mineOnly && (
                    <span style={{ fontWeight: 400 }}>
                      · {items.length} préparation{items.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {items.map(b => <BrouillonCard key={b.id} brouillon={b} onRefresh={load} />)}
              </div>
            );
          })}

          {staleDatesCount > 0 && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}
              onClick={() => setShowAll(s => !s)}
            >
              {showAll
                ? '↑ Masquer les anciennes préparations non soumises'
                : `↓ Afficher ${staleDatesCount} semaine${staleDatesCount > 1 ? 's' : ''} sans préparation`}
            </button>
          )}
        </>
      )}

      {/* FAB — mobile only */}
      <FabCreate
        fabRef={fabRef} fabOpen={fabOpen} setFabOpen={setFabOpen}
        selectedDate={selectedDate} setSelectedDate={setSelectedDate}
        onCreate={handleCreate} creating={creating}
      />
    </div>
  );
}

interface FabProps {
  fabRef: React.RefObject<HTMLDivElement>;
  fabOpen: boolean;
  setFabOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  selectedDate: string;
  setSelectedDate: (v: string) => void;
  onCreate: (date: string) => void;
  creating: boolean;
}

function FabCreate({ fabRef, fabOpen, setFabOpen, selectedDate, setSelectedDate, onCreate, creating }: FabProps) {
  return (
    <div ref={fabRef}>
      {fabOpen && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(var(--bottom-nav-h) + env(safe-area-inset-bottom, 0px) + 78px)',
          right: 18,
          background: 'var(--surface)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: '14px 16px',
          zIndex: 50,
          minWidth: 230,
          border: '1px solid var(--border)',
        }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Date du dimanche</div>
          <input
            type="date"
            className="field"
            style={{ fontSize: 13, marginBottom: 10 }}
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => onCreate(selectedDate)}
            disabled={creating}
          >
            {creating ? <Spinner size={14} /> : 'Créer la préparation'}
          </button>
        </div>
      )}
      <button
        className="fab"
        onClick={() => setFabOpen(o => !o)}
        aria-label={fabOpen ? 'Fermer' : 'Créer une préparation'}
      >
        <span style={{
          display: 'inline-block',
          transform: fabOpen ? 'rotate(45deg)' : 'none',
          transition: 'transform 0.2s',
          fontSize: 24, lineHeight: 1,
        }}>+</span>
      </button>
    </div>
  );
}

function IcoFileEmpty() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="13" x2="15" y2="13"/>
      <line x1="9" y1="17" x2="12" y2="17"/>
    </svg>
  );
}
function IcoAlertCircle() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}
