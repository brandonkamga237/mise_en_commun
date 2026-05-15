import type { StatutBrouillon } from '../../types';

const MAP: Record<StatutBrouillon, { label: string; cls: string; icon: React.ReactNode }> = {
  en_revision:    { label: 'En révision', cls: 'pill-revision',  icon: <IcoDot /> },
  officiel:       { label: 'Validé',      cls: 'pill-officiel',  icon: <IcoCheck /> },
  // États résiduels (ne devraient plus apparaître avec les nouvelles règles)
  cree:           { label: 'En révision', cls: 'pill-revision',  icon: <IcoDot /> },
  candidat_final: { label: 'En révision', cls: 'pill-revision',  icon: <IcoDot /> },
  archive:        { label: 'Archivé',     cls: 'pill-archive',   icon: <IcoDot /> },
};

interface StatusPillProps {
  statut: StatutBrouillon;
}

export function StatusPill({ statut }: StatusPillProps) {
  const { label, cls, icon } = MAP[statut] ?? MAP.en_revision;
  return (
    <span
      className={cls}
      role="status"
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      {label}
    </span>
  );
}

function IcoDot() {
  return <svg width="7" height="7" viewBox="0 0 10 10" fill="currentColor"><circle cx="5" cy="5" r="3.5"/></svg>;
}
function IcoCheck() {
  return <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3"/></svg>;
}
