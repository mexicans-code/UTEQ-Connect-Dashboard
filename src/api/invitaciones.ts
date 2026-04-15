import api from './axios';

/* ══════════════════════════════════════════
   Interfaces
══════════════════════════════════════════ */

export interface UsuarioInv {
  _id: string;
  nombre?: string;
  name?: string;
  email?: string;
  correo?: string;
}

export interface Invitacion {
  _id: string;
  usuario: UsuarioInv | string | null;
  estadoInvitacion: string;
  estadoAsistencia: string;
  fechaEnvio?: string;
}

export interface InvitacionStats {
  aceptadas: number;
  enviadas: number;
  rechazadas: number;
  asistencias: number;
  noAsistio: number;
  pendientes: number;
}

/* ══════════════════════════════════════════
   Invitaciones — Consultas
══════════════════════════════════════════ */

/** Obtiene todas las invitaciones de un evento. */
export const getInvitacionesByEvento = async (eventoId: string): Promise<Invitacion[]> => {
  if (!eventoId) return [];
  const res = await api.get(`/invitaciones/event/${eventoId}`);
  const raw = res.data;
  return Array.isArray(raw) ? raw
    : Array.isArray(raw?.data) ? raw.data
    : (raw?.invitaciones ?? []);
};

/** Obtiene las estadísticas de invitaciones de un evento. */
export const getInvitacionesStats = async (eventoId: string): Promise<InvitacionStats> => {
  const res = await api.get(`/invitaciones/event/${eventoId}/stats`);
  return res.data?.data ?? {};
};

/* ══════════════════════════════════════════
   Invitaciones — Acciones
══════════════════════════════════════════ */

/** Actualiza el estado de una invitación (aceptada, rechazada, etc.). */
export const updateEstadoInvitacion = async (invId: string, estadoInvitacion: string): Promise<void> => {
  await api.patch(`/invitaciones/${invId}/status`, { estadoInvitacion });
};

/** Actualiza el estado de asistencia de una invitación. */
export const updateAsistenciaInvitacion = async (invId: string, estadoAsistencia: string): Promise<void> => {
  await api.patch(`/invitaciones/${invId}/asistencia`, { estadoAsistencia });
};

/** Confirma la asistencia de un usuario a un evento. */
export const confirmAsistencia = async (
  eventoId: string,
  usuarioId: string,
  payload: Record<string, unknown>,
): Promise<void> => {
  await api.patch(`/events/${eventoId}/confirm-assistence/${usuarioId}`, payload);
};