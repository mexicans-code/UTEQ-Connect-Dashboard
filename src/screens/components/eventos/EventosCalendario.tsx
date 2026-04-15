import React, { useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Clock, Users } from "lucide-react";

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
  cupos: number;
  cuposDisponibles: number;
  activo: boolean;
}

export interface EventosCalendarioProps {
  eventos: Evento[];
}

/* ═══════════ CONSTANTES ═══════════ */

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/* ═══════════ HELPERS (locales al módulo) ═══════════ */

/** "2024-05-10T03:00:00.000Z" → "2024-05-10" */
const toInputDate = (iso: string) => (iso ? iso.split("T")[0] : "");

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const getNombreDest = (d: Destino | string | undefined) =>
  !d ? "—" : typeof d === "string" ? d : d.nombre;

/* ═══════════ COMPONENTE ═══════════ */

const EventosCalendario: React.FC<EventosCalendarioProps> = ({ eventos }) => {
  const today = new Date();

  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);

  /* ── Navegación de mes ── */
  const mesAnterior = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
    setDiaSeleccionado(null);
  };

  const mesSiguiente = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
    setDiaSeleccionado(null);
  };

  /* ── Cálculos del mes ── */
  const diasEnMes = new Date(calYear, calMonth + 1, 0).getDate();
  const primerDia = new Date(calYear, calMonth, 1).getDay();

  const eventosPorDia = (dia: number): Evento[] => {
    const ds = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    return eventos.filter((ev) => toInputDate(ev.fecha) === ds);
  };

  const eventosDelDia = diaSeleccionado
    ? eventos.filter((ev) => toInputDate(ev.fecha) === diaSeleccionado)
    : [];

  /* ── Render ── */
  return (
    <div className="cal-wrapper">
      {/* Cabecera con navegación */}
      <div className="cal-header">
        <button className="cal-nav" onClick={mesAnterior}>
          <ChevronLeft size={18} />
        </button>
        <span className="cal-titulo">
          {MESES[calMonth]} {calYear}
        </span>
        <button className="cal-nav" onClick={mesSiguiente}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Nombres de los días */}
      <div className="cal-grid-header">
        {DIAS.map((d) => (
          <div key={d} className="cal-dia-nombre">
            {d}
          </div>
        ))}
      </div>

      {/* Grilla de días */}
      <div className="cal-grid">
        {/* Celdas vacías para alinear el primer día */}
        {Array.from({ length: primerDia }).map((_, i) => (
          <div key={`empty-${i}`} className="cal-celda vacia" />
        ))}

        {/* Días del mes */}
        {Array.from({ length: diasEnMes }).map((_, i) => {
          const dia = i + 1;
          const evsDia = eventosPorDia(dia);
          const key = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
          const esHoy =
            today.getDate() === dia &&
            today.getMonth() === calMonth &&
            today.getFullYear() === calYear;
          const esPasado = key < getTodayStr();

          return (
            <div
              key={dia}
              className={[
                "cal-celda",
                esHoy ? "hoy" : "",
                esPasado ? "pasado" : "",
                diaSeleccionado === key ? "seleccionado" : "",
                evsDia.length > 0 && !esPasado ? "con-evento" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                if (evsDia.length > 0 && !esPasado)
                  setDiaSeleccionado((prev) => (prev === key ? null : key));
              }}
              style={{
                cursor: evsDia.length > 0 && !esPasado ? "pointer" : "default",
              }}
            >
              <span className="cal-num">{dia}</span>

              {/* Chips de eventos (máx. 2 visibles) */}
              {evsDia.slice(0, 2).map((ev) => (
                <div
                  key={ev._id}
                  className={`cal-evento-chip ${ev.activo ? "activo" : "inactivo"}`}
                >
                  {ev.titulo.length > 14
                    ? ev.titulo.slice(0, 13) + "…"
                    : ev.titulo}
                </div>
              ))}

              {evsDia.length > 2 && (
                <div className="cal-evento-mas">+{evsDia.length - 2} más</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Panel de detalle del día seleccionado */}
      {diaSeleccionado && eventosDelDia.length > 0 && (
        <div className="cal-detalle">
          <h4 style={{ marginBottom: 10, fontSize: "0.85rem" }}>
            Eventos del{" "}
            {new Date(diaSeleccionado + "T12:00:00").toLocaleDateString("es-MX", {
              day: "numeric",
              month: "long",
            })}
          </h4>

          {eventosDelDia.map((ev) => (
            <div key={ev._id} className="cal-detalle-item">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <strong>{ev.titulo}</strong>
                <span
                  className={ev.activo ? "estatus-activo" : "estatus-inactivo"}
                  style={{ fontSize: "0.75rem" }}
                >
                  {ev.activo ? "Activo" : "Inactivo"}
                </span>
              </div>

              <div
                style={{
                  fontSize: "0.8rem",
                  marginTop: 4,
                  display: "flex",
                  gap: 16,
                }}
              >
                <span>
                  <MapPin size={12} style={{ marginRight: 4 }} />
                  {getNombreDest(ev.destino)}
                </span>
                <span>
                  <Clock size={12} style={{ marginRight: 4 }} />
                  {ev.horaInicio}–{ev.horaFin}
                </span>
                <span>
                  <Users size={12} style={{ marginRight: 4 }} />
                  {ev.cuposDisponibles}/{ev.cupos}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventosCalendario;