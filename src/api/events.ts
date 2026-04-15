import api from './axios';
import type { Espacio } from './espacios';

/* ══════════════════════════════════════════
   Interfaces
══════════════════════════════════════════ */

export interface Destino { _id: string; nombre: string; }
export type { Espacio };

export interface Evento {
  _id: string;
  titulo: string;
  descripcion?: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  destino: Destino | string;
  espacio?: { _id: string; nombre: string } | string | null;
  cupos: number;
  cuposDisponibles: number;
  activo: boolean;
  image?: string;
  creadoPor?: { _id: string; nombre: string; email: string } | string;
}

export interface CreateEventoData {
  titulo: string;
  descripcion: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  destino: string;
  espacio: string | null;
  cupos: number;
  creadoPor?: string;
}

export interface ReasignarCrearData {
  eventoPrevioId: string;
  nuevaEspacioId?: string;
  nuevaDestinoPrevioId?: string;
  nuevoEvento: CreateEventoData;
}

export interface ReasignarActualizarData {
  eventoPrevioId: string;
  nuevaEspacioId?: string;
  nuevaDestinoPrevioId?: string;
  updateData: Partial<CreateEventoData> & { cuposDisponibles?: number };
}

/* ══════════════════════════════════════════
   Helpers internos
══════════════════════════════════════════ */

const normalizeList = <T>(raw: unknown): T[] => {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as T[];
    const found = Object.values(obj).find((v) => Array.isArray(v));
    if (found) return found as T[];
  }
  return [];
};

const buildImageFormData = (file: File): FormData => {
  const fd = new FormData();
  fd.append('image', file);
  return fd;
};

const imageHeaders = { 'Content-Type': 'multipart/form-data' };

/* ══════════════════════════════════════════
   Eventos — CRUD
══════════════════════════════════════════ */

/** Obtiene todos los eventos. */
export const getEventos = async (): Promise<Evento[]> => {
  const res = await api.get('/events');
  return normalizeList<Evento>(res.data);
};

/** Crea un evento nuevo. Devuelve el ID del evento creado. */
export const createEvento = async (data: CreateEventoData): Promise<string> => {
  const res = await api.post('/events', data);
  return res.data?.data?._id ?? res.data?._id ?? '';
};

/** Actualiza un evento existente. */
export const updateEvento = async (id: string, data: Partial<CreateEventoData>): Promise<void> => {
  await api.put(`/events/${id}`, data);
};

/** Elimina un evento permanentemente. */
export const deleteEvento = async (id: string): Promise<void> => {
  await api.delete(`/events/${id}`);
};

/** Desactiva un evento. */
export const deactivateEvento = async (id: string): Promise<void> => {
  await api.patch(`/events/${id}/deactivate`);
};

/** Activa un evento. */
export const activateEvento = async (id: string): Promise<void> => {
  await api.patch(`/events/${id}/activate`);
};

/* ══════════════════════════════════════════
   Eventos — Imagen
══════════════════════════════════════════ */

/** Sube o reemplaza la imagen de un evento (POST — al crear). */
export const uploadEventoImage = async (id: string, file: File): Promise<void> => {
  await api.post(`/events/${id}/image`, buildImageFormData(file), { headers: imageHeaders });
};

/** Actualiza la imagen de un evento existente (PUT — al editar). */
export const updateEventoImage = async (id: string, file: File): Promise<void> => {
  await api.put(`/events/${id}/image`, buildImageFormData(file), { headers: imageHeaders });
};

/** Elimina la imagen de un evento. */
export const deleteEventoImage = async (id: string): Promise<void> => {
  await api.delete(`/events/${id}/image`);
};

/* ══════════════════════════════════════════
   Eventos — Reasignación de espacio
══════════════════════════════════════════ */

/** Crea un evento nuevo reasignando el espacio de uno existente. */
export const reasignarCrearEvento = async (data: ReasignarCrearData): Promise<string> => {
  const res = await api.post('/events/reasignar-crear', data);
  return res.data?.data?._id ?? res.data?._id ?? '';
};

/** Actualiza un evento reasignando el espacio de uno existente. */
export const reasignarActualizarEvento = async (id: string, data: ReasignarActualizarData): Promise<void> => {
  await api.put(`/events/${id}/reasignar-actualizar`, data);
};