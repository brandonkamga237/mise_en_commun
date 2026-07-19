import { useEffect, useState } from 'react';
import { getUtilisateurs, getPresence, savePresence, getPresenceDates, getStatsParticipation } from '../api/client';
import { useAuthStore } from '../store/auth';
import { Spinner } from '../components/ui/Spinner';
import { Avatar } from '../components/ui/Avatar';
import { Skeleton } from '../components/ui/Skeleton';
import type { User, Presence, PresenceStat, StatutPresence } from '../types';
import toast from 'react-hot-toast';

function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function prevWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00'); d.setDate(d.getDate() - 7); return localDateStr(d);
}
function nextWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00'); d.setDate(d.getDate() + 7); return localDateStr(d);
}
function lastSaturday(): string {
  const d = new Date();
  const day = d.getDay();
  const offset = day === 6 ? 0 : (day + 1);
  d.setDate(d.getDate() - offset);
  return localDateStr(d);
}
function isInFuture(dateStr: string): boolean {
  return new Date(dateStr + 'T00:00:00') > new Date(localDateStr() + 'T00:00:00');
}

type StatutOption = { value: StatutPresence; label: string; short: string; color: string; bg: string; border: string };
const OPTIONS: StatutOption[] = [
  { value: 'present', label: 'Présent', short: 'P', color: 'var(--success-text)', bg: 'var(--success-soft)', border: 'var(--success)' },
  { value: 'excuse',  label: 'Excusé',  short: 'E', color: 'var(--warning-text)', bg: 'var(--warning-soft)', border: 'var(--warning)' },
  { value: 'absent',  label: 'Absent',  short: 'A', color: 'var(--danger-text)',  bg: 'var(--danger-soft)',  border: 'var(--danger)' },
];

type Tab = 'saisie' | 'stats';

