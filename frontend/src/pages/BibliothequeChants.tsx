import { useEffect, useState } from 'react';
import { getCatalogueChants } from '../api/client';
import { Spinner } from '../components/ui/Spinner';
import { Skeleton } from '../components/ui/Skeleton';
import type { CatalogueChant } from '../types';

export default function BibliothequeChants() {
  const [chants, setChants] = useState<CatalogueChant[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const isSearching = query !== debouncedQuery;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getCatalogueChants(debouncedQuery || undefined);
        setChants(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [debouncedQuery]);

  const total = chants.reduce((s, c) => s + c.nb_utilisations, 0);

  return (
    <div className="page-wrapper">
      {/* En-tête */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--fg-primary)', margin: 0 }}>
          Bibliothèque des chants
        </h1>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>
          Répertoire EEC — Culte d'enfants · {chants.length} chant{chants.length !== 1 ? 's' : ''}
          {total > 0 && ` · ${total} utilisation${total !== 1 ? 's' : ''} au total`}
        </p>
      </div>

      {/* Barre de recherche */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)', pointerEvents: 'none' }}>
          {isSearching ? <Spinner size={14} /> : <IcoSearch />}
        </span>
        <input
          className="field"
          style={{ paddingLeft: 36, fontSize: 14 }}
          placeholder="Rechercher par titre ou numéro (ex: 45, CHRIST, JESUS)…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {/* Liste */}
      {loading ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < 7 ? '1px solid var(--border-subtle)' : 'none' }}>
              <Skeleton w={34} h={22} r={6} />
              <Skeleton w={`${40 + (i % 4) * 12}%`} h={13} />
            </div>
          ))}
        </div>
      ) : chants.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><IcoSearch /></div>
          <p style={{ fontSize: 14, color: 'var(--fg-muted)' }}>
            Aucun chant pour « {debouncedQuery} »
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {chants.map((c, i) => (
            <div
              key={c.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px',
                borderBottom: i < chants.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              }}
            >
              <span style={{
                fontSize: 12, fontWeight: 700, color: 'var(--primary-hover)',
                background: 'var(--primary-soft)', padding: '3px 8px',
                borderRadius: 6, fontFamily: 'monospace', minWidth: 34, textAlign: 'center', flexShrink: 0,
              }}>
                {c.numero}
              </span>
              <span style={{ flex: 1, minWidth: 0, color: 'var(--fg-primary)', fontWeight: 500, fontSize: 14.5 }}>
                {c.titre}
              </span>
              {c.nb_utilisations > 0 && (
                <span className="chip" style={{
                  flexShrink: 0,
                  color: c.nb_utilisations >= 3 ? 'var(--success-text)' : 'var(--text-muted)',
                  background: c.nb_utilisations >= 3 ? 'var(--success-soft)' : 'var(--surface-sunken)',
                  borderColor: 'transparent', fontWeight: 700,
                }}>
                  ×{c.nb_utilisations}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IcoSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
