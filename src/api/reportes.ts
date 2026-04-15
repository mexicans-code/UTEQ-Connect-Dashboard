import api from './axios';

/* ══════════════════════════════════════════
   Interfaces
══════════════════════════════════════════ */

export interface ReporteTotales {
  usuarios: number;
  edificios: number;
  eventos: number;
  eventosActivos: number;
  eventosInactivos: number;
  personal: number;
}

export interface EventoStats {
  eventoId: string;
  titulo: string;
  aceptadas: number;
  asistencias: number;
  noAsistio: number;
  pendientes: number;
  total: number;
}

/* ══════════════════════════════════════════
   Reportes — Consultas agregadas
══════════════════════════════════════════ */

/** Obtiene los totales generales del sistema para la pantalla de Reportes. */
export const getReporteTotales = async (): Promise<ReporteTotales> => {
  const [rUsers, rLoc, rEv, rPersonal] = await Promise.all([
    api.get('/users'),
    api.get('/locations'),
    api.get('/events'),
    api.get('/personal'),
  ]);

  const usuarios  = (rUsers.data?.data    ?? rUsers.data    ?? []).length;
  const edificios = (rLoc.data?.data      ?? rLoc.data      ?? []).length;
  const personal  = (rPersonal.data?.data ?? rPersonal.data ?? []).length;
  const eventos: any[] = rEv.data?.data   ?? rEv.data       ?? [];

  return {
    usuarios,
    edificios,
    personal,
    eventos:          eventos.length,
    eventosActivos:   eventos.filter((e) => e.activo).length,
    eventosInactivos: eventos.filter((e) => !e.activo).length,
  };
};

/** Obtiene las métricas de invitaciones por evento para el Panel de Métricas. */
export const getMetricasEventos = async (): Promise<EventoStats[]> => {
  const resEv = await api.get('/events');
  const rawEv = resEv.data;
  const eventos: { _id: string; titulo: string }[] = Array.isArray(rawEv) ? rawEv : (rawEv?.data ?? []);

  return Promise.all(
    eventos.map(async (ev) => {
      try {
        const res = await api.get(`/invitaciones/event/${ev._id}/stats`);
        const s = res.data?.data ?? {};
        return {
          eventoId:    ev._id,
          titulo:      ev.titulo,
          aceptadas:   s.aceptadas   ?? 0,
          asistencias: s.asistencias ?? 0,
          noAsistio:   s.noAsistio   ?? 0,
          pendientes:  s.pendientes  ?? 0,
          total:      (s.aceptadas ?? 0) + (s.enviadas ?? 0) + (s.rechazadas ?? 0),
        };
      } catch {
        return { eventoId: ev._id, titulo: ev.titulo, aceptadas: 0, asistencias: 0, noAsistio: 0, pendientes: 0, total: 0 };
      }
    }),
  );
};