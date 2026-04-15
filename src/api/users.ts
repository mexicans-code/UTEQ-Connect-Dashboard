import api from './axios';

/* ══════════════════════════════════════════
   Interfaces
══════════════════════════════════════════ */

export interface Usuario {
  _id: string;
  nombre: string;
  email: string;
  rol: string;
  estatus: string;
  imagenPerfil?: string;
  fechaCreacion?: string;
  ultimoLogin?: string;
}

export interface CreateUsuarioData {
  nombre: string;
  email: string;
  password: string;
  rol: string;
  estatus?: string;
  requiereCambioPassword?: boolean;
}

export interface UpdateUsuarioData {
  nombre?: string;
  email?: string;
  rol?: string;
  estatus?: string;
}

/* ══════════════════════════════════════════
   Usuarios — CRUD
══════════════════════════════════════════ */

/** Obtiene todos los usuarios. */
export const getUsuarios = async (): Promise<Usuario[]> => {
  const res = await api.get('/users');
  const raw = res.data;
  return raw?.data ?? raw ?? [];
};

/** Obtiene un usuario por su ID. */
export const getUserById = async (id: string): Promise<{ success: boolean; data: any }> => {
  const res = await api.get(`/users/${id}`);
  return res.data;
};

/** Actualiza los datos de un usuario. */
export const updateUsuario = async (id: string, data: UpdateUsuarioData): Promise<void> => {
  await api.put(`/users/${id}`, data);
};

/** Elimina un usuario. */
export const deleteUsuario = async (id: string): Promise<void> => {
  await api.delete(`/users/${id}`);
};

/** Activa un usuario. */
export const activateUsuario = async (id: string): Promise<void> => {
  await api.patch(`/users/${id}/activate`);
};

/** Desactiva un usuario. */
export const deactivateUsuario = async (id: string): Promise<void> => {
  await api.patch(`/users/${id}/deactivate`);
};

/* ══════════════════════════════════════════
   Perfil propio
══════════════════════════════════════════ */

/** Obtiene el perfil del usuario autenticado. */
export const getProfile = async (): Promise<Usuario> => {
  const res = await api.get('/users/profile');
  return res.data?.data ?? res.data;
};

/** Actualiza el nombre del usuario autenticado. */
export const updateProfileNombre = async (nombre: string): Promise<void> => {
  const userId = localStorage.getItem('userId');
  await api.put(`/users/${userId}`, { nombre });
};

/** Cambia la contraseña del usuario autenticado. */
export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  await api.put('/users/change-password', { currentPassword, newPassword });
};

/* ══════════════════════════════════════════
   Imagen de perfil
══════════════════════════════════════════ */

/** Sube o reemplaza la imagen de perfil del usuario autenticado. */
export const uploadProfileImage = async (file: File): Promise<void> => {
  const fd = new FormData();
  fd.append('image', file);
  await api.put('/users/profile-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};

/** Elimina la imagen de perfil del usuario autenticado. */
export const deleteProfileImage = async (): Promise<void> => {
  await api.delete('/users/profile-image');
};

/* ══════════════════════════════════════════
   Auth
══════════════════════════════════════════ */

/** Registra un nuevo admin o superadmin. Devuelve el ID del usuario creado. */
export const registerAdmin = async (data: CreateUsuarioData): Promise<string | null> => {
  const res = await api.post('/auth/register-admin', data);
  return res.data?.data?.user?._id ?? res.data?.data?._id ?? res.data?._id ?? null;
};