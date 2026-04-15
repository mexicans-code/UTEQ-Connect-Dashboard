import React, { useState, useEffect, useMemo } from "react";
import { Clock, Lock } from "lucide-react";

/* ═══════════ TIPOS ═══════════ */

interface Destino {
  _id: string;
  nombre: string;
}

interface Evento {
  _id: string;
  titulo: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  destino: Destino | string;
  espacio?: { _id: string; nombre: string } | string | null;
  cupos: number;
  cuposDisponibles: number;
  activo: boolean;
}

export interface GrillaHorariosProps {
  eventos: Evento[];
  espacioId: string;
  destinoId: string;
  fecha: string;
  horaInicioSel: string;
  horaFinSel: string;
  esSuperAdmin: boolean;
  eventoEditandoId?: string;
  modoEdicion?: boolean;
  onChange: (horaInicio: string, horaFin: string) => void;
}

/* ═══════════ HELPERS (locales al módulo) ═══════════ */

/** "2024-05-10T03:00:00.000Z" → "2024-05-10" */
const toInputDate = (iso: string) => (iso ? iso.split("T")[0] : "");

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const toMin = (h: string) => {
  const [hh, mm] = h.split(":").map(Number);
  return hh * 60 + mm;
};

const hayTraslapeH = (h1i: string, h1f: string, h2i: string, h2f: string) =>
  toMin(h1i) < toMin(h2f) && toMin(h1f) > toMin(h2i);

const getDestinoId = (d: Destino | string) =>
  !d ? "" : typeof d === "string" ? d : d._id;

const getSalaId = (e: Evento["espacio"]) =>
  !e ? "" : typeof e === "string" ? e : (e as any)._id;

/** Franjas de 30 min entre 07:00 y 22:00 (31 puntos = 30 intervalos) */
export const FRANJAS = Array.from({ length: 31 }, (_, i) => {
  const t = 7 * 60 + i * 30;
  return `${Math.floor(t / 60).toString().padStart(2, "0")}:${(t % 60)
    .toString()
    .padStart(2, "0")}`;
});

/* ═══════════ COMPONENTE ═══════════ */

