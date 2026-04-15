import api from './axios';

/* ══════════════════════════════════════════
   Interfaces
══════════════════════════════════════════ */

export interface Personal {
  _id: string;
  numeroEmpleado: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  email: string;
  telefono: string;
  departamento: string;
  cargo: string;
  cubiculo?: string;
  planta?: string;
  fechaIngreso: string;
  estatus: 'activo' | 'inactivo';
  rol: 'user' | 'admin' | 'superadmin';
  userId?: string | null;
  imagenPerfil?: string | null;
  imagenHorario?: string | null;
}

export interface CreatePersonalData {
  numeroEmpleado: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  email: string;
  telefono: string;
  departamento: string;
  cargo: string;
  cubiculo?: string;
  planta?: string;
  fechaIngreso: string;
  estatus: 'activo' | 'inactivo';
  userId?: string;
}

/* ══════════════════════════════════════════
   Personal — CRUD
══════════════════════════════════════════ */

/** Obtiene todo el personal. */
export const getPersonal = async (): Promise<Personal[]> => {
  const res = await api.get('/personal');
  const raw = res.data;
  return Array.isArray(raw) ? raw : (raw?.data ?? []);
};

/** Crea un nuevo registro de personal. Devuelve el ID creado. */
export const createPersonal = async (data: CreatePersonalData): Promise<string> => {
  const res = await api.post('/personal', data);
  return res.data?.data?._id ?? res.data?._id ?? '';
};

/** Actualiza los datos de un miembro del personal. */
export const updatePersonal = async (id: string, data: Partial<CreatePersonalData>): Promise<void> => {
  await api.put(`/personal/${id}`, data);
};

/** Elimina un miembro del personal. */
export const deletePersonal = async (id: string): Promise<void> => {
  await api.delete(`/personal/${id}`);
};

/** Alterna el estatus activo/inactivo de un miembro del personal. */
export const toggleEstatusPersonal = async (id: string, estatusActual: 'activo' | 'inactivo'): Promise<void> => {
  const nuevoEstatus = estatusActual === 'activo' ? 'inactivo' : 'activo';
  await api.put(`/personal/${id}`, { estatus: nuevoEstatus });
};

/* ══════════════════════════════════════════
   Personal — Imagen de perfil
══════════════════════════════════════════ */

/** Sube o reemplaza la imagen de perfil de un miembro del personal. */
export const uploadPersonalProfileImage = async (id: string, file: File): Promise<void> => {
  const fd = new FormData();
  fd.append('image', file);
  await api.put(`/personal/${id}/profile-image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};

/** Elimina la imagen de perfil de un miembro del personal. */
export const deletePersonalProfileImage = async (id: string): Promise<void> => {
  await api.delete(`/personal/${id}/profile-image`);
};

/* ══════════════════════════════════════════
   Personal — Imagen de horario
══════════════════════════════════════════ */

/** Sube o reemplaza la imagen de horario de un miembro del personal. */
export const uploadPersonalScheduleImage = async (id: string, file: File): Promise<void> => {
  const fd = new FormData();
  fd.append('image', file);
  await api.put(`/personal/${id}/schedule-image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};

/** Elimina la imagen de horario de un miembro del personal. */
export const deletePersonalScheduleImage = async (id: string): Promise<void> => {
  await api.delete(`/personal/${id}/schedule-image`);
};