import React, { useState, useEffect, useMemo } from "react";
import "../../styles/GestionEventos.css";
import NavAdmin from "../components/NavAdmin";
import {
  Plus, Pencil, Trash2, Power, PowerOff, X,
  MapPin, Users, Clock, Eye, Search, Calendar, Info, Lock,
} from "lucide-react";
import api from "../../api/axios";
import ConfirmModal from "../../components/ConfirmModal";
import Paginacion from "../../components/Paginacion";
import ImageUploader from "../../components/ImageUploader";
import { API_URL } from "../../api/config";

/* ═══════════ INTERFACES ═══════════ */

interface Destino  { _id: string; nombre: string; }
interface Espacio  { _id: string; nombre: string; planta: string; cupos: number; ocupado?: boolean; }

interface Evento {
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

interface UsuarioInv { _id: string; nombre?: string; name?: string; email?: string; correo?: string; }
interface Invitacion  { _id: string; usuario: UsuarioInv | string | null; estadoInvitacion: string; estadoAsistencia: string; }

interface FormData {
  titulo: string; descripcion: string;
  fecha: string;
  horaInicio: string; horaFin: string;
  destino: string; espacio: string;
  cupos: number;
}

const EMPTY_FORM: FormData = {
  titulo: "", descripcion: "", fecha: "",
  horaInicio: "", horaFin: "", destino: "", espacio: "",
  cupos: 1,
};

/* ═══════════ HELPERS ═══════════ */

const toInputDate = (iso: string) => iso ? iso.split("T")[0] : "";

const formatFecha = (iso: string) => !iso ? "—"
  : new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

const getNombreDestino = (d: Destino | string | undefined) => {
  if (!d) return "—";
  return typeof d === "string" ? d : d.nombre;
};

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const FRANJAS = Array.from({ length: 31 }, (_, i) => {
  const t = 7 * 60 + i * 30;
  return `${Math.floor(t / 60).toString().padStart(2, "0")}:${(t % 60).toString().padStart(2, "0")}`;
});

const toMin = (h: string) => { const [hh, mm] = h.split(":").map(Number); return hh * 60 + mm; };
const hayTraslapeH = (h1i: string, h1f: string, h2i: string, h2f: string) =>
  toMin(h1i) < toMin(h2f) && toMin(h1f) > toMin(h2i);
const getDestinoId = (d: Destino | string) => !d ? "" : typeof d === "string" ? d : d._id;
const getSalaId = (e: any) => !e ? "" : typeof e === "string" ? e : e._id;

/* ═══════════ GRILLA DE HORARIOS ═══════════ */

interface GrillaHorariosProps {
  eventos: Evento[]; espacioId: string; destinoId: string;
  fecha: string;
  horaInicioSel: string; horaFinSel: string;
  eventoEditandoId?: string;
  onChange: (horaInicio: string, horaFin: string) => void;
}

const GrillaHorarios: React.FC<GrillaHorariosProps> = ({
  eventos, espacioId, destinoId, fecha,
  horaInicioSel, horaFinSel, eventoEditandoId, onChange,
}) => {
  const [arrastrando, setArrastrando] = useState(false);
  const [franjaInicio, setFranjaInicio] = useState<number | null>(null);
  const [franjaFin, setFranjaFin] = useState<number | null>(null);

  const franjaMinIdx = useMemo(() => {
    // Al editar NO bloqueamos franjas pasadas: el evento ya existe con esos horarios
    if (eventoEditandoId) return 0;
    if (!fecha) return 0;
    const todayStr = getTodayStr();
    if (fecha !== todayStr) return 0;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const idx = FRANJAS.slice(0, -1).findIndex((_, i) => {
      const [hh, mm] = FRANJAS[i].split(":").map(Number);
      return hh * 60 + mm > nowMin;
    });
    return idx === -1 ? FRANJAS.length - 1 : idx;
  }, [fecha, eventoEditandoId]);

  const franjasOcupadas = useMemo((): Map<number, Evento> => {
    const map = new Map<number, Evento>();
    if (!fecha || !destinoId) return map;
    eventos.forEach(ev => {
      if (!ev.activo) return;
      if (eventoEditandoId && ev._id === eventoEditandoId) return;
      if (getDestinoId(ev.destino) !== destinoId) return;
      if (espacioId && getSalaId(ev.espacio) !== espacioId) return;
      if (toInputDate(ev.fecha) !== fecha) return;
      FRANJAS.slice(0, -1).forEach((franja, idx) => {
        if (hayTraslapeH(franja, FRANJAS[idx + 1], ev.horaInicio, ev.horaFin)) map.set(idx, ev);
      });
    });
    return map;
  }, [eventos, espacioId, destinoId, fecha, eventoEditandoId]);

  useEffect(() => {
    if (horaInicioSel && horaFinSel) {
      const idxI = FRANJAS.findIndex(f => f >= horaInicioSel);
      const idxF = FRANJAS.findIndex(f => f >= horaFinSel);
      if (idxI >= 0) setFranjaInicio(idxI);
      if (idxF > idxI) setFranjaFin(idxF);
    }
  }, []);

  // Admin NO puede tomar franjas ocupadas
  const handleMouseDown = (idx: number) => {
    if (idx < franjaMinIdx) return;
    if (franjasOcupadas.has(idx)) return; // bloqueado para admin
    setArrastrando(true); setFranjaInicio(idx); setFranjaFin(idx + 1);
  };
  const handleMouseEnter = (idx: number) => {
    if (!arrastrando || franjaInicio === null) return;
    // Si arrastramos sobre una franja ocupada, cortamos la selección ahí
    if (franjasOcupadas.has(idx)) {
      setArrastrando(false);
      if (franjaInicio !== null && franjaFin !== null)
        onChange(FRANJAS[franjaInicio], FRANJAS[Math.min(franjaFin, FRANJAS.length - 1)]);
      return;
    }
    setFranjaFin(Math.max(idx + 1, franjaInicio + 1));
  };
  const handleMouseUp = () => {
    setArrastrando(false);
    if (franjaInicio !== null && franjaFin !== null)
      onChange(FRANJAS[franjaInicio], FRANJAS[Math.min(franjaFin, FRANJAS.length - 1)]);
  };
  const estaSeleccionada = (idx: number) =>
    franjaInicio !== null && franjaFin !== null && idx >= franjaInicio && idx < franjaFin;

  if (!fecha || !destinoId) {
    return (
      <div style={{
        padding: "14px", background: "#f9fafb", borderRadius: 8,
        fontSize: "0.8rem", color: "#9ca3af", textAlign: "center", border: "1px dashed #d1d5db"
      }}>
        Selecciona un lugar y fecha para ver disponibilidad de horarios
      </div>
    );
  }

  return (
    <div className="modal-grilla-horarios">
      <div className="grilla-label">
        <Clock size={13} color="#6b7280" />
        <span>Selecciona el horario arrastrando</span>
      </div>
      <div className="grilla-franjas" onMouseLeave={() => { if (arrastrando) handleMouseUp(); }}>
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
            claseExtra = "ocupado-admin";
            titulo = `Ocupado: ${ev!.titulo} (${ev!.horaInicio}–${ev!.horaFin})`;
          }
          if (seleccionada) claseExtra = "seleccionado";
          return (
            <div key={franja} title={titulo} className={`grilla-franja ${claseExtra}`}
              onMouseDown={() => handleMouseDown(idx)}
              onMouseEnter={() => handleMouseEnter(idx)}
              onMouseUp={handleMouseUp}
              style={{ cursor: esPasada || ocupado ? "not-allowed" : undefined }}>
              {franja}
              {esPasada && (
                <span style={{ position: "absolute", top: 1, right: 2, fontSize: "0.6rem", opacity: 0.5 }}>✕</span>
              )}
              {!esPasada && ocupado && (
                <span style={{ position: "absolute", top: 1, right: 2, fontSize: "0.6rem" }}>
                  <Lock size={8} />
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="grilla-leyenda">
        <span className="grilla-leyenda-item">
          <span style={{ width: 10, height: 10, background: "#2563eb", borderRadius: 2, display: "inline-block" }} />Tu selección
        </span>
        <span className="grilla-leyenda-item" style={{ color: "#9ca3af" }}>
          <span style={{ width: 10, height: 10, background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 2, display: "inline-block" }} />Hora pasada
        </span>
        <span className="grilla-leyenda-item" style={{ color: "#dc2626" }}>
          <span style={{ width: 10, height: 10, background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 2, display: "inline-block" }} />Ocupado (bloqueado)
        </span>
      </div>
      {horaInicioSel && horaFinSel && (
        <p className="grilla-resumen">Horario seleccionado: <strong>{horaInicioSel} – {horaFinSel}</strong></p>
      )}
    </div>
  );
};

const invBadgeClass = (estado: string) => {
  const map: Record<string, string> = {
    enviada: "ge-inv-badge-enviada", aceptada: "ge-inv-badge-aceptada",
    rechazada: "ge-inv-badge-rechazada", pendiente: "ge-inv-badge-pendiente",
    asistio: "ge-inv-badge-asistio", no_asistio: "ge-inv-badge-no_asistio",
  };
  return `ge-inv-badge ${map[estado] || ""}`;
};

const labelEstado: Record<string, string> = {
  enviada: "Enviada", aceptada: "Aceptada", rechazada: "Rechazada",
  pendiente: "Pendiente", asistio: "Asistió", no_asistio: "No asistió",
};

/* ═══════════ COMPONENTE PRINCIPAL ═══════════ */

const GestionEventos: React.FC = () => {
  // Identidad del admin autenticado
  const userIdActual = localStorage.getItem("userId") || "";

  const [eventos, setEventos]           = useState<Evento[]>([]);
  const [destinos, setDestinos]         = useState<Destino[]>([]);
  const [espaciosDestino, setEspaciosDestino] = useState<Espacio[]>([]);
  const [loadingEspacios, setLoadingEspacios] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [busqueda, setBusqueda]         = useState("");
  const [tabActivo, setTabActivo]       = useState<"mios" | "todos">("mios");
  const [pagina, setPagina]             = useState(1);
  const POR_PAGINA = 15;

  // Modal CRUD
  const [showModal, setShowModal]       = useState(false);
  const [modoEdicion, setModoEdicion]   = useState(false);
  const [eventoActual, setEventoActual] = useState<Evento | null>(null);
  const [saving, setSaving]             = useState(false);
  const [confirmOpen, setConfirmOpen]   = useState(false);
  const [confirmMsg, setConfirmMsg]     = useState("");
  const [confirmFn, setConfirmFn]       = useState<() => void>(() => () => {});
  const confirmar = (msg: string, fn: () => void) => { setConfirmMsg(msg); setConfirmFn(() => fn); setConfirmOpen(true); };
  const [uploadingImg, setUploadingImg]  = useState(false);
  const [imagenPendiente, setImagenPendiente] = useState<File | null>(null);
  const [modalError, setModalError]     = useState("");
  const [formData, setFormData]         = useState<FormData>(EMPTY_FORM);

  // Modal inscritos
  const [showInvModal, setShowInvModal]   = useState(false);
  const [invEvento, setInvEvento]         = useState<Evento | null>(null);
  const [invitaciones, setInvitaciones]   = useState<Invitacion[]>([]);
  const [loadingInv, setLoadingInv]       = useState(false);

  /* ── Helpers de identidad ── */
  const esMio = (ev: Evento): boolean => {
    if (!ev.creadoPor) return false;
    const id = typeof ev.creadoPor === "object" ? ev.creadoPor._id : ev.creadoPor;
    return id === userIdActual;
  };

  /* ── Fetches ── */
  const fetchEventos = async () => {
    setLoading(true); setError("");
    try {
      const res = await api.get("/events");
      const raw = res.data;
      const lista: Evento[] = Array.isArray(raw) ? raw
        : Array.isArray(raw.data) ? raw.data : [];
      setEventos(lista);
    } catch { setError("No se pudieron cargar los eventos."); }
    finally { setLoading(false); }
  };

  const fetchDestinos = async () => {
    try {
      const res = await api.get("/locations");
      const raw = res.data;
      setDestinos(Array.isArray(raw) ? raw : (raw.data ?? []));
    } catch {}
  };

  const fetchEspaciosPorDestino = async (destinoId: string): Promise<Espacio[]> => {
    if (!destinoId) { setEspaciosDestino([]); return []; }
    setLoadingEspacios(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/espacios/destino/${destinoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw = await res.json();
      const lista: Espacio[] = Array.isArray(raw) ? raw : (raw.data || []);
      setEspaciosDestino(lista);
      return lista;
    } catch { setEspaciosDestino([]); return []; }
    finally { setLoadingEspacios(false); }
  };

  const fetchInvitaciones = async (eventoId: string) => {
    setLoadingInv(true);
    try {
      const res = await api.get(`/invitaciones/event/${eventoId}`);
      const raw = res.data;
      setInvitaciones(Array.isArray(raw) ? raw : (raw.data ?? []));
    } catch { setInvitaciones([]); }
    finally { setLoadingInv(false); }
  };

  useEffect(() => { fetchEventos(); fetchDestinos(); }, []);

  /* ── Listas filtradas ── */
  const eventosMios   = useMemo(() => eventos.filter(esMio), [eventos, userIdActual]);
  const eventosGeneral = useMemo(() => eventos.filter(ev => !esMio(ev)), [eventos, userIdActual]);

  const listaActiva = tabActivo === "mios" ? eventosMios : eventosGeneral;

  const listaFiltrada = useMemo(() => {
    setPagina(1);
    if (!busqueda) return listaActiva;
    const q = busqueda.toLowerCase();
    return listaActiva.filter(ev =>
      ev.titulo.toLowerCase().includes(q) ||
      getNombreDestino(ev.destino).toLowerCase().includes(q)
    );
  }, [listaActiva, busqueda]);

  const listaPagina = useMemo(() => listaFiltrada.slice((pagina-1)*POR_PAGINA, pagina*POR_PAGINA), [listaFiltrada, pagina]);

  /* ── Modal CRUD ── */
  const abrirAgregar = () => {
    setModoEdicion(false); setEventoActual(null);
    setFormData(EMPTY_FORM); setModalError("");
    setEspaciosDestino([]); setShowModal(true);
  };

  const abrirEditar = (ev: Evento) => {
    if (!esMio(ev)) return;
    setModoEdicion(true); setEventoActual(ev);
    const destinoId = typeof ev.destino === "object" ? ev.destino._id : ev.destino;
    setFormData({
      titulo: ev.titulo, descripcion: ev.descripcion || "",
      fecha: toInputDate(ev.fecha),
      horaInicio: ev.horaInicio, horaFin: ev.horaFin,
      destino: destinoId,
      espacio: typeof ev.espacio === "object" && ev.espacio ? ev.espacio._id : (ev.espacio as string || ""),
      cupos: ev.cupos,
    });
    fetchEspaciosPorDestino(destinoId);
    setModalError(""); setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setModalError("");
    setFormData(EMPTY_FORM);
    setModoEdicion(false);
    setEventoActual(null);
    setImagenPendiente(null);
    setEspaciosDestino([]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "cupos" ? Number(value) : value,
      ...(name === "destino" ? { espacio: "" } : {}),
    }));
    if (name === "destino") fetchEspaciosPorDestino(value);
  };

  const handleHorarioChange = (horaInicio: string, horaFin: string) => {
    setFormData(prev => ({ ...prev, horaInicio, horaFin }));
  };

  const guardarEvento = async () => {
    if (!formData.titulo || !formData.fecha || !formData.horaInicio || !formData.horaFin || !formData.destino) {
      setModalError("Completa todos los campos obligatorios."); return;
    }
    if (!modoEdicion && formData.fecha < getTodayStr()) {
      setModalError("No puedes crear eventos en fechas pasadas."); return;
    }
    // Validar hora fin > hora inicio
    if (formData.horaInicio && formData.horaFin && toMin(formData.horaFin) <= toMin(formData.horaInicio)) {
      setModalError("La hora de fin debe ser posterior a la hora de inicio."); return;
    }
    // Validar que no haya conflicto de horario en frontend
    if (formData.espacio || formData.destino) {
      const eventoEditId = modoEdicion ? eventoActual?._id : undefined;
      const conflicto = eventos.find(ev => {
        if (!ev.activo) return false;
        if (eventoEditId && ev._id === eventoEditId) return false;
        if (formData.espacio) {
          if (getSalaId(ev.espacio) !== formData.espacio) return false;
        } else {
          if (getDestinoId(ev.destino) !== formData.destino) return false;
        }
        if (toInputDate(ev.fecha) !== formData.fecha) return false;
        return hayTraslapeH(formData.horaInicio, formData.horaFin, ev.horaInicio, ev.horaFin);
      });
      if (conflicto) {
        setModalError(`⛔ El horario ${formData.horaInicio}–${formData.horaFin} ya está ocupado por "${conflicto.titulo}". Selecciona otro horario.`);
        return;
      }
    }
    setSaving(true); setModalError("");
    // cuposDisponibles = cupos al crear; en edición se preserva el valor del servidor
    const payload = {
      ...formData,
      cuposDisponibles: modoEdicion ? (eventoActual?.cuposDisponibles ?? formData.cupos) : formData.cupos,
      espacio: formData.espacio || null,
    };
    try {
      if (modoEdicion && eventoActual) {
        await api.put(`/events/${eventoActual._id}`, payload);
      } else {
        const resEv = await api.post("/events", payload);
        const nuevoId = resEv.data?.data?._id || resEv.data?._id;
        if (nuevoId && imagenPendiente) {
          try {
            const fd = new FormData();
            fd.append("image", imagenPendiente);
            await api.post(`/events/${nuevoId}/image`, fd, { headers: { "Content-Type": "multipart/form-data" } });
          } catch { /* imagen no crítica */ }
          setImagenPendiente(null);
        }
      }
      cerrarModal(); fetchEventos();
      setTabActivo("mios");
    } catch (err: any) {
      setModalError(err.response?.data?.error || "Error al guardar el evento.");
    } finally { setSaving(false); }
  };

  const eliminarEvento = async (ev: Evento) => {
    if (!esMio(ev)) return;
    confirmar(`¿Eliminar "${ev.titulo}" permanentemente? Esta acción no se puede deshacer.`, async () => {
      try { await api.delete(`/events/${ev._id}`); fetchEventos(); }
      catch { setModalError("Error al eliminar."); }
    });
  };

  const toggleActivo = async (ev: Evento) => {
    if (!esMio(ev)) return;
    try {
      if (ev.activo) await api.patch(`/events/${ev._id}/deactivate`);
      else await api.put(`/events/${ev._id}`, { activo: true });
      fetchEventos();
    } catch { /* silencioso */ }
  };

  /* ═══════════ RENDER ═══════════ */
  /* ── Imagen de evento ── */
  const subirImagenEvento = async (id: string, file: File) => {
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      await api.post(`/events/${id}/image`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      fetchEventos();
    } catch { setModalError("Error al subir la imagen."); }
    finally { setUploadingImg(false); }
  };

  const eliminarImagenEvento = async (id: string) => {
    setUploadingImg(true);
    try {
      await api.delete(`/events/${id}/image`);
      fetchEventos();
    } catch { setModalError("Error al eliminar la imagen."); }
    finally { setUploadingImg(false); }
  };

  return (
    <div className="ge-container">
      <NavAdmin />

      <div className="ge-main">

        {/* ── Header ── */}
        <header className="ge-header">
          <div className="ge-header-left">
            <h1>Gestión de Eventos</h1>
            <p>{eventosMios.length} mis eventos · {eventos.length} total</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="ge-badge-rol">Admin</span>
            <button className="ge-btn-nuevo" onClick={abrirAgregar}>
              <Plus size={16} /> Nuevo Evento
            </button>
          </div>
        </header>

        {/* ── Tabs ── */}
        <div className="ge-tabs-bar">
          <button
            className={`ge-tab ${tabActivo === "mios" ? "active" : ""}`}
            onClick={() => { setTabActivo("mios"); setBusqueda(""); setPagina(1); }}
          >
            <Calendar size={15} />
            Mis Eventos
            <span className="ge-tab-count">{eventosMios.length}</span>
          </button>
          <button
            className={`ge-tab ${tabActivo === "todos" ? "active" : ""}`}
            onClick={() => { setTabActivo("todos"); setBusqueda(""); setPagina(1); }}
          >
            <Users size={15} />
            Eventos Generales
            <span className="ge-tab-count">{eventosGeneral.length}</span>
          </button>
        </div>

        {/* ── Contenido ── */}
        <div className="ge-content">

          {/* Aviso tab general */}
          {tabActivo === "todos" && (
            <div className="ge-readonly-notice">
              <Info size={15} />
              Eventos de otros administradores. Puedes ver los inscritos de cada evento.
            </div>
          )}

          {/* Toolbar búsqueda */}
          <div className="ge-toolbar">
            <div className="ge-search-wrapper">
              <Search size={15} />
              <input
                type="text"
                className="ge-search"
                placeholder={tabActivo === "mios" ? "Buscar en mis eventos…" : "Buscar en eventos generales…"}
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
            </div>
            {busqueda && (
              <button
                onClick={() => setBusqueda("")}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "transparent", border: "1.5px solid var(--border)", color: "var(--gray-500)", padding: "8px 12px", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "0.82rem", fontFamily: "var(--font-sans)" }}
              >
                <X size={13} /> Limpiar
              </button>
            )}
            <span style={{ color: "var(--gray-400)", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
              {listaFiltrada.length} de {listaActiva.length} eventos
            </span>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: "var(--red-50)", border: "1px solid rgba(220,38,38,.15)", color: "var(--red-600)", padding: "10px 14px", borderRadius: "var(--radius-md)", fontSize: "0.875rem", marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Tabla */}
          {loading ? (
            <p style={{ color: "var(--gray-400)", padding: 24, fontFamily: "var(--font-sans)" }}>Cargando eventos…</p>
          ) : (
            <div className="ge-table-wrapper">
              <table className="ge-table">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th><MapPin size={12} style={{ verticalAlign: "middle" }} /> Lugar</th>
                    <th>Fecha</th>
                    <th><Clock size={12} style={{ verticalAlign: "middle" }} /> Horario</th>
                    <th><Users size={12} style={{ verticalAlign: "middle" }} /> Cupos</th>
                    <th>Estado</th>
                    <th style={{ width: 130 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {listaFiltrada.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="ge-empty">
                          <Calendar size={38} />
                          <h3>
                            {busqueda
                              ? `Sin resultados para "${busqueda}"`
                              : tabActivo === "mios"
                                ? "Aún no has creado ningún evento"
                                : "No hay eventos de otros administradores"}
                          </h3>
                          <p>
                            {tabActivo === "mios" && !busqueda
                              ? "Pulsa «Nuevo Evento» para crear el primero."
                              : ""}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    listaPagina.map(ev => {
                      const mio = esMio(ev);
                      const pocosLugar = ev.cuposDisponibles <= Math.ceil(ev.cupos * 0.2);
                      return (
                        <tr key={ev._id} className={!mio ? "ge-row-locked" : ""}>
                          <td>
                            <div className="ge-cell-titulo">
                              <strong>{ev.titulo}</strong>
                              {ev.descripcion && <span>{ev.descripcion.slice(0, 60)}{ev.descripcion.length > 60 ? "…" : ""}</span>}
                            </div>
                          </td>
                          <td>
                            <span className="ge-badge ge-badge-lugar">
                              {getNombreDestino(ev.destino)}
                            </span>
                          </td>
                          <td style={{ fontSize: "0.84rem", color: "var(--gray-600)", whiteSpace: "nowrap" }}>
                            {formatFecha(ev.fecha)}
                          </td>
                          <td style={{ fontSize: "0.84rem", color: "var(--gray-600)", whiteSpace: "nowrap" }}>
                            {ev.horaInicio} – {ev.horaFin}
                          </td>
                          <td>
                            <span className={`ge-badge ge-badge-cupos ${pocosLugar ? "bajo" : ""}`}>
                              {ev.cuposDisponibles}/{ev.cupos}
                            </span>
                          </td>
                          <td>
                            {ev.activo
                              ? <span className="ge-estatus-activo">Activo</span>
                              : <span className="ge-estatus-inactivo">Inactivo</span>
                            }
                          </td>
                          <td>
                            <div className="ge-acciones">
                              {/* Ver inscritos — siempre disponible */}
                              <button
                                className="ge-btn-icon"
                                title="Ver inscritos"
                                onClick={() => { setInvEvento(ev); setShowInvModal(true); fetchInvitaciones(ev._id); }}
                              >
                                <Eye size={15} />
                              </button>

                              {mio ? (
                                <>
                                  <button className="ge-btn-icon" title="Editar" onClick={() => abrirEditar(ev)}>
                                    <Pencil size={15} />
                                  </button>
                                  <button
                                    className="ge-btn-icon"
                                    title={ev.activo ? "Desactivar" : "Activar"}
                                    onClick={() => toggleActivo(ev)}
                                  >
                                    {ev.activo ? <PowerOff size={15} /> : <Power size={15} />}
                                  </button>
                                  <button className="ge-btn-icon danger" title="Eliminar" onClick={() => eliminarEvento(ev)}>
                                    <Trash2 size={15} />
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
          <Paginacion total={listaFiltrada.length} porPagina={POR_PAGINA} paginaActual={pagina} onChange={setPagina} />
        </div>
      </div>

      {/* ══ Modal CRUD ══ */}
      {showModal && (
        <div className="ge-modal-overlay">
          <div className="ge-modal">
            <div className="ge-modal-header">
              <div>
                <h2>{modoEdicion ? "Editar Evento" : "Nuevo Evento"}</h2>
                <p>{modoEdicion ? "Modifica los datos del evento" : "Crea un nuevo evento para tu agenda"}</p>
              </div>
              <button className="ge-modal-close" onClick={cerrarModal}><X size={17} /></button>
            </div>

            <div className="ge-modal-body">
              <div>
                <label className="ge-form-label">Título del evento *</label>
                <input className="ge-input" name="titulo" placeholder="Ej. Conferencia de bienvenida"
                  value={formData.titulo} onChange={handleChange} />
              </div>

              <div>
                <label className="ge-form-label">Descripción <span>(opcional)</span></label>
                <textarea className="ge-textarea" name="descripcion" placeholder="Describe el evento brevemente…"
                  value={formData.descripcion} onChange={handleChange} rows={2} />
              </div>

              <div>
                <label className="ge-form-label">Lugar *</label>
                <select className="ge-select" name="destino" value={formData.destino} onChange={handleChange}>
                  <option value="">— Selecciona un lugar —</option>
                  {destinos.map(d => <option key={d._id} value={d._id}>{d.nombre}</option>)}
                </select>
              </div>

              {formData.destino && (
                <div>
                  <label className="ge-form-label">Sala / Aula <span>(opcional)</span></label>
                  {loadingEspacios ? (
                    <p className="ge-form-hint">Cargando aulas…</p>
                  ) : espaciosDestino.length > 0 ? (
                    <select className="ge-select" name="espacio" value={formData.espacio} onChange={handleChange}>
                      <option value="">— Sin sala específica —</option>
                      {espaciosDestino.map(esp => (
                        <option key={esp._id} value={esp._id} disabled={esp.ocupado}>
                          {esp.nombre} · Planta {esp.planta} · {esp.cupos} cupos{esp.ocupado ? " (Ocupado)" : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="ge-form-hint">Sin aulas registradas en este lugar.</p>
                  )}
                </div>
              )}

              <div>
                <label className="ge-form-label">Fecha del evento *</label>
                <input className="ge-input" type="date" name="fecha" value={formData.fecha}
                  min={modoEdicion ? undefined : getTodayStr()} onChange={handleChange} />
              </div>

              <GrillaHorarios
                eventos={eventos} espacioId={formData.espacio} destinoId={formData.destino}
                fecha={formData.fecha} horaInicioSel={formData.horaInicio} horaFinSel={formData.horaFin}
                eventoEditandoId={eventoActual?._id} onChange={handleHorarioChange}
              />

              {/* Horas — solo lectura, se asignan desde la grilla */}
              {(formData.horaInicio || formData.horaFin) && (
                <div className="ge-form-grid">
                  <div>
                    <label className="ge-form-label">Hora inicio</label>
                    <input className="ge-input" type="time" value={formData.horaInicio} readOnly
                      style={{ background: "var(--gray-50)", cursor: "default", color: "var(--gray-700)" }} />
                  </div>
                  <div>
                    <label className="ge-form-label">Hora fin</label>
                    <input className="ge-input" type="time" value={formData.horaFin} readOnly
                      style={{ background: "var(--gray-50)", cursor: "default", color: "var(--gray-700)" }} />
                  </div>
                </div>
              )}
              {formData.horaInicio && formData.horaFin && (
                <p style={{ fontSize: "0.78rem", color: "var(--gray-400)", margin: "-4px 0 4px", padding: "6px 10px", background: "rgba(59,130,246,0.05)", borderRadius: 6, border: "1px solid rgba(59,130,246,0.12)" }}>
                  ℹ️ Se agrega automáticamente un margen de 30 min al final del evento para transición entre actividades.
                </p>
              )}

              <div className="ge-form-grid">
                <div>
                  <label className="ge-form-label">Cupos totales *</label>
                  <input className="ge-input" type="number" name="cupos" min={1} value={formData.cupos} onChange={handleChange} />
                </div>
                {modoEdicion && eventoActual && (
                  <div>
                    <label className="ge-form-label">Cupos disponibles</label>
                    <input className="ge-input" type="number" value={eventoActual.cuposDisponibles} disabled
                      style={{ opacity: 0.6, cursor: "not-allowed" }} />
                    <p style={{ fontSize: "0.75rem", color: "var(--gray-400)", margin: "4px 0 0" }}>
                      Se actualiza automáticamente con las suscripciones.
                    </p>
                  </div>
                )}
              </div>

              {/* Imagen del evento — solo al editar */}
              {modoEdicion && eventoActual && (
                <div style={{ marginTop: 8 }}>
                  <label className="ge-form-label">Imagen del evento</label>
                  <div style={{ marginTop: 6 }}>
                    <ImageUploader
                      currentImage={eventoActual.image}
                      onUpload={file => subirImagenEvento(eventoActual._id, file)}
                      onDelete={() => eliminarImagenEvento(eventoActual._id)}
                      uploading={uploadingImg}
                      shape="rect"
                      size={130}
                    />
                  </div>
                </div>
              )}

              {!modoEdicion && (
                <div style={{ marginTop: 8 }}>
                  <label className="ge-form-label">Imagen del evento <span style={{ fontWeight: 400, color: "var(--gray-400)" }}>(opcional)</span></label>
                  <div style={{ marginTop: 6 }}>
                    <ImageUploader
                      currentImage={imagenPendiente ? URL.createObjectURL(imagenPendiente) : null}
                      onUpload={async (file) => setImagenPendiente(file)}
                      onDelete={async () => setImagenPendiente(null)}
                      uploading={false}
                      shape="rect"
                      size={130}
                    />
                  </div>
                </div>
              )}

              {modalError && <div className="ge-modal-error">{modalError}</div>}
            </div>

            <div className="ge-modal-footer">
              <button className="ge-btn-cancelar" onClick={cerrarModal}>Cancelar</button>
              <button className="ge-btn-guardar" onClick={guardarEvento} disabled={saving}>
                {saving ? "Guardando…" : modoEdicion ? "Actualizar" : "Crear Evento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal Inscritos ══ */}
      {showInvModal && (
        <div className="ge-modal-overlay">
          <div className="ge-modal" style={{ width: 600 }}>
            <div className="ge-modal-header">
              <div>
                <h2>Usuarios inscritos</h2>
                <p>{invEvento?.titulo}</p>
              </div>
              <button className="ge-modal-close" onClick={() => setShowInvModal(false)}><X size={17} /></button>
            </div>

            <div className="ge-modal-body">
              {loadingInv && <p style={{ color: "var(--gray-400)", textAlign: "center", padding: 24 }}>Cargando inscritos…</p>}

              {!loadingInv && invitaciones.length === 0 && (
                <div className="ge-empty" style={{ padding: "32px 0" }}>
                  <Users size={32} />
                  <h3>Sin inscritos aún</h3>
                  <p>Los usuarios se registran desde la app móvil.</p>
                </div>
              )}

              {!loadingInv && invitaciones.length > 0 && (
                <>
                  <p style={{ color: "var(--gray-400)", fontSize: "0.82rem", margin: "0 0 10px" }}>
                    {invitaciones.length} solicitud(es)
                  </p>
                  <div style={{ overflowX: "auto" }}>
                    <table className="ge-inv-table">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Correo</th>
                          <th>Invitación</th>
                          <th>Asistencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invitaciones.map(inv => {
                          const u = (inv.usuario && typeof inv.usuario === "object") ? inv.usuario as UsuarioInv : null;
                          return (
                            <tr key={inv._id}>
                              <td>{u ? (u.nombre || u.name || "Sin nombre") : "—"}</td>
                              <td style={{ color: "var(--gray-500)", fontSize: "0.82rem" }}>{u ? (u.email || u.correo || "Sin correo") : "—"}</td>
                              <td><span className={invBadgeClass(inv.estadoInvitacion)}>{labelEstado[inv.estadoInvitacion] || inv.estadoInvitacion}</span></td>
                              <td><span className={invBadgeClass(inv.estadoAsistencia)}>{labelEstado[inv.estadoAsistencia] || inv.estadoAsistencia}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="ge-modal-footer">
              <button className="ge-btn-cancelar" onClick={() => setShowInvModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        open={confirmOpen}
        mensaje={confirmMsg}
        onConfirm={() => { setConfirmOpen(false); confirmFn(); }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};;

export default GestionEventos;