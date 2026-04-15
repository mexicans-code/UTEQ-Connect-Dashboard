import api from './axios';

/* ══════════════════════════════════════════
   Interfaces
══════════════════════════════════════════ */

export interface EspacioDestino { _id: string; nombre: string; }

export interface Espacio {
  _id: string;
  nombre: string;
  planta: string;
  cupos: number;
  ocupado?: boolean;
  destino?: EspacioDestino | string;
  descripcion?: string;
}

export interface EspacioSugerenciasParams {
  destinoId: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  cupos: number;
}

/* ══════════════════════════════════════════
   Espacios — Consultas
══════════════════════════════════════════ */

/** Obtiene todos los espacios. */
export const getEspacios = async (): Promise<Espacio[]> => {
  const res = await api.get('/espacios');
  const raw = res.data;
  return Array.isArray(raw) ? raw : (raw?.data ?? []);
};

/** Obtiene los espacios que pertenecen a un destino específico. */
export const getEspaciosPorDestino = async (destinoId: string): Promise<Espacio[]> => {
  if (!destinoId) return [];
  const res = await api.get(`/espacios/destino/${destinoId}`);
  const raw = res.data;
  return Array.isArray(raw) ? raw : (raw?.data ?? []);
};

/** Obtiene espacios disponibles (sugerencias) para una fecha y horario. */
export const getEspaciosSugerencias = async (params: EspacioSugerenciasParams): Promise<Espacio[]> => {
  const qs = new URLSearchParams({
    destinoId:  params.destinoId,
    fecha:       params.fecha,
    horaInicio:  params.horaInicio,
    horaFin:     params.horaFin,
    cupos:       String(params.cupos),
  });
  const res = await api.get(`/espacios/sugerencias?${qs}`);
  const raw = res.data;
  return Array.isArray(raw) ? raw : (raw?.data ?? []);
};

/* ══════════════════════════════════════════
   Espacios — CRUD
══════════════════════════════════════════ */

/** Crea un nuevo espacio. */
export const createEspacio = async (data: Omit<Espacio, '_id'>): Promise<void> => {
  await api.post('/espacios', data);
};

/** Actualiza un espacio existente. */
export const updateEspacio = async (id: string, data: Partial<Omit<Espacio, '_id'>>): Promise<void> => {
  await api.put(`/espacios/${id}`, data);
};

/** Alterna el estado ocupado de un espacio. */
export const toggleOcupadoEspacio = async (id: string, ocupado: boolean): Promise<void> => {
  await api.patch(`/espacios/${id}/ocupado`, { ocupado });
};