const GrillaHorarios: React.FC<GrillaHorariosProps> = ({
  eventos,
  espacioId,
  destinoId,
  fecha,
  horaInicioSel,
  horaFinSel,
  esSuperAdmin,
  eventoEditandoId,
  modoEdicion,
  onChange,
}) => {
  const [arrastrando, setArrastrando] = useState(false);
  const [franjaInicio, setFranjaInicio] = useState<number | null>(null);
  const [franjaFin, setFranjaFin] = useState<number | null>(null);

  /* Índice mínimo seleccionable según hora actual (solo si es hoy y no es edición) */
  const franjaMinIdx = useMemo(() => {
    if (modoEdicion) return 0;
    if (!fecha || fecha !== getTodayStr()) return 0;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const idx = FRANJAS.slice(0, -1).findIndex((_, i) => {
      const [hh, mm] = FRANJAS[i].split(":").map(Number);
      return hh * 60 + mm > nowMin;
    });
    return idx === -1 ? FRANJAS.length - 1 : idx;
  }, [fecha, modoEdicion]);

  /* Franjas ocupadas por otros eventos en el mismo destino/espacio/fecha */
  const franjasOcupadas = useMemo((): Map<number, Evento> => {
    const map = new Map<number, Evento>();
    if (!fecha || !destinoId) return map;

    eventos.forEach((ev) => {
      if (!ev.activo) return;
      if (eventoEditandoId && ev._id === eventoEditandoId) return;
      if (getDestinoId(ev.destino) !== destinoId) return;
      if (espacioId && getSalaId(ev.espacio) !== espacioId) return;
      if (toInputDate(ev.fecha) !== fecha) return;

      FRANJAS.slice(0, -1).forEach((franja, idx) => {
        if (hayTraslapeH(franja, FRANJAS[idx + 1], ev.horaInicio, ev.horaFin))
          map.set(idx, ev);
      });
    });

    return map;
  }, [eventos, espacioId, destinoId, fecha, eventoEditandoId]);

  /* Sincronizar selección cuando el componente recibe un horario ya definido */
  useEffect(() => {
    if (horaInicioSel && horaFinSel) {
      const idxI = FRANJAS.findIndex((f) => f >= horaInicioSel);
      const idxF = FRANJAS.findIndex((f) => f >= horaFinSel);
      if (idxI >= 0) setFranjaInicio(idxI);
      if (idxF > idxI) setFranjaFin(idxF);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Handlers de arrastre ── */
  const handleMouseDown = (idx: number) => {
    if (idx < franjaMinIdx) return;
    if (franjasOcupadas.has(idx) && !esSuperAdmin) return;
    setArrastrando(true);
    setFranjaInicio(idx);
    setFranjaFin(idx + 1);
  };

  const handleMouseEnter = (idx: number) => {
    if (!arrastrando || franjaInicio === null) return;
    if (franjasOcupadas.has(idx) && !esSuperAdmin) {
      setArrastrando(false);
      if (franjaFin !== null)
        onChange(
          FRANJAS[franjaInicio],
          FRANJAS[Math.min(franjaFin, FRANJAS.length - 1)]
        );
      return;
    }
    setFranjaFin(Math.max(idx + 1, franjaInicio + 1));
  };

  const handleMouseUp = () => {
    setArrastrando(false);
    if (franjaInicio !== null && franjaFin !== null)
      onChange(
        FRANJAS[franjaInicio],
        FRANJAS[Math.min(franjaFin, FRANJAS.length - 1)]
      );
  };

  const estaSeleccionada = (idx: number) =>
    franjaInicio !== null &&
    franjaFin !== null &&
    idx >= franjaInicio &&
    idx < franjaFin;

  /* ── Render vacío ── */
  if (!fecha || !destinoId) {
    return (
      <div
        style={{
          padding: "14px",
          background: "#f9fafb",
          borderRadius: 8,
          fontSize: "0.8rem",
          color: "#9ca3af",
          textAlign: "center",
          border: "1px dashed #d1d5db",
        }}
      >
        Selecciona un lugar y fecha para ver disponibilidad de horarios
      </div>
    );
  }

  /* ── Render principal ── */
  return (
    <div className="modal-grilla-horarios">
      {/* Encabezado */}
      <div className="grilla-label">
        <Clock size={13} color="#6b7280" />
        <span>Selecciona el horario arrastrando</span>
        {esSuperAdmin && (
          <span
            style={{
              fontSize: "0.72rem",
              color: "#d97706",
              marginLeft: 4,
              fontWeight: 500,
            }}
          >
            · Puedes tomar horarios ocupados (se pedirá reubicar el evento)
          </span>
        )}
      </div>

      {/* Franjas */}
      <div
        className="grilla-franjas"
        onMouseLeave={() => {
          if (arrastrando) handleMouseUp();
        }}
      >
        {FRANJAS.slice(0, -1).map((franja, idx) => {
          const ev = franjasOcupadas.get(idx);
          const ocupado = !!ev;
          const seleccionada = estaSeleccionada(idx);
          const esPasada = idx < franjaMinIdx;

          let claseExtra = "libre";
          let titulo = "";

          if (esPasada) {
            claseExtra = "pasada";
            titulo = "Horario ya pasado";
          } else if (ocupado && !seleccionada) {
            claseExtra = esSuperAdmin ? "ocupado-superadmin" : "ocupado-admin";
            titulo = `Ocupado: ${ev!.titulo} (${ev!.horaInicio}–${ev!.horaFin})`;
          }

          if (seleccionada)
            claseExtra = ocupado ? "seleccionado-ocupado" : "seleccionado";

          return (
            <div
              key={franja}
              title={titulo}
              className={`grilla-franja ${claseExtra}`}
              onMouseDown={() => handleMouseDown(idx)}
              onMouseEnter={() => handleMouseEnter(idx)}
              onMouseUp={handleMouseUp}
              style={{ cursor: esPasada ? "not-allowed" : undefined }}
            >
              {franja}

              {esPasada && (
                <span
                  style={{
                    position: "absolute",
                    top: 1,
                    right: 2,
                    fontSize: "0.6rem",
                    opacity: 0.5,
                  }}
                >
                  ✕
                </span>
              )}

              {!esPasada && ocupado && !seleccionada && (
                <span
                  style={{ position: "absolute", top: 1, right: 2, fontSize: "0.6rem" }}
                >
                  {esSuperAdmin ? "⚠" : <Lock size={8} />}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="grilla-leyenda">
        <span className="grilla-leyenda-item">
          <span
            style={{
              width: 10,
              height: 10,
              background: "#2563eb",
              borderRadius: 2,
              display: "inline-block",
            }}
          />
          Tu selección
        </span>

        <span className="grilla-leyenda-item" style={{ color: "#9ca3af" }}>
          <span
            style={{
              width: 10,
              height: 10,
              background: "#f3f4f6",
              border: "1px solid #e5e7eb",
              borderRadius: 2,
              display: "inline-block",
            }}
          />
          Hora pasada
        </span>

        <span className="grilla-leyenda-item" style={{ color: "#dc2626" }}>
          <span
            style={{
              width: 10,
              height: 10,
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              borderRadius: 2,
              display: "inline-block",
            }}
          />
          Ocupado{!esSuperAdmin && " (bloqueado)"}
        </span>

        {esSuperAdmin && (
          <span className="grilla-leyenda-item" style={{ color: "#d97706" }}>
            <span
              style={{
                width: 10,
                height: 10,
                background: "#fef3c7",
                border: "1px solid #fcd34d",
                borderRadius: 2,
                display: "inline-block",
              }}
            />
            Ocupado (puedes tomar)
          </span>
        )}
      </div>

      {/* Resumen selección */}
      {horaInicioSel && horaFinSel && (
        <p className="grilla-resumen">
          Horario seleccionado:{" "}
          <strong>
            {horaInicioSel} – {horaFinSel}
          </strong>
        </p>
      )}
    </div>
  );
};

export default GrillaHorarios;