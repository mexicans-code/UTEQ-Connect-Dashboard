import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/Eventos.css";
import NavSpAdmin from "../components/NavSpAdmin";
import {
  Plus, Pencil, Trash2, Power, PowerOff, X,
  MapPin, Users, Clock, ChevronLeft, ChevronRight, Eye,
  AlertTriangle, CheckCircle2, Lock, FileDown,
} from "lucide-react";
import api from "../../api/axios";
import ConfirmModal from "../../components/ConfirmModal";
import Paginacion from "../../components/Paginacion";
import { exportEventosPDF } from "../../utils/pdfExport";
import ImageUploader from "../../components/ImageUploader";
import { API_URL } from "../../api/config";

/* ═══════════════ INTERFACES ═══════════════ */

interface Destino { _id: string; nombre: string; }
interface Espacio { _id: string; nombre: string; planta: string; cupos: number; }

interface Evento {
  _id: string; titulo: string; descripcion?: string;
  fecha: string;
  horaInicio: string; horaFin: string;
  destino: Destino | string;
  espacio?: { _id: string; nombre: string } | string | null;
  cupos: number; cuposDisponibles: number; activo: boolean; image?: string;
  creadoPor?: { _id: string; nombre: string; email: string } | string;
}

interface FormData {
  titulo: string; descripcion: string;
  fecha: string;
  horaInicio: string; horaFin: string;
  destino: string; espacio: string;
  cupos: number;
}

interface ConflictoInfo {
  eventoId: string;
  eventoTitulo: string;
  horaInicio: string;
  horaFin: string;
  cuposEvento: number;
  nuevoDestino: string;
  nuevoEspacio: string;
  espaciosCargados: Espacio[];
  espaciosExternos: Array<{ destinoId: string; destinoNombre: string; espacios: Espacio[] }>;
  loadingEspacios: boolean;
}

const EMPTY_FORM: FormData = {
  titulo: "", descripcion: "", fecha: "",
  horaInicio: "", horaFin: "", destino: "", espacio: "", cupos: 1,
};

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const FRANJAS = Array.from({ length: 31 }, (_, i) => {
  const t = 7 * 60 + i * 30;
  return `${Math.floor(t / 60).toString().padStart(2, "0")}:${(t % 60).toString().padStart(2, "0")}`;
});

/* ═══════════════ HELPERS ═══════════════ */

const formatFecha = (iso: string) => !iso ? "—"
  : new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const toInputDate = (iso: string) => iso ? iso.split("T")[0] : "";
const nombreDestino = (d: Destino | string) => !d ? "—" : typeof d === "string" ? d : d.nombre;
const getDestinoId = (d: Destino | string) => !d ? "" : typeof d === "string" ? d : d._id;
const getSalaId = (e: Evento["espacio"]) => !e ? "" : typeof e === "string" ? e : (e as any)._id;
const toMin = (h: string) => { const [hh, mm] = h.split(":").map(Number); return hh * 60 + mm; };
const hayTraslapeH = (h1i: string, h1f: string, h2i: string, h2f: string) =>
  toMin(h1i) < toMin(h2f) && toMin(h1f) > toMin(h2i);



/* ═══════════════ GRILLA DE HORARIOS ═══════════════ */

interface GrillaHorariosProps {
  eventos: Evento[]; espacioId: string; destinoId: string;
  fecha: string;
  horaInicioSel: string; horaFinSel: string;
  esSuperAdmin: boolean; eventoEditandoId?: string;
  modoEdicion?: boolean;
  onChange: (horaInicio: string, horaFin: string) => void;
}

