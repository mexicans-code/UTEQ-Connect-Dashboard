import api from './axios';

/* ══════════════════════════════════════════
   Interfaces
══════════════════════════════════════════ */

export interface Log {
  _id: string;
  nivel: 'info' | 'warn' | 'error';
  evento: string;
  metodo: string;
  ruta: string;
  statusCode: number;
  ip: string;
  userId?: string;
  detalle?: string;
  fecha: string;
}

/* ══════════════════════════════════════════
   Logs — Consultas
══════════════════════════════════════════ */

/** Obtiene todos los logs del sistema. */
export const getLogs = async (): Promise<Log[]> => {
  const res = await api.get('/logs');
  return res.data?.data ?? res.data ?? [];
};