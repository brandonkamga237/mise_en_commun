import axios from 'axios';
import toast from 'react-hot-toast';
import type {
  Preparation,
  PreparationSummary,
  Chant,
  Commentaire,
  Etape,
  Presence,
  PresenceStat,
  StatutPresence,
  User,
} from '../types';

// Aliases de compatibilité
export type { Preparation as Brouillon, PreparationSummary as BrouillonSummary };

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const detail = err.response?.data?.detail;
    let msg: string;

    if (typeof detail === 'string') {
      msg = detail;
    } else if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0];
      const raw = typeof first === 'string' ? first : (first?.msg ?? 'Données invalides.');
      msg = String(raw).replace(/^Value error,\s*/i, '');
    } else if (status === 401) {
      msg = 'Session expirée, veuillez vous reconnecter.';
      localStorage.removeItem('mc_token');
      setTimeout(() => { window.location.replace('/connexion'); }, 1200);
    } else if (!err.response) {
      msg = 'Impossible de joindre le serveur. Vérifiez votre connexion.';
    } else {
      msg = 'Une erreur est survenue.';
    }

    toast.error(msg);
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────────────────────
export const login = (matricule: string, mot_de_passe: string) =>
  api.post<{ access_token: string }>('/auth/connexion', { matricule, mot_de_passe }).then((r) => r.data);

export const setup = (nom: string, mot_de_passe: string, prenom?: string) =>
  api.post<{ access_token: string; matricule?: string }>('/auth/initialisation', { nom, mot_de_passe, prenom }).then((r) => r.data);

export const getMe = () =>
  api.get<User>('/auth/moi').then((r) => r.data);

export const updateProfil = (data: { nom?: string; prenom?: string; mot_de_passe?: string; adresse?: string; telephone?: string }) =>
  api.put<User>('/auth/profil', data).then((r) => r.data);

export const uploadPhoto = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post<User>('/auth/profil/photo', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};

// ── Utilisateurs ─────────────────────────────────────────────
export const getUtilisateurs = () =>
  api.get<User[]>('/utilisateurs/').then((r) => r.data);

export const createUtilisateur = (data: { nom: string; prenom?: string; mot_de_passe: string; role: string; email?: string }) =>
  api.post<User>('/utilisateurs/', data).then((r) => r.data);

export const updateUtilisateur = (id: number, data: { nom?: string; prenom?: string; role?: string }) =>
  api.put<User>(`/utilisateurs/${id}`, data).then((r) => r.data);

export const deleteUtilisateur = (id: number) =>
  api.delete(`/utilisateurs/${id}`);

export const regenererMatricule = (id: number) =>
  api.post<User>(`/utilisateurs/${id}/regenerer-matricule`).then((r) => r.data);

// ── Préparations ──────────────────────────────────────────────
export const getPreparations = (params?: { date_dimanche?: string; statut?: string; auteur_id?: number }) =>
  api.get<PreparationSummary[]>('/preparations/', { params }).then((r) => r.data);

export const getPreparation = (id: number) =>
  api.get<Preparation>(`/preparations/${id}`).then((r) => r.data);

export const createPreparation = (data: { date_dimanche: string; liturgie?: string; lecon?: string; divers?: string }) =>
  api.post<Preparation>('/preparations/', data).then((r) => r.data);

export const updatePreparation = (id: number, data: { liturgie?: string; lecon?: string; divers?: string }) =>
  api.put<Preparation>(`/preparations/${id}`, data).then((r) => r.data);

export const deletePreparation = (id: number) =>
  api.delete(`/preparations/${id}`);

export const soumettreCandidat = (id: number) =>
  api.post<Preparation>(`/preparations/${id}/soumettre`).then((r) => r.data);

export const validerOfficiel = (id: number) =>
  api.post<Preparation>(`/preparations/${id}/valider`).then((r) => r.data);

export const renvoyerRevision = (id: number, motif: string) =>
  api.post<Preparation>(`/preparations/${id}/renvoyer`, { motif }).then((r) => r.data);

export const revoquerOfficiel = (id: number) =>
  api.post<Preparation>(`/preparations/${id}/revoquer`).then((r) => r.data);

export const dupliquerPreparation = (source_id: number, date_dimanche: string) =>
  api.post<Preparation>('/preparations/dupliquer', { source_id, date_dimanche }).then((r) => r.data);

export const getHistorique = (q?: string) =>
  api.get<PreparationSummary[]>('/preparations/historique/officiel', { params: { q } }).then((r) => r.data);

export const setVisibilite = (id: number, visible: boolean) =>
  api.post<Preparation>(`/preparations/${id}/visibilite`, { visible }).then((r) => r.data);

// Aliases de compatibilité (noms anciens)
export const getBrouillons = getPreparations;
export const getBrouillon = getPreparation;
export const createBrouillon = createPreparation;
export const updateBrouillon = updatePreparation;
export const deleteBrouillon = deletePreparation;
export const dupliquerBrouillon = dupliquerPreparation;

// ── Chants ───────────────────────────────────────────────────
export const getChants = (preparationId: number) =>
  api.get<Chant[]>(`/preparations/${preparationId}/chants/`).then((r) => r.data);

export const addChant = (preparationId: number, data: { titre: string; etape: Etape; ordre?: number }) =>
  api.post<Chant>(`/preparations/${preparationId}/chants/`, data).then((r) => r.data);

export const updateChant = (preparationId: number, chantId: number, data: { titre?: string; etape?: Etape; ordre?: number }) =>
  api.put<Chant>(`/preparations/${preparationId}/chants/${chantId}`, data).then((r) => r.data);

export const deleteChant = (preparationId: number, chantId: number) =>
  api.delete(`/preparations/${preparationId}/chants/${chantId}`);

export const reorderChants = (preparationId: number, ids: number[]) =>
  api.put<Chant[]>(`/preparations/${preparationId}/chants/reorder`, { ids }).then((r) => r.data);

// ── Commentaires ─────────────────────────────────────────────
export const getCommentaires = (preparationId: number) =>
  api.get<Commentaire[]>(`/preparations/${preparationId}/commentaires/`).then((r) => r.data);

export const addCommentaire = (preparationId: number, data: {
  contenu: string;
  cible_type: string;
  cible_id: number;
  parent_id?: number;
}) =>
  api.post<Commentaire>(`/preparations/${preparationId}/commentaires/`, data).then((r) => r.data);

// ── Présence ─────────────────────────────────────────────────
export const getPresence = (date_samedi: string) =>
  api.get<Presence[]>(`/presence/${date_samedi}`).then((r) => r.data);

export const savePresence = (date_samedi: string, presences: { user_id: number; statut: StatutPresence }[]) =>
  api.put<Presence[]>('/presence/', { date_samedi, presences }).then((r) => r.data);

export const getPresenceDates = () =>
  api.get<string[]>('/presence/historique/dates').then((r) => r.data);

export const getStatsParticipation = (params?: { mois?: number; annee?: number }) =>
  api.get<PresenceStat[]>('/presence/stats/participation', { params }).then((r) => r.data);

// ── PDF ──────────────────────────────────────────────────────
export async function downloadPdf(preparationId: number, filename?: string): Promise<void> {
  const res = await api.get(`/preparations/${preparationId}/pdf`, { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `culte-${preparationId}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
