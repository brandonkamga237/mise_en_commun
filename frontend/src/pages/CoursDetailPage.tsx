import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getCoursDetail, updateCours, deleteCours,
  createLecon, updateLecon, deleteLecon, downloadCoursPdf,
} from '../api/client';
import { useAuthStore } from '../store/auth';
import { Spinner } from '../components/ui/Spinner';
import { RichEditor } from '../components/formation/RichEditor';
import toast from 'react-hot-toast';
import type { CoursDetail, Lecon } from '../types';

export default function CoursDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isResp = user?.role === 'responsable' || user?.role === 'admin';

  const [cours, setCours] = useState<CoursDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLecon, setSelectedLecon] = useState<Lecon | null>(null);

  // Edition cours
  const [editingCours, setEditingCours] = useState(false);
  const [coursTitre, setCoursTitre] = useState('');
  const [coursDesc, setCoursDesc] = useState('');
  const [savingCours, setSavingCours] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!cours) return;
    setDownloading(true);
    try {
      await downloadCoursPdf(cours.id, cours.titre);
    } catch {
      toast.error('Téléchargement impossible.');
    } finally {
      setDownloading(false);
    }
  };

  // Nouvelle leçon
  const [showNewLecon, setShowNewLecon] = useState(false);
  const [newLeconTitre, setNewLeconTitre] = useState('');
  const [savingLecon, setSavingLecon] = useState(false);

  // Edition leçon
  const [editingLeconId, setEditingLeconId] = useState<number | null>(null);
  const [editLeconTitre, setEditLeconTitre] = useState('');
  const [editLeconContenu, setEditLeconContenu] = useState('');
  const [editLeconDuree, setEditLeconDuree] = useState('');
  const [savingLeconEdit, setSavingLeconEdit] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getCoursDetail(Number(id));
      setCours(data);
      if (data.lecons.length > 0 && !selectedLecon) {
        setSelectedLecon(data.lecons[0]);
      }
    } catch {
      navigate('/formation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleTogglePublie = async () => {
    if (!cours) return;
    try {
      const updated = await updateCours(cours.id, { publie: !cours.publie });
      setCours(prev => prev ? { ...prev, publie: updated.publie } : prev);
      toast.success(updated.publie ? 'Cours publié.' : 'Cours dépublié.');
    } catch {}
  };

  const handleSaveCours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cours) return;
    setSavingCours(true);
    try {
      await updateCours(cours.id, { titre: coursTitre, description: coursDesc || undefined });
      setCours(prev => prev ? { ...prev, titre: coursTitre, description: coursDesc || null } : prev);
      setEditingCours(false);
      toast.success('Cours mis à jour.');
    } catch {} finally {
      setSavingCours(false);
    }
  };

  const handleDeleteCours = async () => {
    if (!cours || !window.confirm(`Supprimer définitivement "${cours.titre}" et toutes ses leçons ?`)) return;
    try {
      await deleteCours(cours.id);
      toast.success('Cours supprimé.');
      navigate('/formation');
    } catch {}
  };

  const handleCreateLecon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cours || !newLeconTitre.trim()) return;
    setSavingLecon(true);
    try {
      const lecon = await createLecon(cours.id, { titre: newLeconTitre.trim() });
      const updated = { ...cours, lecons: [...cours.lecons, lecon], nb_lecons: cours.nb_lecons + 1 };
      setCours(updated);
      setNewLeconTitre('');
      setShowNewLecon(false);
      setSelectedLecon(lecon);
      setEditingLeconId(lecon.id);
      setEditLeconTitre(lecon.titre);
      setEditLeconContenu(lecon.contenu ?? '');
      setEditLeconDuree(lecon.duree_minutes?.toString() ?? '');
      toast.success('Leçon créée. Ajoutez le contenu ci-dessous.');
    } catch {} finally {
      setSavingLecon(false);
    }
  };

  const startEditLecon = (lecon: Lecon) => {
    setEditingLeconId(lecon.id);
    setEditLeconTitre(lecon.titre);
    setEditLeconContenu(lecon.contenu ?? '');
    setEditLeconDuree(lecon.duree_minutes?.toString() ?? '');
  };

  const handleSaveLecon = async () => {
    if (!cours || !editingLeconId) return;
    setSavingLeconEdit(true);
    try {
      const updated = await updateLecon(cours.id, editingLeconId, {
        titre: editLeconTitre,
        contenu: editLeconContenu,
        duree_minutes: editLeconDuree ? parseInt(editLeconDuree) : undefined,
      });
      const newLecons = cours.lecons.map(l => l.id === editingLeconId ? updated : l);
      setCours({ ...cours, lecons: newLecons });
      setSelectedLecon(updated);
      setEditingLeconId(null);
      toast.success('Leçon enregistrée.');
    } catch {} finally {
      setSavingLeconEdit(false);
    }
  };

  const handleDeleteLecon = async (lecon: Lecon) => {
    if (!cours || !window.confirm(`Supprimer la leçon "${lecon.titre}" ?`)) return;
    try {
      await deleteLecon(cours.id, lecon.id);
      const newLecons = cours.lecons.filter(l => l.id !== lecon.id);
      setCours({ ...cours, lecons: newLecons, nb_lecons: cours.nb_lecons - 1 });
      if (selectedLecon?.id === lecon.id) setSelectedLecon(newLecons[0] ?? null);
      toast.success('Leçon supprimée.');
    } catch {}
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60dvh' }}>
      <Spinner size={32} />
    </div>
  );

  if (!cours) return null;

  const isEditingThisLecon = editingLeconId !== null;

  return (
    <div className="page-wrapper" style={{ maxWidth: 900 }}>
      {/* En-tête cours */}
      <div style={{ marginBottom: 24 }}>
        {!editingCours ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--fg-primary)', margin: 0 }}>
                  {cours.titre}
                </h1>
                {!cours.publie && (
                  <span className="chip" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: 'var(--warning-soft)', color: 'var(--warning-text)', borderColor: 'var(--warning-border)', whiteSpace: 'nowrap' }}>
                    Brouillon
                  </span>
                )}
              </div>
              {cours.description && (
                <p style={{ fontSize: 13.5, color: 'var(--fg-muted)', margin: 0 }}>{cours.description}</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm press" onClick={handleDownload} disabled={downloading} title="Télécharger le cours en PDF">
                {downloading ? <Spinner size={12} /> : <><IcoDownload /> PDF</>}
              </button>
              {isResp && (
                <>
                  <button className="btn btn-secondary btn-sm press" onClick={handleTogglePublie} title={cours.publie ? 'Dépublier' : 'Publier'}>
                    {cours.publie ? '● Publié' : '○ Publier'}
                  </button>
                  <button className="btn btn-secondary btn-sm press" onClick={() => { setEditingCours(true); setCoursTitre(cours.titre); setCoursDesc(cours.description ?? ''); }}>
                    Modifier
                  </button>
                  <button className="btn btn-secondary btn-sm press" style={{ color: 'var(--danger)' }} onClick={handleDeleteCours}>
                    Supprimer
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveCours} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input className="field" value={coursTitre} onChange={e => setCoursTitre(e.target.value)} placeholder="Titre du cours" required style={{ fontSize: 16, fontWeight: 600 }} />
            <textarea className="field" value={coursDesc} onChange={e => setCoursDesc(e.target.value)} placeholder="Description (optionnel)" rows={2} style={{ resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingCours(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={savingCours}>
                {savingCours ? <Spinner size={12} /> : 'Enregistrer'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Layout deux colonnes */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Colonne leçons */}
        <div style={{ width: 220, flexShrink: 0, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-secondary)', marginBottom: 10 }}>
            {cours.nb_lecons} leçon{cours.nb_lecons !== 1 ? 's' : ''}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {cours.lecons.map((lecon, i) => (
              <div
                key={lecon.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                  background: selectedLecon?.id === lecon.id ? 'var(--brand-navy)' : 'var(--bg-card)',
                  border: '1px solid',
                  borderColor: selectedLecon?.id === lecon.id ? 'transparent' : 'var(--border-subtle)',
                  transition: 'all 0.15s',
                }}
                onClick={() => { setSelectedLecon(lecon); setEditingLeconId(null); }}
              >
                <span style={{
                  fontSize: 10, fontWeight: 700, minWidth: 20, height: 20,
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: selectedLecon?.id === lecon.id ? 'rgba(255,255,255,0.2)' : 'var(--brand-stone)',
                  color: selectedLecon?.id === lecon.id ? 'white' : 'var(--fg-secondary)',
                }}>
                  {i + 1}
                </span>
                <span style={{
                  flex: 1, fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  color: selectedLecon?.id === lecon.id ? 'white' : 'var(--fg-primary)',
                }}>
                  {lecon.titre}
                </span>
              </div>
            ))}
          </div>

          {isResp && !showNewLecon && (
            <button
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', marginTop: 10, justifyContent: 'center', gap: 4 }}
              onClick={() => setShowNewLecon(true)}
            >
              + Nouvelle leçon
            </button>
          )}

          {isResp && showNewLecon && (
            <form onSubmit={handleCreateLecon} style={{ marginTop: 10 }}>
              <input
                className="field"
                autoFocus
                value={newLeconTitre}
                onChange={e => setNewLeconTitre(e.target.value)}
                placeholder="Titre de la leçon"
                style={{ fontSize: 12, marginBottom: 6 }}
                required
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => { setShowNewLecon(false); setNewLeconTitre(''); }}>
                  ✕
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 2 }} disabled={savingLecon}>
                  {savingLecon ? <Spinner size={11} /> : 'Créer'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Colonne contenu */}
        <div style={{ flex: 1, minWidth: 280 }}>
          {!selectedLecon ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--fg-muted)', fontSize: 13 }}>
              {cours.lecons.length === 0
                ? (isResp ? 'Ajoutez une première leçon avec le bouton ci-contre.' : 'Ce cours ne contient pas encore de leçons.')
                : 'Sélectionnez une leçon pour voir son contenu.'}
            </div>
          ) : (
            <div className="card" style={{ padding: '20px 20px 24px' }}>
              {/* Header leçon */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {isEditingThisLecon && editingLeconId === selectedLecon.id ? (
                    <input
                      className="field"
                      value={editLeconTitre}
                      onChange={e => setEditLeconTitre(e.target.value)}
                      style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}
                      placeholder="Titre de la leçon"
                    />
                  ) : (
                    <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--fg-primary)', margin: 0, marginBottom: 4 }}>
                      {selectedLecon.titre}
                    </h2>
                  )}
                  {selectedLecon.duree_minutes && !isEditingThisLecon && (
                    <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                      <IcoClock /> {selectedLecon.duree_minutes} min
                    </span>
                  )}
                  {isEditingThisLecon && editingLeconId === selectedLecon.id && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ fontSize: 11, color: 'var(--fg-secondary)', whiteSpace: 'nowrap' }}>Durée (min) :</label>
                      <input
                        className="field"
                        type="number"
                        min="1"
                        value={editLeconDuree}
                        onChange={e => setEditLeconDuree(e.target.value)}
                        placeholder="ex: 15"
                        style={{ width: 80, fontSize: 12 }}
                      />
                    </div>
                  )}
                </div>
                {isResp && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {editingLeconId === selectedLecon.id ? (
                      <>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditingLeconId(null)}>Annuler</button>
                        <button className="btn btn-primary btn-sm" onClick={handleSaveLecon} disabled={savingLeconEdit}>
                          {savingLeconEdit ? <Spinner size={12} /> : 'Enregistrer'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-secondary btn-sm press" onClick={() => startEditLecon(selectedLecon)}>
                          Modifier
                        </button>
                        <button className="btn btn-secondary btn-sm press" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteLecon(selectedLecon)}>
                          Supprimer
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Contenu leçon */}
              {editingLeconId === selectedLecon.id ? (
                <RichEditor
                  content={editLeconContenu}
                  onChange={setEditLeconContenu}
                  placeholder="Écrivez le contenu de cette leçon…"
                />
              ) : selectedLecon.contenu ? (
                <div
                  className="prose-content"
                  dangerouslySetInnerHTML={{ __html: selectedLecon.contenu }}
                  style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--fg-primary)' }}
                />
              ) : (
                <div style={{ color: 'var(--fg-muted)', fontSize: 13, fontStyle: 'italic' }}>
                  Aucun contenu pour cette leçon.
                  {isResp && ' Cliquez sur "Modifier" pour ajouter du contenu.'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IcoClock() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
function IcoDownload() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
}
