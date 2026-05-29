import { useEffect, useState } from 'react';
import { getCatalogueChants } from '../api/client';
import { Spinner } from '../components/ui/Spinner';
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
        <h1 style={{ fontFamily: 'Lora, serif', fontSize: 22, fontWeight: 600, color: 'var(--fg-primary)', margin: 0 }}>
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
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner size={32} />
        </div>
      ) : chants.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 14, color: 'var(--fg-muted)' }}>
            Aucun chant pour « {debouncedQuery} »
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--brand-navy)', color: '#FDFAF7' }}>
                <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, fontSize: 11, width: 52 }}>N°</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11 }}>Titre</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, fontSize: 11, width: 80 }}>Utilisations</th>
              </tr>
            </thead>
            <tbody>
              {chants.map((c, i) => (
                <tr
                  key={c.id}
                  style={{
                    background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-page)',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)',
                      background: 'var(--brand-stone)', padding: '2px 6px',
                      borderRadius: 4, fontFamily: 'monospace',
                    }}>
                      {c.numero}
                    </span>
                  </td>
                  <td style={{ padding: '9px 12px', color: 'var(--fg-primary)', fontWeight: 500 }}>
                    {c.titre}
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                    {c.nb_utilisations > 0 ? (
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: c.nb_utilisations >= 3 ? '#16A34A' : 'var(--fg-secondary)',
                        background: c.nb_utilisations >= 3 ? '#DCFCE7' : 'var(--brand-stone)',
                        padding: '2px 7px', borderRadius: 99,
                      }}>
                        ×{c.nb_utilisations}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
