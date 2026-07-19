import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getBrouillon, getCommentaires, updateBrouillon,
  validerOfficiel, deleteBrouillon,
  renvoyerRevision, revoquerOfficiel, getBrouillons, setVisibilite, downloadPdf,
} from '../api/client';
import { useAuthStore } from '../store/auth';
import { StatusPill } from '../components/ui/StatusPill';
import { Avatar } from '../components/ui/Avatar';
import { TimeAgo } from '../components/ui/TimeAgo';
import { ChantsList } from '../components/brouillon/ChantsList';
import { CommentThread } from '../components/commentaires/CommentThread';
import { Spinner } from '../components/ui/Spinner';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import type { Brouillon, BrouillonSummary, Commentaire } from '../types';
import { ETAPES_LABELS } from '../types';
import toast from 'react-hot-toast';

type TabId = 'chants' | 'liturgie' | 'lecon' | 'divers';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type Dialog =
  | { type: 'valider'; autreOfficiel: BrouillonSummary | null; loading: boolean }
  | { type: 'revoquer' }
  | { type: 'supprimer' }
  | null;

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function BrouillonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [brouillon, setBrouillon] = useState<Brouillon | null>(null);
  const [commentaires, setCommentaires] = useState<Commentaire[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('chants');
  const [liturgieText, setLiturgieText] = useState('');
  const [leconText, setLeconText] = useState('');
  const [diversText, setDiversText] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [acting, setActing] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showRenvoi, setShowRenvoi] = useState(false);
  const [motifRenvoi, setMotifRenvoi] = useState('');
  const [envoiRenvoi, setEnvoiRenvoi] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(async () => {
    if (!id) return;
    setLoadError(false);
    try {
      const [b, comms] = await Promise.all([
        getBrouillon(Number(id)),
        getCommentaires(Number(id)),
      ]);
      setBrouillon(b);
      setCommentaires(comms);
      setLiturgieText(b.liturgie);
      setLeconText(b.lecon);
      setDiversText(b.divers);
    } catch {
      setLoadError(true);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const tabs = useMemo<{ id: TabId; label: string; count?: number }[]>(() => [
    { id: 'chants',   label: 'Chants',   count: brouillon?.chants.length ?? 0 },
    { id: 'liturgie', label: 'Liturgie' },
    { id: 'lecon',    label: 'Leçon' },
    { id: 'divers',   label: 'Divers' },
  ], [brouillon?.chants.length]);

  // Auto-save debouncé, déclenché par les modifications de l'utilisateur.
  const scheduleSave = useCallback((fields: { liturgie: string; lecon: string; divers: string }) => {
    if (!brouillon) return;
    setSaveStatus('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await updateBrouillon(brouillon.id, fields);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    }, 800);
  }, [brouillon]);

  if (loadError) {
    return (
      <div className="empty-state" style={{ height: '50dvh' }}>
        <div className="empty-state-icon"><IcoAlertCircle /></div>
        <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--fg-primary)', marginBottom: 4 }}>
          Impossible de charger cette préparation
        </div>
        <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 16 }}>
          Elle a peut-être été supprimée ou tu n'as pas accès.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>Retour</button>
          <button className="btn btn-primary btn-sm" onClick={load}>Réessayer</button>
        </div>
      </div>
    );
  }

  if (!brouillon || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
        <Spinner size={32} />
      </div>
    );
  }

  const isResp  = user.role === 'responsable' || user.role === 'admin';
  const isAdmin = user.role === 'admin';
  const isOwner = brouillon.auteur.id === user.id;
  const canEdit = brouillon.statut === 'officiel' ? isResp : (isOwner || isResp);

  const canDelete = (isOwner && brouillon.statut === 'en_revision') || (isAdmin && brouillon.statut !== 'officiel');
  const canRevoquer = isResp && brouillon.statut === 'officiel';
  const hasOverflow = canDelete || canRevoquer;

  // ── Handlers ──────────────────────────────────────
  const onChangeText = (field: 'liturgie' | 'lecon' | 'divers', value: string) => {
    const next = { liturgie: liturgieText, lecon: leconText, divers: diversText, [field]: value };
    if (field === 'liturgie') setLiturgieText(value);
    if (field === 'lecon') setLeconText(value);
    if (field === 'divers') setDiversText(value);
    scheduleSave(next);
  };

  const openValider = async () => {
    setDialog({ type: 'valider', autreOfficiel: null, loading: true });
    try {
      const semaine = await getBrouillons({ date_dimanche: brouillon.date_dimanche, statut: 'officiel' });
      const existant = semaine.find(b => b.id !== brouillon.id) ?? null;
      setDialog({ type: 'valider', autreOfficiel: existant, loading: false });
    } catch {
      setDialog({ type: 'valider', autreOfficiel: null, loading: false });
    }
  };

  const handleValider = async () => {
    setActing(true);
    try {
      await validerOfficiel(brouillon.id);
      toast.success('Préparation validée comme officielle.');
      setDialog(null);
      load();
    } catch {} finally { setActing(false); }
  };

  const handleRevoquer = async () => {
    setActing(true);
    try {
      await revoquerOfficiel(brouillon.id);
      toast.success('Désignation officielle révoquée.');
      setDialog(null);
      load();
    } catch {} finally { setActing(false); }
  };

  const handleDelete = async () => {
    setActing(true);
    try {
      await deleteBrouillon(brouillon.id);
      toast.success('Préparation supprimée.');
      setDialog(null);
      navigate(-1);
    } catch {} finally { setActing(false); }
  };

  const handleRenvoyer = async () => {
    if (!motifRenvoi.trim()) {
      toast.error('Indique un motif de révision.');
      return;
    }
    setEnvoiRenvoi(true);
    try {
      await renvoyerRevision(brouillon.id, motifRenvoi);
      toast.success('Retour envoyé à l\'auteur.');
      setShowRenvoi(false);
      setMotifRenvoi('');
      load();
    } catch {} finally { setEnvoiRenvoi(false); }
  };

  const handleToggleVisibilite = async () => {
    try {
      await setVisibilite(brouillon.id, !brouillon.visible);
      toast.success(brouillon.visible ? 'Préparation masquée.' : 'Préparation rendue visible.');
      load();
    } catch {}
  };

  const bannerBg: Record<string, string> = {
    cree: 'var(--surface-2)', en_revision: 'var(--danger-soft)',
    candidat_final: 'var(--warning-soft)', officiel: 'var(--success-soft)', archive: 'var(--surface-2)',
  };
  const bannerBorder: Record<string, string> = {
    cree: 'var(--border)', en_revision: 'var(--danger-border)',
    candidat_final: 'var(--warning-border)', officiel: 'var(--success-border)', archive: 'var(--border)',
  };

  return (
    <div style={{ minHeight: '100vh' }}>

      {/* ── Sticky header ─────────────────────────── */}
      <div className="sticky-below-topbar" style={{
        background: bannerBg[brouillon.statut] ?? 'var(--surface-2)',
        borderBottom: `2px solid ${bannerBorder[brouillon.statut] ?? 'var(--border)'}`,
      }}>
        {/* Row 1 : auteur + statut + save status + overflow */}
        <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar nom={brouillon.auteur.nom} photoUrl={brouillon.auteur.photo_url} size={28} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg-primary)' }}>
              {brouillon.auteur.nom}
            </span>
            <span style={{ fontSize: 11, color: 'var(--fg-muted)', marginLeft: 6 }}>
              · <TimeAgo date={brouillon.modifie_le} />
            </span>
          </div>
          {canEdit && saveStatus !== 'idle' && <SaveStatusIndicator status={saveStatus} />}
          <StatusPill statut={brouillon.statut} />
          {hasOverflow && (
            <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Plus d'actions">
              <IcoDots />
            </button>
          )}
        </div>

        {/* Row 1b : Status stepper */}
        <StatusStepper statut={brouillon.statut} />

        {/* Row 2 : actions primaires */}
        <div style={{
          display: 'flex', gap: 6, padding: '0 16px 10px',
          overflowX: 'auto', flexWrap: 'nowrap', scrollbarWidth: 'none',
        }}>
          <button
            className="btn btn-secondary btn-sm press" style={{ flexShrink: 0 }}
            aria-label="Télécharger PDF"
            onClick={() => downloadPdf(brouillon.id)}
          >
            <IcoPdf /> PDF
          </button>

          {isOwner && brouillon.statut === 'en_revision' && (
            <button className="btn btn-secondary btn-sm press" style={{ flexShrink: 0 }} onClick={handleToggleVisibilite}>
              {brouillon.visible ? <><IcoEyeOff /> Masquer</> : <><IcoEye /> Soumettre</>}
            </button>
          )}

          {isResp && brouillon.statut === 'en_revision' && brouillon.visible && (
            <>
              <button className="btn btn-primary btn-sm press" style={{ flexShrink: 0 }} onClick={openValider}>
                <IcoCheck /> Valider
              </button>
              <button className="btn btn-secondary btn-sm press" style={{ color: 'var(--danger)', flexShrink: 0 }} onClick={() => setShowRenvoi(true)}>
                <IcoUndo /> Retour
              </button>
            </>
          )}
        </div>

        {/* Tab bar */}
        <div className="tab-bar" style={{ borderBottom: 'none', padding: '0 8px' }}>
          {tabs.map(t => (
            <div
              key={t.id}
              className={`tab-item${activeTab === t.id ? ' active' : ''}`}
              onClick={() => setActiveTab(t.id)}
              role="tab"
              aria-selected={activeTab === t.id}
            >
              {t.label}
              {t.count != null && t.count > 0 && (
                <span style={{
                  background: activeTab === t.id ? 'var(--primary)' : 'var(--border-strong)',
                  color: activeTab === t.id ? '#fff' : 'var(--fg-secondary)',
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                }}>
                  {t.count}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────── */}
      <div style={{ padding: '16px 16px 40px', maxWidth: 840, margin: '0 auto' }}>

        {!brouillon.visible && (
          <div style={{
            background: 'var(--surface-sunken)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)', padding: '10px 14px', marginBottom: 14,
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <IcoEyeOff />
            <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>
              Cette préparation est <strong>privée</strong> — seul toi peux la voir.
            </span>
          </div>
        )}

        {brouillon.motif_revision && (
          <div style={{
            background: 'var(--warning-soft)', border: '1px solid var(--warning-border)',
            borderRadius: 'var(--r-sm)', padding: '12px 14px', marginBottom: 14,
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>↩</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--warning-text)', marginBottom: 2 }}>
                  Demande de modification — renvoyé en révision
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--warning-text)', lineHeight: 1.55 }}>
                  {brouillon.motif_revision}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Chants ── */}
        {activeTab === 'chants' && (
          <div>
            <SectionTitle>Programme des chants</SectionTitle>
            {canEdit ? (
              <ChantsList brouillon={brouillon} canEdit={canEdit} onRefresh={load} />
            ) : brouillon.chants.length > 0 ? (
              <div>
                {[...brouillon.chants].sort((a, b) => a.ordre - b.ordre).map((chant, i) => (
                  <div key={chant.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 0',
                    borderBottom: i < brouillon.chants.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  }}>
                    <span style={{
                      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--surface-sunken)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)',
                    }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--fg-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {chant.titre}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>
                        {ETAPES_LABELS[chant.etape] ?? chant.etape}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--fg-muted)', fontStyle: 'italic' }}>Aucun chant ajouté.</p>
            )}
            <CommentThread
              brouillonId={brouillon.id} cibleType="brouillon_bloc_chants" cibleId={brouillon.id}
              commentaires={commentaires} auteurBrouillonId={brouillon.auteur.id}
              onRefresh={load} label="Commenter les chants"
            />
          </div>
        )}

        {/* ── Tab: Liturgie ── */}
        {activeTab === 'liturgie' && (
          <div>
            <SectionTitle>Liturgie</SectionTitle>
            {canEdit ? (
              <textarea className="field" style={{ minHeight: 220, fontSize: 14.5, lineHeight: 1.7 }}
                value={liturgieText} onChange={e => onChangeText('liturgie', e.target.value)}
                placeholder="Déroulé pédagogique, prières, transitions…" />
            ) : (
              <ReadBlock text={brouillon.liturgie} placeholder="Non renseignée." />
            )}
            <CommentThread brouillonId={brouillon.id} cibleType="brouillon_bloc_liturgie" cibleId={brouillon.id}
              commentaires={commentaires} auteurBrouillonId={brouillon.auteur.id} onRefresh={load} label="Commenter" />
          </div>
        )}

        {/* ── Tab: Leçon ── */}
        {activeTab === 'lecon' && (
          <div>
            <SectionTitle>Leçon</SectionTitle>
            {canEdit ? (
              <textarea className="field" style={{ minHeight: 220, fontSize: 14.5, lineHeight: 1.7 }}
                value={leconText} onChange={e => onChangeText('lecon', e.target.value)}
                placeholder="Contenu pédagogique pour les enfants…" />
            ) : (
              <ReadBlock text={brouillon.lecon} placeholder="Non renseignée." />
            )}
            <CommentThread brouillonId={brouillon.id} cibleType="brouillon_bloc_lecon" cibleId={brouillon.id}
              commentaires={commentaires} auteurBrouillonId={brouillon.auteur.id} onRefresh={load} label="Commenter" />
          </div>
        )}

        {/* ── Tab: Divers ── */}
        {activeTab === 'divers' && (
          <div>
            <SectionTitle>Informations et divers</SectionTitle>
            {canEdit ? (
              <textarea className="field" style={{ minHeight: 160, fontSize: 14.5, lineHeight: 1.7 }}
                value={diversText} onChange={e => onChangeText('divers', e.target.value)}
                placeholder="Annonces, matériel nécessaire, anniversaires…" />
            ) : (
              <ReadBlock text={brouillon.divers} placeholder="Rien à signaler." />
            )}
            <CommentThread brouillonId={brouillon.id} cibleType="brouillon_bloc_divers" cibleId={brouillon.id}
              commentaires={commentaires} auteurBrouillonId={brouillon.auteur.id} onRefresh={load} label="Commenter" />
          </div>
        )}

        {/* Pied de page */}
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
          <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0, lineHeight: 1.7 }}>
            Dimanche {fmtDate(brouillon.date_dimanche + 'T00:00:00')}
            {brouillon.validateur && (
              <>
                {' · '}Validé par <strong>{brouillon.validateur.nom}</strong>
                {brouillon.valide_le && <> le {fmtDate(brouillon.valide_le)}</>}
              </>
            )}
          </p>
        </div>
      </div>

      {/* ── Overflow menu (bottom-sheet) ─────────────── */}
      {menuOpen && (
        <>
          <div className="overlay" style={{ zIndex: 60 }} onClick={() => setMenuOpen(false)} />
          <div className="bottom-sheet" style={{ zIndex: 70 }}>
            <div className="bottom-sheet-handle" />
            <div style={{ padding: '10px 0' }}>
              {canRevoquer && (
                <button className="sheet-item" onClick={() => { setMenuOpen(false); setDialog({ type: 'revoquer' }); }}>
                  <IcoUndo /> Révoquer la désignation officielle
                </button>
              )}
              {canDelete && (
                <button className="sheet-item danger" onClick={() => { setMenuOpen(false); setDialog({ type: 'supprimer' }); }}>
                  <IcoTrash /> Supprimer la préparation
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Dialogs ──────────────────────────────────── */}
      {dialog?.type === 'valider' && (
        <ConfirmModal
          title="Valider cette préparation"
          message={
            dialog.loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Spinner size={14} /> Vérification en cours…
              </div>
            ) : dialog.autreOfficiel ? (
              <>
                Cette préparation sera désignée comme <strong>officielle</strong> pour ce dimanche.
                <br /><br />
                <span style={{ color: 'var(--danger-text)', background: 'var(--danger-soft)', padding: '8px 12px', borderRadius: 8, display: 'block', fontSize: 13 }}>
                  ⚠️ La préparation de <strong>{dialog.autreOfficiel.auteur.nom}</strong> (actuellement officielle) sera <strong>définitivement supprimée</strong>.
                </span>
              </>
            ) : (
              <>Cette préparation sera désignée comme <strong>officielle</strong> pour ce dimanche.</>
            )
          }
          confirmLabel="Valider"
          variant="primary"
          loading={acting || dialog.loading}
          onConfirm={handleValider}
          onCancel={() => setDialog(null)}
        />
      )}

      {dialog?.type === 'revoquer' && (
        <ConfirmModal
          title="Révoquer la désignation officielle"
          message={<>Cette préparation ne sera <strong>plus officielle</strong> pour ce dimanche. Elle repassera en attente de validation.</>}
          confirmLabel="Révoquer"
          variant="danger"
          loading={acting}
          onConfirm={handleRevoquer}
          onCancel={() => setDialog(null)}
        />
      )}

      {dialog?.type === 'supprimer' && (
        <ConfirmModal
          title="Supprimer cette préparation"
          message={<>Cette action est <strong>irréversible</strong>. La préparation et tous ses chants seront définitivement supprimés.</>}
          confirmLabel="Supprimer définitivement"
          variant="danger"
          loading={acting}
          onConfirm={handleDelete}
          onCancel={() => setDialog(null)}
        />
      )}

      {showRenvoi && (
        <>
          <div className="overlay" onClick={() => { if (!envoiRenvoi) setShowRenvoi(false); }} />
          <div className="modal" style={{ maxWidth: 460 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--fg-primary)', marginBottom: 6 }}>
              Envoyer un retour
            </h3>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 16, lineHeight: 1.6 }}>
              Ton message sera visible par <strong>{brouillon.auteur.nom}</strong>. La préparation reste en révision.
            </p>
            <textarea
              className="field" style={{ minHeight: 90, fontSize: 14 }}
              placeholder="Ex : Il manque un chant pour la sortie…"
              value={motifRenvoi}
              onChange={e => setMotifRenvoi(e.target.value)}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setShowRenvoi(false)} disabled={envoiRenvoi}>Annuler</button>
              <button className="btn btn-danger" onClick={handleRenvoyer} disabled={envoiRenvoi || !motifRenvoi.trim()}>
                {envoiRenvoi ? <Spinner size={14} /> : 'Envoyer le retour'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  const label = status === 'saving' ? 'Enregistrement…' : status === 'saved' ? 'Enregistré' : 'Non enregistré';
  return (
    <span className={`save-status ${status}`} style={{ flexShrink: 0 }}>
      {status === 'saving' ? <Spinner size={11} /> : status === 'saved' ? <IcoCheck /> : <span className="dot" />}
      <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--fg-primary)', margin: '0 0 14px' }}>
      {children}
    </h2>
  );
}

function ReadBlock({ text, placeholder }: { text: string; placeholder: string }) {
  if (!text?.trim()) return <p style={{ fontSize: 13, color: 'var(--fg-muted)', fontStyle: 'italic', margin: 0 }}>{placeholder}</p>;
  return <p style={{ fontSize: 14.5, lineHeight: 1.8, color: 'var(--fg-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>{text}</p>;
}

function IcoCheck() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
}
function IcoTrash() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>;
}
function IcoPdf() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
}
function IcoEye() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function IcoEyeOff() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
}
function IcoDots() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>;
}
function IcoAlertCircle() {
  return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
}
function IcoUndo() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>;
}

function StatusStepper({ statut }: { statut: string }) {
  const isOfficiel = statut === 'officiel';
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '4px 16px 8px', gap: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: isOfficiel ? 'var(--success)' : 'var(--primary)',
          boxShadow: !isOfficiel ? '0 0 0 3px var(--ring)' : 'none',
        }} />
        <span style={{ fontSize: 10, fontWeight: !isOfficiel ? 700 : 400, color: !isOfficiel ? 'var(--primary)' : 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
          En révision
        </span>
      </div>
      <div style={{ flex: 1, height: 2, background: isOfficiel ? 'var(--success)' : 'var(--border-medium)', margin: '-10px 6px 0' }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: isOfficiel ? 'var(--success)' : 'var(--border-medium)',
          boxShadow: isOfficiel ? '0 0 0 3px rgba(22,163,74,0.15)' : 'none',
        }} />
        <span style={{ fontSize: 10, fontWeight: isOfficiel ? 700 : 400, color: isOfficiel ? 'var(--success)' : 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
          Validé
        </span>
      </div>
    </div>
  );
}
