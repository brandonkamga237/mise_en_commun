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
      await addChant(brouillon.id, { titre: newTitre.trim(), etape: newEtape, ordre: sorted.length + 1 });
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
      {sorted.length === 0 && !adding && (
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 12, fontStyle: 'italic' }}>
          Aucun chant renseigné.
        </p>
      )}

      {sorted.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
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
              isMoving={moving === chant.id}
            />
          ))}
        </div>
      )}

      {canEdit && !adding && (
        <button className="btn btn-secondary btn-sm press" onClick={() => setAdding(true)}>
          + Ajouter un chant
        </button>
      )}

      {canEdit && adding && (
        <div style={{
          border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
          padding: 12, background: 'var(--surface-2)', marginTop: 4,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <select
              className="field"
              value={newEtape}
              onChange={e => setNewEtape(e.target.value as Etape)}
            >
              {ETAPES.map(e => <option key={e} value={e}>{ETAPES_LABELS[e]}</option>)}
            </select>

            <div style={{ position: 'relative' }}>
              <input
                ref={inputRef}
                className="field"
                style={{ width: '100%' }}
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
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: 'var(--surface)', border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-lg)',
                    maxHeight: 240, overflowY: 'auto', marginTop: 4,
                  }}
                >
                  {suggestions.map(s => (
                    <div
                      key={s.id}
                      onMouseDown={e => { e.preventDefault(); selectSuggestion(s); }}
                      style={{
                        padding: '10px 12px', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border-subtle)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: 'var(--fg-muted)',
                        background: 'var(--surface-sunken)', padding: '2px 6px',
                        borderRadius: 5, flexShrink: 0, minWidth: 28, textAlign: 'center',
                      }}>
                        {s.numero}
                      </span>
                      <span style={{ fontSize: 13.5, color: 'var(--fg-primary)', flex: 1 }}>{s.titre}</span>
                      {s.nb_utilisations > 0 && (
                        <span style={{ fontSize: 10, color: 'var(--fg-muted)', flexShrink: 0 }}>×{s.nb_utilisations}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm press" onClick={handleAdd} disabled={saving || !newTitre.trim()} style={{ flex: 1 }}>
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
  isMoving: boolean;
}

function ChantRow({ chant, idx, total, brouillonId, canEdit, onDelete, onMoveUp, onMoveDown, onRefresh, isMoving }: ChantRowProps) {
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

  if (editing) {
    return (
      <div style={{
        border: '1px solid var(--warning-border)', borderRadius: 'var(--r-md)',
        padding: 12, background: 'var(--warning-soft)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <select className="field" value={etape} onChange={e => setEtape(e.target.value as Etape)}>
            {ETAPES.map(e => <option key={e} value={e}>{ETAPES_LABELS[e]}</option>)}
          </select>
          <div style={{ position: 'relative' }}>
            <input
              ref={editInputRef}
              className="field" style={{ width: '100%' }}
              value={titre} onChange={e => { setTitre(e.target.value); setShowSug(true); }}
              onFocus={() => setShowSug(true)}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setShowSug(false); } }}
              autoFocus
            />
            {showSug && suggestions.length > 0 && (
              <div ref={editSugRef} style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                background: 'var(--surface)', border: '1px solid var(--border-medium)',
                borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-lg)',
                maxHeight: 200, overflowY: 'auto', marginTop: 4,
              }}>
                {suggestions.map(s => (
                  <div key={s.id} onMouseDown={e => { e.preventDefault(); setTitre(s.titre); setShowSug(false); }}
                    style={{ padding: '9px 11px', cursor: 'pointer', display: 'flex', gap: 8, fontSize: 13,
                      borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-muted)', background: 'var(--surface-sunken)', padding: '2px 5px', borderRadius: 4 }}>{s.numero}</span>
                    <span>{s.titre}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm press" onClick={save} style={{ flex: 1 }}>Enregistrer</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setShowSug(false); }}>Annuler</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)', padding: '10px 10px 10px 12px',
      opacity: isMoving ? 0.55 : 1, transition: 'opacity 150ms ease',
    }}>
      <span style={{
        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
        background: 'var(--primary-soft)', color: 'var(--primary-hover)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700,
      }}>{idx + 1}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--fg-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {chant.titre}
        </div>
        <span className="chip" style={{ marginTop: 4, fontSize: 11, padding: '2px 8px' }}>
          {ETAPES_LABELS[chant.etape] ?? chant.etape}
        </span>
      </div>

      {canEdit && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          <button className="icon-btn" onClick={onMoveUp} disabled={idx === 0 || isMoving} title="Monter"
            style={{ width: 34, height: 34, opacity: idx === 0 ? 0.25 : 1 }}>
            <IcoUp />
          </button>
          <button className="icon-btn" onClick={onMoveDown} disabled={idx === total - 1 || isMoving} title="Descendre"
            style={{ width: 34, height: 34, opacity: idx === total - 1 ? 0.25 : 1 }}>
            <IcoDown />
          </button>
          <button className="icon-btn" onClick={() => setEditing(true)} title="Modifier" style={{ width: 34, height: 34 }}>
            <IcoEdit />
          </button>
          <button className="icon-btn" onClick={onDelete} title="Supprimer" style={{ width: 34, height: 34, color: 'var(--danger)' }}>
            <IcoTrash />
          </button>
        </div>
      )}
    </div>
  );
}

function IcoUp() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 15 12 9 18 15"/></svg>;
}
function IcoDown() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
}
function IcoEdit() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
}
function IcoTrash() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>;
}