export default function PresencePage() {
  const { user } = useAuthStore();
  const isResp = user?.role === 'responsable' || user?.role === 'admin';

  const [tab, setTab] = useState<Tab>('saisie');
  const [users, setUsers] = useState<User[]>([]);
  const [presences, setPresences] = useState<Record<number, StatutPresence>>({});
  const [date, setDate] = useState(lastSaturday());
  const [enregistreeDates, setEnregistreeDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [stats, setStats] = useState<PresenceStat[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [anneeStats, setAnneeStats] = useState<number>(new Date().getFullYear());

  const load = async () => {
    setLoading(true);
    try {
      const [allUsers, pres, dates] = await Promise.all([
        getUtilisateurs(), getPresence(date), getPresenceDates(),
      ]);
      setUsers(allUsers.filter(u => u.role !== 'admin'));
      setEnregistreeDates(dates);
      const map: Record<number, StatutPresence> = {};
      pres.forEach((p: Presence) => { map[p.user.id] = p.statut; });
      setPresences(map);
    } finally { setLoading(false); }
  };

  const loadStats = async () => {
    setLoadingStats(true);
    try { setStats(await getStatsParticipation({ annee: anneeStats })); }
    finally { setLoadingStats(false); }
  };

  useEffect(() => { load(); }, [date]);
  useEffect(() => { if (tab === 'stats') loadStats(); }, [tab, anneeStats]);

  const toggle = (userId: number, statut: StatutPresence) => {
    if (!isResp) return;
    setPresences(prev => (prev[userId] === statut ? prev : { ...prev, [userId]: statut }));
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const list = users.map(u => ({ user_id: u.id, statut: presences[u.id] ?? 'absent' }));
      await savePresence(date, list);
      toast.success('Présence enregistrée.');
      setEnregistreeDates(await getPresenceDates());
    } catch {} finally { setSaving(false); }
  };

  const today = localDateStr();
  const canGoNext = nextWeek(date) <= today;
  const isEnregistree = enregistreeDates.includes(date);

  const nbPresent = users.filter(u => presences[u.id] === 'present').length;
  const nbExcuse  = users.filter(u => presences[u.id] === 'excuse').length;
  const nbAbsent  = users.filter(u => presences[u.id] === 'absent').length;
  const nbNonSaisi = users.filter(u => !presences[u.id]).length;

  const anneesDispos = [...new Set(enregistreeDates.map(d => new Date(d + 'T00:00:00').getFullYear()))].sort((a, b) => b - a);

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--fg-primary)', margin: 0 }}>
          Présence
        </h1>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 3 }}>Répétition du samedi</p>
      </div>

      <div className="tab-bar" style={{ marginBottom: 20 }}>
        <div className={`tab-item${tab === 'saisie' ? ' active' : ''}`} onClick={() => setTab('saisie')} role="tab" aria-selected={tab === 'saisie'}>Saisie</div>
        <div className={`tab-item${tab === 'stats' ? ' active' : ''}`} onClick={() => setTab('stats')} role="tab" aria-selected={tab === 'stats'}>Statistiques</div>
      </div>

      {tab === 'saisie' && (
        <>
          {/* Navigation date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <button className="icon-btn press" onClick={() => setDate(prevWeek(date))} aria-label="Samedi précédent"
              style={{ border: '1px solid var(--border-strong)', background: 'var(--surface)' }}>
              <IcoChevronLeft />
            </button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--fg-primary)' }}>
                {new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              {isEnregistree && (
                <span className="chip" style={{ marginTop: 4, background: 'var(--success-soft)', color: 'var(--success-text)', borderColor: 'var(--success-border)' }}>
                  ✓ Enregistrée
                </span>
              )}
            </div>
            <button className="icon-btn press" onClick={() => setDate(nextWeek(date))} disabled={!canGoNext} aria-label="Samedi suivant"
              style={{ border: '1px solid var(--border-strong)', background: 'var(--surface)', opacity: canGoNext ? 1 : 0.4 }}>
              <IcoChevronRight />
            </button>
          </div>

          {isInFuture(date) && (
            <div style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning-border)', borderRadius: 'var(--r-sm)', padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--warning-text)' }}>
              Cette date est dans le futur. Tu peux pré-remplir la présence.
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
                  <Skeleton w={34} h={34} r="50%" />
                  <div style={{ flex: 1 }}><Skeleton w="50%" h={13} /><Skeleton w="30%" h={11} style={{ marginTop: 6 }} /></div>
                  <Skeleton w={150} h={40} r={9} />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Stats rapides */}
              {users.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  <StatTile num={nbPresent} label="Présent" color="var(--success-text)" bg="var(--success-soft)" />
                  <StatTile num={nbExcuse} label="Excusé" color="var(--warning-text)" bg="var(--warning-soft)" />
                  <StatTile num={nbAbsent} label="Absent" color="var(--danger-text)" bg="var(--danger-soft)" />
                  <StatTile num={nbNonSaisi} label="Non saisi" color="var(--text-muted)" bg="var(--surface-sunken)" />
                </div>
              )}

              {/* Liste moniteurs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {users.length === 0 ? (
                  <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
                    Aucun moniteur enregistré.
                  </div>
                ) : (
                  users.map(u => {
                    const statut = presences[u.id];
                    return (
                      <div key={u.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px' }}>
                        <Avatar nom={u.nom} photoUrl={u.photo_url} size={36} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--fg-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {u.prenom ? `${u.prenom} ${u.nom}` : u.nom}
                            </span>
                            {u.role === 'responsable' && (
                              <span title="Responsable" style={{ fontSize: 13, lineHeight: 1, color: 'var(--accent)', flexShrink: 0 }}>★</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11.5, color: statut ? 'var(--fg-muted)' : 'var(--text-faint)' }}>
                            {statut ? OPTIONS.find(o => o.value === statut)?.label : 'Non saisi'}
                          </div>
                        </div>
                        <div className="pea-group" role="group" aria-label={`Présence de ${u.nom}`}>
                          {OPTIONS.map(o => {
                            const on = statut === o.value;
                            return (
                              <button
                                key={o.value}
                                className="pea-btn"
                                onClick={() => toggle(u.id, o.value)}
                                title={o.label}
                                disabled={!isResp}
                                aria-pressed={on}
                                style={on ? { borderColor: o.border, background: o.bg, color: o.color } : undefined}
                              >
                                {o.short}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <p style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginTop: 12, fontStyle: 'italic' }}>
                <strong>P</strong> Présent · <strong>E</strong> Excusé (a prévenu) · <strong>A</strong> Absent · les « non saisi » seront comptés absents à l'enregistrement.
              </p>

              {isResp && users.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <button className="btn btn-primary btn-lg press" onClick={handleSave} disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
                    {saving ? <Spinner size={16} /> : 'Enregistrer la présence'}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {tab === 'stats' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-secondary)' }}>Année :</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(anneesDispos.length > 0 ? anneesDispos : [new Date().getFullYear()]).map(y => (
                <button key={y} onClick={() => setAnneeStats(y)} className={`btn btn-sm press ${anneeStats === y ? 'btn-primary' : 'btn-secondary'}`}>{y}</button>
              ))}
            </div>
          </div>

          {loadingStats ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
                  <Skeleton w={30} h={30} r="50%" /><div style={{ flex: 1 }}><Skeleton w="45%" h={13} /></div><Skeleton w={70} h={12} />
                </div>
              ))}
            </div>
          ) : stats.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ fontSize: 15, color: 'var(--fg-muted)' }}>Aucune donnée de présence pour {anneeStats}.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.map(s => (
                <div key={s.user.id} className="card" style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <Avatar nom={s.user.nom} photoUrl={s.user.photo_url} size={30} />
                    <span style={{ flex: 1, fontWeight: 600, color: 'var(--fg-primary)', fontSize: 14 }}>
                      {s.user.prenom ? `${s.user.prenom} ${s.user.nom}` : s.user.nom}
                    </span>
                    {s.user.role === 'responsable' && <span title="Responsable" style={{ fontSize: 12, color: 'var(--accent)' }}>★</span>}
                    <TauxPill taux={s.taux} total={s.nb_total} />
                  </div>
                  <div style={{ display: 'flex', gap: 14, fontSize: 12.5 }}>
                    <span style={{ color: 'var(--success-text)', fontWeight: 600 }}>{s.nb_present} présent{s.nb_present !== 1 ? 's' : ''}</span>
                    <span style={{ color: 'var(--warning-text)', fontWeight: 600 }}>{s.nb_excuse} excusé{s.nb_excuse !== 1 ? 's' : ''}</span>
                    <span style={{ color: 'var(--danger-text)', fontWeight: 600 }}>{s.nb_absent} absent{s.nb_absent !== 1 ? 's' : ''}</span>
                  </div>
                  <TauxBar taux={s.taux} total={s.nb_total} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatTile({ num, label, color, bg }: { num: number; label: string; color: string; bg: string }) {
  return (
    <div className="stat-tile" style={{ background: bg }}>
      <div className="stat-tile-num" style={{ color }}>{num}</div>
      <div className="stat-tile-lbl" style={{ color }}>{label}</div>
    </div>
  );
}

function TauxPill({ taux, total }: { taux: number; total: number }) {
  const color = taux >= 75 ? 'var(--success-text)' : taux >= 50 ? 'var(--warning-text)' : 'var(--danger-text)';
  const bg = taux >= 75 ? 'var(--success-soft)' : taux >= 50 ? 'var(--warning-soft)' : 'var(--danger-soft)';
  return (
    <span className="chip" style={{ background: bg, color, borderColor: 'transparent', fontWeight: 700 }}>
      {total > 0 ? `${taux}%` : '—'}
    </span>
  );
}

function TauxBar({ taux, total }: { taux: number; total: number }) {
  const color = taux >= 75 ? 'var(--success)' : taux >= 50 ? 'var(--warning)' : 'var(--danger)';
  return (
    <div style={{ marginTop: 10, height: 6, background: 'var(--surface-sunken)', borderRadius: 99, overflow: 'hidden' }} role="progressbar" aria-valuenow={taux} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ height: '100%', width: `${total > 0 ? taux : 0}%`, background: color, borderRadius: 99, transition: 'width 300ms ease' }} />
    </div>
  );
}

function IcoChevronLeft() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
}
function IcoChevronRight() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
}
