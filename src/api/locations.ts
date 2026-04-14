import api from './axios';

/* ══════════════════════════════════════════
   Interfaces
══════════════════════════════════════════ */

export interface Location {
  _id: string;
  nombre: string;
  posicion?: { latitude: number; longitude: number };
  image?: string;
}

/* ══════════════════════════════════════════
   Helpers internos
══════════════════════════════════════════ */

const buildImageFormData = (file: File): FormData => {
  const fd = new FormData();
  fd.append('image', file);
  return fd;
};

const imageHeaders = { 'Content-Type': 'multipart/form-data' };

/* ══════════════════════════════════════════
   Locations — CRUD
══════════════════════════════════════════ */

/** Obtiene todos los destinos / ubicaciones. */
export const getLocations = async (): Promise<Location[]> => {
  const res = await api.get('/locations');
  const raw = res.data;
  return Array.isArray(raw) ? raw : (raw?.data ?? []);
};

/** Actualiza los datos de una ubicación. */
export const updateLocation = async (id: string, data: Partial<Pick<Location, 'nombre'>>): Promise<void> => {
  await api.put(`/locations/${id}`, data);
};

/* ══════════════════════════════════════════
   Locations — Imagen
══════════════════════════════════════════ */

/** Sube o reemplaza la imagen de una ubicación. */
export const uploadLocationImage = async (id: string, file: File): Promise<void> => {
  await api.post(`/locations/${id}/image`, buildImageFormData(file), { headers: imageHeaders });
};

/** Elimina la imagen de una ubicación. */
export const deleteLocationImage = async (id: string): Promise<void> => {
  await api.delete(`/locations/${id}/image`);
};