const GrillaHorarios: React.FC<GrillaHorariosProps> = ({
  eventos, espacioId, destinoId, fecha,
  horaInicioSel, horaFinSel, esSuperAdmin, eventoEditandoId, modoEdicion, onChange,
}) => {
  const [arrastrando, setArrastrando] = useState(false);
  const [franjaInicio, setFranjaInicio] = useState<number | null>(null);
  const [franjaFin, setFranjaFin] = useState<number | null>(null);

  const franjaMinIdx = useMemo(() => {
    if (modoEdicion) return 0;
    if (!fecha) return 0;
    if (fecha !== getTodayStr()) return 0;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const idx = FRANJAS.slice(0, -1).findIndex((_, i) => {
      const [hh, mm] = FRANJAS[i].split(":").map(Number);
      return hh * 60 + mm > nowMin;
    });
    return idx === -1 ? FRANJAS.length - 1 : idx;
  }, [fecha, modoEdicion]);

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

  const handleMouseDown = (idx: number) => {
    if (idx < franjaMinIdx) return;
    if (franjasOcupadas.has(idx) && !esSuperAdmin) return;
    setArrastrando(true); setFranjaInicio(idx); setFranjaFin(idx + 1);
  };
  const handleMouseEnter = (idx: number) => {
    if (!arrastrando || franjaInicio === null) return;
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
        {esSuperAdmin && (
          <span style={{ fontSize: "0.72rem", color: "#d97706", marginLeft: 4, fontWeight: 500 }}>
            · Puedes tomar horarios ocupados (se pedirá reubicar el evento)
          </span>
        )}
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
            claseExtra = esSuperAdmin ? "ocupado-superadmin" : "ocupado-admin";
            titulo = `Ocupado: ${ev!.titulo} (${ev!.horaInicio}–${ev!.horaFin})`;
          }
          if (seleccionada) claseExtra = ocupado ? "seleccionado-ocupado" : "seleccionado";
          return (
            <div key={franja} title={titulo} className={`grilla-franja ${claseExtra}`}
              onMouseDown={() => handleMouseDown(idx)}
              onMouseEnter={() => handleMouseEnter(idx)}
              onMouseUp={handleMouseUp}
              style={{ cursor: esPasada ? "not-allowed" : undefined }}>
              {franja}
              {esPasada && (
                <span style={{ position: "absolute", top: 1, right: 2, fontSize: "0.6rem", opacity: 0.5 }}>✕</span>
              )}
              {!esPasada && ocupado && !seleccionada && (
                <span style={{ position: "absolute", top: 1, right: 2, fontSize: "0.6rem" }}>
                  {esSuperAdmin ? "⚠" : <Lock size={8} />}
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
          <span style={{ width: 10, height: 10, background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 2, display: "inline-block" }} />Ocupado
        </span>
        {esSuperAdmin && (
          <span className="grilla-leyenda-item" style={{ color: "#d97706" }}>
            <span style={{ width: 10, height: 10, background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 2, display: "inline-block" }} />Ocupado (puedes tomar)
          </span>
        )}
      </div>
      {horaInicioSel && horaFinSel && (
        <p className="grilla-resumen">Horario seleccionado: <strong>{horaInicioSel} – {horaFinSel}</strong></p>
      )}
    </div>
  );
};

/* ═══════════════ COMPONENTE PRINCIPAL ═══════════════ */

const Eventos: React.FC = () => {
  const rolActual = localStorage.getItem("rol") || "admin";
  const userIdActual = localStorage.getItem("userId") || "";
  const esSuperAdmin = rolActual === "superadmin";
  const navigate = useNavigate();

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [espaciosDestino, setEspaciosDestino] = useState<Espacio[]>([]);
  const [loadingEspacios, setLoadingEspacios] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 15;

  const [showModal, setShowModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [eventoActual, setEventoActual] = useState<Evento | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState("");
  const [confirmFn, setConfirmFn] = useState<() => void>(() => () => { });
  const confirmar = (msg: string, fn: () => void) => { setConfirmMsg(msg); setConfirmFn(() => fn); setConfirmOpen(true); };
  const [uploadingImg, setUploadingImg] = useState(false);
  const [imagenPendiente, setImagenPendiente] = useState<File | null>(null);
  const [modalError, setModalError] = useState("");
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);

  const [paso, setPaso] = useState<1 | 2>(1);
  const [conflicto, setConflicto] = useState<ConflictoInfo | null>(null);

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);

  const eventosPagina = eventos.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const puedeEditar = (ev: Evento) => {
    if (esSuperAdmin) return true;
    const cId = typeof ev.creadoPor === "object" && ev.creadoPor ? ev.creadoPor._id : ev.creadoPor;
    return cId === userIdActual;
  };

  /* ── Fetches ── */
  const fetchEventos = async () => {
    setLoading(true); setError("");
    try {
      const res = await api.get("/events");
      const raw = res.data;
      const lista: Evento[] = Array.isArray(raw) ? raw
        : Array.isArray(raw.data) ? raw.data
          : (Object.values(raw).find(v => Array.isArray(v)) as Evento[] || []);
      setEventos(lista);
    } catch { setError("Error al cargar eventos."); }
    finally { setLoading(false); }
  };

  const fetchDestinos = async () => {
    try {
      const res = await api.get("/locations");
      const raw = res.data;
      setDestinos(Array.isArray(raw) ? raw : (raw.data ?? []));
    } catch { }
  };

  const fetchEspaciosPorDestino = async (destinoId: string): Promise<Espacio[]> => {
    if (!destinoId) { setEspaciosDestino([]); return []; }
    setLoadingEspacios(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/espacios/destino/${destinoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const raw = await res.json();
      const lista: Espacio[] = Array.isArray(raw) ? raw : (raw.data || []);
      setEspaciosDestino(lista);
      return lista;
    } catch { setEspaciosDestino([]); return []; }
    finally { setLoadingEspacios(false); }
  };

  const fetchEspaciosParaConflicto = async (destinoId: string) => {
    const cuposEvento = conflicto?.cuposEvento || 1;

    if (!destinoId || !formData.fecha || !formData.horaInicio || !formData.horaFin) {
      setConflicto(p => p ? {
        ...p,
        nuevoDestino: "",
        nuevoEspacio: "",
        espaciosCargados: [],
        espaciosExternos: [],
        loadingEspacios: false,
      } : p);
      return;
    }

    setConflicto(p => p ? {
      ...p,
      nuevoDestino: destinoId,
      nuevoEspacio: "",
      espaciosCargados: [],
      espaciosExternos: [],
      loadingEspacios: true,
    } : p);

    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        destinoId,
        fecha: formData.fecha,
        horaInicio: formData.horaInicio,
        horaFin: formData.horaFin,
        cupos: String(cuposEvento),
      });
      const res = await fetch(`${API_URL}/espacios/sugerencias?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const raw = await res.json();
      const libresMismo: Espacio[] = Array.isArray(raw) ? raw : (raw.data || []);

      const externos: Array<{ destinoId: string; destinoNombre: string; espacios: Espacio[] }> = [];
      await Promise.all(destinos
        .filter(d => d._id !== destinoId)
        .map(async d => {
          try {
            const p2 = new URLSearchParams({
              destinoId: d._id,
              fecha: formData.fecha,
              horaInicio: formData.horaInicio,
              horaFin: formData.horaFin,
              cupos: String(cuposEvento),
            });
            const res2 = await fetch(`${API_URL}/espacios/sugerencias?${p2}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const raw2 = await res2.json();
            const libresOtros: Espacio[] = Array.isArray(raw2) ? raw2 : (raw2.data || []);
            if (libresOtros.length > 0) {
              externos.push({ destinoId: d._id, destinoNombre: d.nombre, espacios: libresOtros });
            }
          } catch { }
        })
      );

      setConflicto(p => p ? {
        ...p,
        espaciosCargados: libresMismo,
        espaciosExternos: externos,
        loadingEspacios: false,
      } : p);
    } catch {
      setConflicto(p => p ? {
        ...p,
        espaciosCargados: [],
        espaciosExternos: [],
        loadingEspacios: false,
      } : p);
    }
  };

  const seleccionarSalaReubicacion = (destinoId: string, salaId: string) => {
    setConflicto(p => p ? {
      ...p,
      nuevoDestino: destinoId,
      nuevoEspacio: salaId,
    } : p);
  };

  useEffect(() => { fetchEventos(); fetchDestinos(); }, []);

  /* ── Calendario ── */
  const diasEnMes = new Date(calYear, calMonth + 1, 0).getDate();
  const primerDia = new Date(calYear, calMonth, 1).getDay();
  const eventosPorDia = (dia: number) => {
    const ds = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    return eventos.filter(ev => toInputDate(ev.fecha) === ds);
  };
  const mesAnterior = () => { calMonth === 0 ? (setCalMonth(11), setCalYear(y => y - 1)) : setCalMonth(m => m - 1); setDiaSeleccionado(null); };
  const mesSiguiente = () => { calMonth === 11 ? (setCalMonth(0), setCalYear(y => y + 1)) : setCalMonth(m => m + 1); setDiaSeleccionado(null); };
  const eventosDelDia = diaSeleccionado ? eventos.filter(ev => toInputDate(ev.fecha) === diaSeleccionado) : [];

  /* ── Modal ── */
  const abrirAgregar = () => {
    setModoEdicion(false); setEventoActual(null);
    setFormData(EMPTY_FORM); setModalError("");
    setEspaciosDestino([]); setPaso(1); setConflicto(null);
    setShowModal(true);
  };
  const abrirEditar = (ev: Evento) => {
    if (!puedeEditar(ev)) return;
    setModoEdicion(true); setEventoActual(ev);
    const destinoId = getDestinoId(ev.destino);
    setFormData({
      titulo: ev.titulo, descripcion: ev.descripcion || "",
      fecha: toInputDate(ev.fecha),
      horaInicio: ev.horaInicio, horaFin: ev.horaFin,
      destino: destinoId, espacio: getSalaId(ev.espacio),
      cupos: ev.cupos,
    });
    fetchEspaciosPorDestino(destinoId);
    setModalError(""); setPaso(1); setConflicto(null);
    setShowModal(true);
  };
  const cerrarModal = () => {
    setShowModal(false); setModalError("");
    setPaso(1); setConflicto(null);
    setFormData(EMPTY_FORM); setModoEdicion(false);
    setEventoActual(null); setImagenPendiente(null);
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

  /* ── Paso 1: Validar y guardar ── */
  const guardarEvento = async () => {
    if (!formData.titulo || !formData.fecha || !formData.horaInicio || !formData.horaFin || !formData.destino) {
      setModalError("Completa todos los campos obligatorios."); return;
    }
    if (formData.destino && espaciosDestino.length === 0) {
      setModalError("El lugar seleccionado no tiene espacios disponibles. No se puede crear el evento."); return;
    }
    if (formData.espacio) {
      const espacioSeleccionado = espaciosDestino.find(esp => esp._id === formData.espacio);
      if (espacioSeleccionado && formData.cupos > espacioSeleccionado.cupos) {
        setModalError(`El espacio seleccionado tiene capacidad de ${espacioSeleccionado.cupos} y no es suficiente para ${formData.cupos} cupos.`);
        return;
      }
    }
    if (!modoEdicion) {
      if (formData.fecha < getTodayStr()) {
        setModalError("No puedes crear eventos en fechas pasadas."); return;
      }
      if (formData.fecha === getTodayStr()) {
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const [hh, mm] = formData.horaInicio.split(":").map(Number);
        if (hh * 60 + mm <= nowMin) {
          setModalError("No puedes crear eventos en horarios que ya pasaron."); return;
        }
      }
    }
    if (toMin(formData.horaFin) <= toMin(formData.horaInicio)) {
      setModalError("La hora de fin debe ser posterior a la hora de inicio."); return;
    }

    if (esSuperAdmin && formData.espacio) {
      const eventoEditId = modoEdicion ? eventoActual?._id : undefined;
      const eventoConflictivo = eventos.find(ev => {
        if (!ev.activo) return false;
        if (eventoEditId && ev._id === eventoEditId) return false;
        if (getSalaId(ev.espacio) !== formData.espacio) return false;
        if (toInputDate(ev.fecha) !== formData.fecha) return false;
        return hayTraslapeH(formData.horaInicio, formData.horaFin, ev.horaInicio, ev.horaFin);
      });

      if (eventoConflictivo) {
        setConflicto({
          eventoId: eventoConflictivo._id,
          eventoTitulo: eventoConflictivo.titulo,
          horaInicio: eventoConflictivo.horaInicio,
          horaFin: eventoConflictivo.horaFin,
          cuposEvento: eventoConflictivo.cupos,
          nuevoDestino: "",
          nuevoEspacio: "",
          espaciosCargados: [],
          espaciosExternos: [],
          loadingEspacios: false,
        });
        setModalError("");
        setPaso(2);
        fetchEspaciosParaConflicto(formData.destino);
        return;
      }
    }

    await _ejecutarGuardado();
  };

  const _ejecutarGuardado = async () => {
    setSaving(true); setModalError("");

    const dataToSend = {
      ...formData,
      espacio: formData.espacio || null,
    };
    try {
      if (modoEdicion && eventoActual) {
        await api.put(`/events/${eventoActual._id}`, dataToSend);
        if (imagenPendiente) {
          try {
            const fd = new FormData();
            fd.append("image", imagenPendiente);
            await api.put(`/events/${eventoActual._id}/image`, fd, { headers: { "Content-Type": "multipart/form-data" } });
          } catch { }
        }
      } else {
        const resEv = await api.post("/events", { ...dataToSend, creadoPor: userIdActual || undefined });
        const nuevoId = resEv.data?.data?._id || resEv.data?._id;
        if (nuevoId && imagenPendiente) {
          try {
            const fd = new FormData();
            fd.append("image", imagenPendiente);
            await api.post(`/events/${nuevoId}/image`, fd, { headers: { "Content-Type": "multipart/form-data" } });
          } catch { }
          setImagenPendiente(null);
        }
      }
      cerrarModal(); fetchEventos();
    } catch (err: any) {
      const data = err.response?.data;
      if (esSuperAdmin) {
        let eventoConf: any = null;
        try {
          if (data?.error?.startsWith?.("CONFLICT_SALA::"))
            eventoConf = JSON.parse(data.error.replace("CONFLICT_SALA::", ""));
          else if (err.response?.status === 409 && data?.conflictoSala)
            eventoConf = data.conflictoSala;
        } catch { }
        if (eventoConf) {
          setConflicto({
            eventoId: eventoConf.id || eventoConf._id,
            eventoTitulo: eventoConf.titulo,
            horaInicio: eventoConf.horaInicio,
            horaFin: eventoConf.horaFin,
            cuposEvento: eventoConf.cupos || 1,
            nuevoDestino: "",
            nuevoEspacio: "",
            espaciosCargados: [],
            espaciosExternos: [],
            loadingEspacios: false,
          });
          setModalError("");
          setPaso(2);
          fetchEspaciosParaConflicto(formData.destino);
          return;
        }
      }
      setModalError(data?.error || "Error al guardar evento.");
    } finally { setSaving(false); }
  };

  /* ── Paso 2: Confirmar reasignación ── */
  const confirmarReasignacion = async () => {
    if (!conflicto) return;
    if (!conflicto.nuevoDestino || !conflicto.nuevoEspacio) {
      setModalError("Selecciona un lugar y un espacio donde reubicar el evento existente.");
      return;
    }
    setSaving(true); setModalError("");
    const dataToSend = {
      ...formData,
      cuposDisponibles: modoEdicion ? (eventoActual?.cuposDisponibles ?? formData.cupos) : formData.cupos,
      espacio: formData.espacio || null,
    };
    try {
      if (modoEdicion && eventoActual) {
        await api.put(`/events/${eventoActual._id}/reasignar-actualizar`, {
          eventoPrevioId: conflicto.eventoId,
          nuevaEspacioId: conflicto.nuevoEspacio || undefined,
          nuevaDestinoPrevioId: conflicto.nuevoDestino || undefined,
          updateData: dataToSend,
        });

        if (imagenPendiente) {
          try {
            const fd = new FormData();
            fd.append("image", imagenPendiente);
            await api.put(`/events/${eventoActual._id}/image`, fd, { headers: { "Content-Type": "multipart/form-data" } });
          } catch { }
        }
      } else {
        const resReasignar = await api.post("/events/reasignar-crear", {
          eventoPrevioId: conflicto.eventoId,
          nuevaEspacioId: conflicto.nuevoEspacio || undefined,
          nuevaDestinoPrevioId: conflicto.nuevoDestino || undefined,
          nuevoEvento: { ...dataToSend, creadoPor: userIdActual || undefined },
        });
        const nuevoId = resReasignar.data?.data?._id || resReasignar.data?._id;
        if (nuevoId && imagenPendiente) {
          try {
            const fd = new FormData();
            fd.append("image", imagenPendiente);
            await api.post(`/events/${nuevoId}/image`, fd, { headers: { "Content-Type": "multipart/form-data" } });
          } catch { }
          setImagenPendiente(null);
        }
      }
      cerrarModal(); fetchEventos();
    } catch (err: any) {
      setModalError(err.response?.data?.error || "Error al reasignar.");
    } finally { setSaving(false); }
  };

  /* ── Acciones tabla ── */
  const eliminarEvento = async (ev: Evento) => {
    if (!puedeEditar(ev)) return;
    confirmar("¿Eliminar este evento permanentemente? Esta acción no se puede deshacer.", async () => {
      try { await api.delete(`/events/${ev._id}`); fetchEventos(); }
      catch { setModalError("Error al eliminar."); }
    });
  };

  const toggleActivo = async (ev: Evento) => {
    if (!puedeEditar(ev)) return;
    try {
      if (ev.activo) await api.patch(`/events/${ev._id}/deactivate`);
      else await api.put(`/events/${ev._id}`, { activo: true });
      fetchEventos();
    } catch { }
  };

  const nombreCreador = (ev: Evento) => {
    if (!ev.creadoPor || typeof ev.creadoPor === "string") return "—";
    return `${ev.creadoPor.nombre}`;
  };

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

  /* ═══════════════ RENDER ═══════════════ */
  return (
    <div className="eventos-container">
      <NavSpAdmin />
      <div className="eventos-main">
        <header className="eventos-header">
          <div>
            <h1>Gestión de Eventos</h1>
            <p>{eventos.length} evento(s) registrados</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => exportEventosPDF(eventos)}
              title="Descargar PDF"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 14px", borderRadius: "var(--radius-sm)",
                background: "#e53e3e", color: "#fff", border: "none",
                cursor: "pointer", fontSize: "0.85rem", fontWeight: 600,
              }}
            >
              <FileDown size={15} /> Descargar PDF
            </button>
            <span style={{
              fontSize: "0.75rem", padding: "4px 12px", borderRadius: 20,
              background: esSuperAdmin ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.15)",
              color: esSuperAdmin ? "#c4b5fd" : "rgba(255,255,255,0.85)",
              border: `1px solid ${esSuperAdmin ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.25)"}`,
              fontWeight: 600,
            }}>
              {esSuperAdmin ? "⚡ Super Admin" : "Admin — solo tus eventos"}
            </span>
          </div>
        </header>

        <div className="eventos-content">

          {/* ══ CALENDARIO ══ */}
          <div className="cal-wrapper">
            <div className="cal-header">
              <button className="cal-nav" onClick={mesAnterior}><ChevronLeft size={18} /></button>
              <span className="cal-titulo">{MESES[calMonth]} {calYear}</span>
              <button className="cal-nav" onClick={mesSiguiente}><ChevronRight size={18} /></button>
            </div>
            <div className="cal-grid-header">{DIAS.map(d => <div key={d} className="cal-dia-nombre">{d}</div>)}</div>
            <div className="cal-grid">
              {Array.from({ length: primerDia }).map((_, i) => <div key={`e-${i}`} className="cal-celda vacia" />)}
              {Array.from({ length: diasEnMes }).map((_, i) => {
                const dia = i + 1, evsDia = eventosPorDia(dia);
                const key = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
                const esHoy = today.getDate() === dia && today.getMonth() === calMonth && today.getFullYear() === calYear;
                const esPasado = key < getTodayStr();
                return (
                  <div key={dia}
                    className={`cal-celda ${esHoy ? "hoy" : ""} ${esPasado ? "pasado" : ""} ${diaSeleccionado === key ? "seleccionado" : ""} ${evsDia.length > 0 && !esPasado ? "con-evento" : ""}`}
                    onClick={() => evsDia.length > 0 && !esPasado && setDiaSeleccionado(p => p === key ? null : key)}
                    style={{ cursor: evsDia.length > 0 && !esPasado ? "pointer" : "default" }}>
                    <span className="cal-num">{dia}</span>
                    {evsDia.slice(0, 2).map(ev => (
                      <div key={ev._id} className={`cal-evento-chip ${ev.activo ? "activo" : "inactivo"}`}>
                        {ev.titulo.length > 14 ? ev.titulo.slice(0, 13) + "…" : ev.titulo}
                      </div>
                    ))}
                    {evsDia.length > 2 && <div className="cal-evento-mas">+{evsDia.length - 2} más</div>}
                  </div>
                );
              })}
            </div>
            {diaSeleccionado && eventosDelDia.length > 0 && (
              <div className="cal-detalle">
                <h4 style={{ marginBottom: 10, fontSize: "0.85rem" }}>
                  Eventos del {new Date(diaSeleccionado + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long" })}
                </h4>
                {eventosDelDia.map(ev => (
                  <div key={ev._id} className="cal-detalle-item">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong>{ev.titulo}</strong>
                      <span className={ev.activo ? "estatus-activo" : "estatus-inactivo"} style={{ fontSize: "0.75rem" }}>
                        {ev.activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.8rem", marginTop: 4, display: "flex", gap: 16 }}>
                      <span><MapPin size={12} style={{ marginRight: 4 }} />{nombreDestino(ev.destino)}</span>
                      <span><Clock size={12} style={{ marginRight: 4 }} />{ev.horaInicio}–{ev.horaFin}</span>
                      <span><Users size={12} style={{ marginRight: 4 }} />{ev.cuposDisponibles}/{ev.cupos}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ══ TABLA ══ */}
          <div className="eventos-actions-top" style={{ marginTop: 32 }}>
            <button className="eventos-btn-agregar" onClick={abrirAgregar}><Plus size={18} /> Agregar Evento</button>
          </div>
          {loading && <p style={{ color: "#9ca3af", padding: "24px" }}>Cargando eventos...</p>}
          {error && <p style={{ color: "#dc2626", padding: "12px" }}>{error}</p>}
          {!loading && (
            <>
              <table className="eventos-table">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th><MapPin size={13} /> Lugar</th>
                    <th>Fecha</th>
                    <th><Clock size={13} /> Horario</th>
                    <th><Users size={13} /> Cupos</th>
                    <th>Creado por</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {eventos.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: "center", padding: "32px", color: "#9ca3af" }}>Sin eventos registrados</td></tr>
                  )}
                  {eventosPagina.map(ev => {
                    const puedeMod = puedeEditar(ev);
                    return (
                      <tr key={ev._id} style={{ opacity: puedeMod ? 1 : 0.6 }}>
                        <td style={{ fontWeight: 600 }}>{ev.titulo}</td>
                        <td>{nombreDestino(ev.destino)}</td>
                        <td>{formatFecha(ev.fecha)}</td>
                        <td>{ev.horaInicio}–{ev.horaFin}</td>
                        <td>{ev.cuposDisponibles}/{ev.cupos}</td>
                        <td style={{ fontSize: "0.82rem", color: "#6b7280" }}>{nombreCreador(ev)}</td>
                        <td><span className={ev.activo ? "estatus-activo" : "estatus-inactivo"}>{ev.activo ? "Activo" : "Inactivo"}</span></td>
                        <td className="acciones">
                          <button className="btn-icon" title="Ver inscritos y asistencia"
                            onClick={() => navigate(`/admin-sp/inscritos/${ev._id}`)}>
                            <Eye size={16} />
                          </button>
                          <button className="btn-icon" onClick={() => abrirEditar(ev)} disabled={!puedeMod}><Pencil size={16} /></button>
                          <button className="btn-icon" onClick={() => toggleActivo(ev)} disabled={!puedeMod}>
                            {ev.activo ? <PowerOff size={16} /> : <Power size={16} />}
                          </button>
                          <button className="btn-icon delete" onClick={() => eliminarEvento(ev)} disabled={!puedeMod}><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Paginacion total={eventos.length} porPagina={POR_PAGINA} paginaActual={pagina} onChange={setPagina} />
            </>
          )}
        </div>
      </div>

      {/* ═══════════════ MODAL CRUD ═══════════════ */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 560 }}>

            <div className="modal-header">
              <div>
                <h2>{modoEdicion ? "Editar Evento" : "Agregar Evento"}</h2>
                {esSuperAdmin && (
                  <div className="paso-indicador">
                    <span className={`paso-burbuja ${paso === 1 ? "activo" : "completado"}`}>1</span>
                    <span className="paso-linea" />
                    <span className={`paso-burbuja ${paso === 2 ? "activo" : "inactivo"}`}>2</span>
                    <span className="paso-etiqueta">
                      {paso === 1 ? "Datos del evento" : "Reubicar evento existente"}
                    </span>
                  </div>
                )}
              </div>
              <button onClick={cerrarModal}><X size={18} /></button>
            </div>

            {/* ══ PASO 1 ══ */}
            {paso === 1 && (
              <>
                <div className="modal-body">

                  <div className="form-group">
                    <label>Título del evento *</label>
                    <input type="text" name="titulo" placeholder="Ej. Conferencia de bienvenida"
                      value={formData.titulo} onChange={handleChange} />
                  </div>

                  <div className="form-group">
                    <label>Descripción <span className="label-opcional">(opcional)</span></label>
                    <textarea name="descripcion" placeholder="Describe el evento..." rows={2}
                      value={formData.descripcion} onChange={handleChange} />
                  </div>

                  <div className="form-group">
                    <label>Cupos totales *</label>
                    <input type="number" name="cupos" min={1} value={formData.cupos} onChange={handleChange} />
                    <p className="form-hint">Elige el tamaño del evento antes de seleccionar sala.</p>
                  </div>

                  <div className="form-group">
                    <label>Lugar *</label>
                    <select name="destino" value={formData.destino} onChange={handleChange}>
                      <option value="">— Selecciona un lugar —</option>
                      {destinos.map(d => <option key={d._id} value={d._id}>{d.nombre}</option>)}
                    </select>
                  </div>

                  {formData.destino && (
                    <div className="form-group">
                      <label>Sala / Aula <span className="label-opcional">(opcional)</span></label>
                      {loadingEspacios ? (
                        <p className="form-hint">Cargando aulas...</p>
                      ) : espaciosDestino.length > 0 ? (
                        <select name="espacio" value={formData.espacio} onChange={handleChange}>
                          <option value="">— Sin sala específica —</option>
                          {espaciosDestino.map(esp => {
                            const capacidadInsuficiente = formData.cupos > esp.cupos;
                            return (
                              <option key={esp._id} value={esp._id} disabled={capacidadInsuficiente}>
                                {esp.nombre} · Planta {esp.planta} · {esp.cupos} cupos
                                {capacidadInsuficiente ? " (Cupo insuficiente)" : ""}
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <p className="form-hint sin-aulas">Sin aulas registradas en este lugar</p>
                      )}
                    </div>
                  )}

                  <div className="form-group">
                    <label>Fecha del evento *</label>
                    <input type="date" name="fecha" value={formData.fecha}
                      min={modoEdicion ? undefined : getTodayStr()} onChange={handleChange} />
                  </div>

                  <GrillaHorarios
                    eventos={eventos} espacioId={formData.espacio} destinoId={formData.destino}
                    fecha={formData.fecha} horaInicioSel={formData.horaInicio} horaFinSel={formData.horaFin}
                    esSuperAdmin={esSuperAdmin} eventoEditandoId={eventoActual?._id}
                    modoEdicion={modoEdicion} onChange={handleHorarioChange}
                  />

                  {(formData.horaInicio || formData.horaFin) && (
                    <div className="form-row">
                      <div className="form-group">
                        <label>Hora inicio</label>
                        <input type="time" value={formData.horaInicio} readOnly
                          style={{ background: "#f9fafb", cursor: "default", color: "#374151" }} />
                      </div>
                      <div className="form-group">
                        <label>Hora fin</label>
                        <input type="time" value={formData.horaFin} readOnly
                          style={{ background: "#f9fafb", cursor: "default", color: "#374151" }} />
                      </div>
                    </div>
                  )}
                  {formData.horaInicio && formData.horaFin && (
                    <p style={{ fontSize: "0.78rem", color: "#6b7280", margin: "-4px 0 4px", padding: "6px 10px", background: "rgba(59,130,246,0.05)", borderRadius: 6, border: "1px solid rgba(59,130,246,0.12)" }}>
                      ℹ️ Se agrega automáticamente un margen de 30 min al final del evento para transición.
                    </p>
                  )}

                  {modoEdicion && eventoActual && (
                    <div className="form-group">
                      <label>Imagen del evento</label>
                      <div style={{ marginTop: 6 }}>
                        <ImageUploader
                          currentImage={eventoActual.image}
                          onUpload={file => subirImagenEvento(eventoActual._id, file)}
                          onDelete={() => eliminarImagenEvento(eventoActual._id)}
                          uploading={uploadingImg} shape="rect" size={140}
                        />
                      </div>
                    </div>
                  )}
                  {!modoEdicion && (
                    <div className="form-group">
                      <label>Imagen del evento <span className="label-opcional">(opcional)</span></label>
                      <div style={{ marginTop: 6 }}>
                        <ImageUploader
                          currentImage={imagenPendiente ? URL.createObjectURL(imagenPendiente) : null}
                          onUpload={async (file) => setImagenPendiente(file)}
                          onDelete={async () => setImagenPendiente(null)}
                          uploading={false} shape="rect" size={140}
                        />
                      </div>
                    </div>
                  )}

                  {modalError && <div className="modal-error-box"><p>{modalError}</p></div>}
                </div>
                <div className="modal-footer">
                  <button className="btn-cancelar" onClick={cerrarModal}>Cancelar</button>
                  <button className="btn-guardar" onClick={guardarEvento} disabled={saving || (Boolean(formData.destino) && espaciosDestino.length === 0)}>
                    {saving ? "Verificando..." : modoEdicion ? "Actualizar" : "Guardar"}
                  </button>
                </div>
              </>
            )}

            {/* ══ PASO 2 ══ */}
            {paso === 2 && conflicto && (
              <>
                <div className="modal-body" style={{ gap: 16 }}>

                  {/* Banner de advertencia */}
                  <div style={{
                    background: "linear-gradient(135deg,#fef3c7,#fde68a)",
                    border: "1px solid #f59e0b", borderRadius: 10, padding: "14px 16px",
                    display: "flex", gap: 10, alignItems: "flex-start"
                  }}>
                    <AlertTriangle size={20} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p style={{ fontWeight: 700, color: "#92400e", fontSize: "0.88rem", margin: 0 }}>
                        El lugar y espacio seleccionado ya está ocupado
                      </p>
                      <p style={{ color: "#78350f", fontSize: "0.8rem", margin: "4px 0 0" }}>
                        El horario <strong>{formData.horaInicio}–{formData.horaFin}</strong> del{" "}
                        <strong>
                          {new Date(formData.fecha + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                        </strong>{" "}
                        está ocupado por <em>"{conflicto.eventoTitulo}"</em>. Para continuar,
                        elige un nuevo lugar y espacio donde mover ese evento.
                      </p>
                    </div>
                  </div>

                  {/* Resumen: tu evento nuevo */}
                  <div className="nuevo-evento-box">
                    <p className="ne-label">Tu evento ({modoEdicion ? "editado" : "nuevo"}):</p>
                    <p className="ne-titulo">{formData.titulo}</p>
                    <p className="ne-meta">
                      {new Date(formData.fecha + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long" })}
                      {" · "}{formData.horaInicio}–{formData.horaFin}
                      {" · "}{destinos.find(d => d._id === formData.destino)?.nombre || ""}
                      {formData.espacio && espaciosDestino.length > 0
                        ? ` · ${espaciosDestino.find(e => e._id === formData.espacio)?.nombre || ""}`
                        : ""}
                    </p>
                  </div>

                  {/* Evento que hay que mover */}
                  <div className="conflicto-box">
                    <p className="conflicto-titulo"><AlertTriangle size={14} /> Evento a reubicar:</p>
                    <p className="conflicto-nombre">"{conflicto.eventoTitulo}"</p>
                    <p className="conflicto-horario">{conflicto.horaInicio}–{conflicto.horaFin}</p>
                    <p style={{ fontSize: "0.77rem", color: "#b91c1c", marginTop: 4, marginBottom: 0 }}>
                      Selecciona un nuevo lugar y espacio para este evento.
                    </p>
                  </div>

                  {/* Sugerencias */}
                  <div className="form-group">
                    <label style={{ fontWeight: 600, color: "#374151" }}>
                      Sugerencias de reubicación para "{conflicto.eventoTitulo}" *
                    </label>
                    <p className="form-hint" style={{ marginTop: 4 }}>
                      El sistema mostrará sugerencias de espacios disponibles con capacidad suficiente.
                    </p>

                    {conflicto.loadingEspacios && (
                      <p className="form-hint">Cargando sugerencias automáticas...</p>
                    )}

                    {!conflicto.loadingEspacios && conflicto.espaciosCargados.length === 0 && conflicto.espaciosExternos.length === 0 && (
                      <div className="sin-salas-aviso">
                        ⚠ No hay sugerencias disponibles para esta fecha/hora/cupo. Prueba con otra hora o lugar.
                      </div>
                    )}

                    {!conflicto.loadingEspacios && conflicto.espaciosCargados.length > 0 && (
                      <div className="sugerencias-group">
                        <h4>Sugerencias en el edificio actual</h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                          {conflicto.espaciosCargados.map(sala => (
                            <label
                              key={sala._id}
                              className={`sala-opcion ${conflicto.nuevoDestino === formData.destino && conflicto.nuevoEspacio === sala._id ? "seleccionada" : ""}`}
                              onClick={() => seleccionarSalaReubicacion(formData.destino, sala._id)}
                              style={{ cursor: "pointer" }}
                            >
                              {conflicto.nuevoDestino === formData.destino && conflicto.nuevoEspacio === sala._id
                                ? <CheckCircle2 size={18} color="#16a34a" />
                                : <div className="sala-radio-circulo" />}
                              <div>
                                <p className="sala-nombre">{sala.nombre}</p>
                                <p className="sala-meta">Planta {sala.planta} · {sala.cupos} cupos · ✓ Disponible</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {!conflicto.loadingEspacios && conflicto.espaciosExternos.length > 0 && (
                      <div className="sugerencias-group" style={{ marginTop: 14 }}>
                        <h4>Sugerencias en otros edificios</h4>
                        {conflicto.espaciosExternos.map(dest => (
                          <div key={dest.destinoId} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 10 }}>
                            <p style={{ margin: "0 0 6px", fontWeight: 600 }}>{dest.destinoNombre}</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {dest.espacios.map(sala => (
                                <label
                                  key={sala._id}
                                  className={`sala-opcion ${conflicto.nuevoDestino === dest.destinoId && conflicto.nuevoEspacio === sala._id ? "seleccionada" : ""}`}
                                  onClick={() => seleccionarSalaReubicacion(dest.destinoId, sala._id)}
                                  style={{ cursor: "pointer" }}
                                >
                                  {conflicto.nuevoDestino === dest.destinoId && conflicto.nuevoEspacio === sala._id
                                    ? <CheckCircle2 size={18} color="#16a34a" />
                                    : <div className="sala-radio-circulo" />}
                                  <div>
                                    <p className="sala-nombre">{sala.nombre}</p>
                                    <p className="sala-meta">Planta {sala.planta} · {sala.cupos} cupos · ✓ Disponible</p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Confirmación visual cuando ya eligió */}
                    {conflicto.nuevoEspacio && (
                      <div style={{
                        background: "#f0fdf4", border: "1px solid #86efac",
                        borderRadius: 8, padding: "10px 14px",
                        display: "flex", gap: 8, alignItems: "center",
                        marginTop: 12,
                      }}>
                        <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                        <p style={{ fontSize: "0.82rem", color: "#15803d", margin: 0 }}>
                          <strong>"{conflicto.eventoTitulo}"</strong> se moverá a{" "}
                          <strong>{destinos.find(d => d._id === conflicto.nuevoDestino)?.nombre}</strong>
                          {" – "}
                          <strong>
                            {conflicto.espaciosCargados.find(e => e._id === conflicto.nuevoEspacio)?.nombre
                              || conflicto.espaciosExternos.flatMap(d => d.espacios).find(e => e._id === conflicto.nuevoEspacio)?.nombre}
                          </strong>.
                          Pulsa <strong>"Confirmar"</strong> para guardar ambos cambios.
                        </p>
                      </div>
                    )}

                    {modalError && <div className="modal-error-box"><p>{modalError}</p></div>}
                  </div>{/* cierra form-group sugerencias */}

                </div>{/* cierra modal-body */}

                <div className="modal-footer">
                  <button className="btn-cancelar" onClick={() => { setPaso(1); setModalError(""); setConflicto(null); }}>
                    ← Volver
                  </button>
                  <button
                    className="btn-guardar"
                    onClick={confirmarReasignacion}
                    disabled={saving || !conflicto.nuevoDestino || !conflicto.nuevoEspacio}
                  >
                    {saving ? "Guardando..." : "Confirmar"}
                  </button>
                </div>
              </>
            )}

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
};

export default Eventos;