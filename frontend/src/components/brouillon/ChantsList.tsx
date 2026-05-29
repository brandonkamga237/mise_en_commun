import { useState, useEffect, useRef } from 'react';
import { addChant, deleteChant, updateChant, reorderChants, getCatalogueChants } from '../../api/client';
import { ConfirmModal } from '../ui/ConfirmModal';
import type { Brouillon, Chant, Etape, CatalogueChant } from '../../types';
import { ETAPES_LABELS } from '../../types';
import toast from 'react-hot-toast';

const ETAPES = Object.keys(ETAPES_LABELS) as Etape[];

interface ChantsListProps {
  brouillon: Brouillon;
  canEdit: boolean;
  onRefresh: () => void;
}

export function ChantsList({ brouillon, canEdit, onRefresh }: ChantsListProps) {
  const [adding, setAdding] = useState(false);
  const [newTitre, setNewTitre] = useState('');
  const [newEtape, setNewEtape] = useState<Etape>('salutation');
  const [saving, setSaving] = useState(false);
  const [chantASupprimer, setChantASupprimer] = useState<Chant | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [moving, setMoving] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<CatalogueChant[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sorted = [...brouillon.chants].sort((a, b) => a.ordre - b.ordre);

  // Fermer suggestions si clic en dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Recherche dans le catalogue avec debounce
  useEffect(() => {
    if (!adding) return;
    const t = setTimeout(async () => {
      const results = await getCatalogueChants(newTitre || undefined);
      setSuggestions(results);
      setShowSuggestions(true);
    }, 200);
    return () => clearTimeout(t);
  }, [newTitre, adding]);

  const handleAdd = async () => {
    if (!newTitre.trim()) return;
    setSaving(true);
    try {
      await addChant(brouillon.id, {
        titre: newTitre.trim(),
        etape: newEtape,
        ordre: sorted.length + 1,
      });
      setNewTitre('');
      setNewEtape('salutation');
      setAdding(false);
      setSuggestions([]);
      onRefresh();
    } catch {} finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!chantASupprimer) return;
    setDeleting(true);
    try {
      await deleteChant(brouillon.id, chantASupprimer.id);
      toast.success('Chant supprimé.');
      setChantASupprimer(null);
      onRefresh();
    } catch {} finally { setDeleting(false); }
  };

  const handleMove = async (chantId: number, direction: 'up' | 'down') => {
    const idx = sorted.findIndex(c => c.id === chantId);
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sorted.length - 1) return;
    const newOrder = [...sorted];
    const swap = direction === 'up' ? idx - 1 : idx + 1;
    [newOrder[idx], newOrder[swap]] = [newOrder[swap], newOrder[idx]];
    setMoving(chantId);
    try {
      await reorderChants(brouillon.id, newOrder.map(c => c.id));
      onRefresh();
    } catch {} finally { setMoving(null); }
  };

  const selectSuggestion = (s: CatalogueChant) => {
    setNewTitre(s.titre);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div>
      {sorted.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 12 }}>
          Aucun chant renseigné.
        </p>
      )}

      {sorted.length > 0 && (
        <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--brand-navy)', color: '#FDFAF7' }}>
                <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, fontSize: 11, width: 36 }}>#</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, width: 160 }}>Étape</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11 }}>Titre du chant</th>
                {canEdit && <th style={{ width: 80 }} />}
              </tr>
            </thead>
            <tbody>
              {sorted.map((chant, i) => (
                <ChantRow
                  key={chant.id}
                  chant={chant}
                  idx={i}
                  total={sorted.length}
                  brouillonId={brouillon.id}
                  canEdit={canEdit}
                  onDelete={() => setChantASupprimer(chant)}
                  onMoveUp={() => handleMove(chant.id, 'up')}
                  onMoveDown={() => handleMove(chant.id, 'down')}
                  onRefresh={onRefresh}
                  bg={i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-page)'}
                  isMoving={moving === chant.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canEdit && !adding && (
        <button className="btn btn-secondary btn-sm" onClick={() => setAdding(true)}>
          + Ajouter un chant
        </button>
      )}

      {canEdit && adding && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <select
              className="field"
              style={{ width: 'auto', fontSize: 13, flexShrink: 0 }}
              value={newEtape}
              onChange={e => setNewEtape(e.target.value as Etape)}
            >
              {ETAPES.map(e => <option key={e} value={e}>{ETAPES_LABELS[e]}</option>)}
            </select>

            {/* Input avec suggestions */}
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <input
                ref={inputRef}
                className="field"
                style={{ width: '100%', fontSize: 13 }}
                placeholder="Rechercher par titre ou numéro…"
                value={newTitre}
                onChange={e => { setNewTitre(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAdd();
                  if (e.key === 'Escape') { setAdding(false); setShowSuggestions(false); }
                }}
                autoFocus
              />

              {/* Dropdown suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: 'var(--bg-card)', border: '1px solid var(--border-medium)',
                    borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    maxHeight: 220, overflowY: 'auto', marginTop: 4,
                  }}
                >
                  {suggestions.map(s => (
                    <div
                      key={s.id}
                      onMouseDown={e => { e.preventDefault(); selectSuggestion(s); }}
                      style={{
                        padding: '8px 12px', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border-subtle)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-page)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: 'var(--fg-muted)',
                        background: 'var(--brand-stone)', padding: '1px 5px',
                        borderRadius: 4, flexShrink: 0, minWidth: 28, textAlign: 'center',
                      }}>
                        {s.numero}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--fg-primary)', flex: 1 }}>
                        {s.titre}
                      </span>
                      {s.nb_utilisations > 0 && (
                        <span style={{ fontSize: 10, color: 'var(--fg-muted)', flexShrink: 0 }}>
                          ×{s.nb_utilisations}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={saving || !newTitre.trim()}>
                Ajouter
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setShowSuggestions(false); }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {chantASupprimer && (
        <ConfirmModal
          title="Supprimer le chant"
          message={<>Supprimer <strong>« {chantASupprimer.titre} »</strong> de la liste ?</>}
          confirmLabel="Supprimer"
          variant="danger"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setChantASupprimer(null)}
        />
      )}
    </div>
  );
}

interface ChantRowProps {
  chant: Chant;
  idx: number;
  total: number;
  brouillonId: number;
  canEdit: boolean;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRefresh: () => void;
  bg: string;
  isMoving: boolean;
}

function ChantRow({ chant, idx, total, brouillonId, canEdit, onDelete, onMoveUp, onMoveDown, onRefresh, bg, isMoving }: ChantRowProps) {
  const [editing, setEditing] = useState(false);
  const [titre, setTitre] = useState(chant.titre);
  const [etape, setEtape] = useState<Etape>(chant.etape);
  const [suggestions, setSuggestions] = useState<CatalogueChant[]>([]);
  const [showSug, setShowSug] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const editSugRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing) return;
    const handler = (e: MouseEvent) => {
      if (editSugRef.current && !editSugRef.current.contains(e.target as Node) &&
          editInputRef.current && !editInputRef.current.contains(e.target as Node)) {
        setShowSug(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editing]);

  useEffect(() => {
    if (!editing) return;
    const t = setTimeout(async () => {
      const results = await getCatalogueChants(titre || undefined);
      setSuggestions(results);
      setShowSug(true);
    }, 200);
    return () => clearTimeout(t);
  }, [titre, editing]);

  const save = async () => {
    try {
      await updateChant(brouillonId, chant.id, { titre: titre.trim(), etape });
      setEditing(false);
      setShowSug(false);
      onRefresh();
    } catch {}
  };

  const btnStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--fg-muted)', padding: '2px 4px',
    opacity: isMoving ? 0.4 : 1,
  };

  if (editing) {
    return (
      <tr style={{ background: '#FFFBEB' }}>
        <td style={{ padding: '6px 10px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 11, fontWeight: 700 }}>
          {idx + 1}
        </td>
        <td style={{ padding: '6px 8px' }}>
          <select className="field" style={{ fontSize: 12, padding: '4px 6px' }}
            value={etape} onChange={e => setEtape(e.target.value as Etape)}>
            {ETAPES.map(e => <option key={e} value={e}>{ETAPES_LABELS[e]}</option>)}
          </select>
        </td>
        <td style={{ padding: '6px 8px', position: 'relative' }}>
          <input
            ref={editInputRef}
            className="field" style={{ fontSize: 12, padding: '4px 6px', width: '100%' }}
            value={titre} onChange={e => { setTitre(e.target.value); setShowSug(true); }}
            onFocus={() => setShowSug(true)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setShowSug(false); } }}
            autoFocus
          />
          {showSug && suggestions.length > 0 && (
            <div ref={editSugRef} style={{
              position: 'absolute', top: '100%', left: 8, right: 8, zIndex: 100,
              background: 'var(--bg-card)', border: '1px solid var(--border-medium)',
              borderRadius: 6, boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
              maxHeight: 180, overflowY: 'auto', marginTop: 2,
            }}>
              {suggestions.map(s => (
                <div key={s.id} onMouseDown={e => { e.preventDefault(); setTitre(s.titre); setShowSug(false); }}
                  style={{ padding: '6px 10px', cursor: 'pointer', display: 'flex', gap: 8, fontSize: 12,
                    borderBottom: '1px solid var(--border-subtle)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-page)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-muted)', background: 'var(--brand-stone)', padding: '1px 4px', borderRadius: 3 }}>{s.numero}</span>
                  <span>{s.titre}</span>
                </div>
              ))}
            </div>
          )}
        </td>
        <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
          <button className="btn btn-primary btn-sm" onClick={save} style={{ marginRight: 4 }}>OK</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setShowSug(false); }}>✕</button>
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ background: bg, opacity: isMoving ? 0.6 : 1, transition: 'opacity 150ms' }}>
      <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 11, fontWeight: 700 }}>
        {idx + 1}
      </td>
      <td style={{ padding: '8px 12px', color: 'var(--fg-secondary)', fontSize: 12 }}>
        {ETAPES_LABELS[chant.etape] ?? chant.etape}
      </td>
      <td style={{ padding: '8px 12px', color: 'var(--fg-primary)' }}>{chant.titre}</td>
      {canEdit && (
        <td style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>
          <button onClick={onMoveUp} disabled={idx === 0 || isMoving} title="Monter" style={{ ...btnStyle, opacity: idx === 0 ? 0.2 : 1 }}>
            <IcoUp />
          </button>
          <button onClick={onMoveDown} disabled={idx === total - 1 || isMoving} title="Descendre" style={{ ...btnStyle, opacity: idx === total - 1 ? 0.2 : 1 }}>
            <IcoDown />
          </button>
          <button onClick={() => setEditing(true)} title="Modifier" style={btnStyle}>
            <IcoEdit />
          </button>
          <button onClick={onDelete} title="Supprimer" style={{ ...btnStyle, color: '#DC2626' }}>
            <IcoTrash />
          </button>
        </td>
      )}
    </tr>
  );
}

function IcoUp() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 8 6 4 10 8"/></svg>;
}
function IcoDown() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 4 6 8 10 4"/></svg>;
}
function IcoEdit() {
  return <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M11 2l3 3-9 9H2v-3L11 2z"/></svg>;
}
function IcoTrash() {
  return <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><polyline points="3 6 4 14 12 14 13 6"/><path d="M2 4h12"/><path d="M7 4V2h2v2"/></svg>;
}
