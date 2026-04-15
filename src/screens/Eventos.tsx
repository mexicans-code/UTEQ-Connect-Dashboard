import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import NavSidebar from "./components/NavSidebar";
import PageTopbar from "./components/PageTopbar";
import {
  Plus, Pencil, Trash2, Power, PowerOff, X,
  MapPin, Users, Clock, Eye, Search, Calendar, FileDown,
  AlertTriangle, CheckCircle2,
} from "lucide-react";
import { getLocations } from "../api/locations";
import { getEspaciosPorDestino, getEspaciosSugerencias } from "../api/espacios";
import {
  getEventos, createEvento, updateEvento, deleteEvento,
  deactivateEvento, activateEvento,
  uploadEventoImage, updateEventoImage, deleteEventoImage,
  reasignarCrearEvento, reasignarActualizarEvento,
} from "../api/events";
import ConfirmModal from "./components/ConfirmModal";
import Paginacion from "./components/Paginacion";
import ImageUploader from "./components/ImageUploader";
import { exportEventosPDF } from "../utils/pdfExport";
import FieldError from "./components/ui/FieldError";
import GrillaHorarios from "./components/eventos/GrillaHorarios";
import EventosCalendario from "./components/eventos/EventosCalendario";
import TableWrapper from "./components/shared/TableWrapper";
import EventFormField from "./components/shared/EventFormField";
import AppModal from "./components/shared/AppModal";
import { useConfirm } from "../hooks/useConfirm";
import { FIELD_LIMITS, validateField } from "../utils/fieldLimits";

/* ═══════════ INTERFACES ═══════════ */

interface Destino { _id: string; nombre: string; }
interface Espacio { _id: string; nombre: string; planta: string; cupos: number; ocupado?: boolean; }

interface Evento {
  _id: string; titulo: string; descripcion?: string;
  fecha: string; horaInicio: string; horaFin: string;
  destino: Destino | string;
  espacio?: { _id: string; nombre: string } | string | null;
  cupos: number; cuposDisponibles: number; activo: boolean; image?: string;
  creadoPor?: { _id: string; nombre: string; email: string } | string;
}

interface FormData {
  titulo: string; descripcion: string; fecha: string;
  horaInicio: string; horaFin: string;
  destino: string; espacio: string; cupos: number;
}

interface FormErrors {
  titulo?: string; descripcion?: string; destino?: string;
  fecha?: string; horario?: string; cupos?: string;
}

interface ConflictoInfo {
  eventoId: string; eventoTitulo: string;
  horaInicio: string; horaFin: string; cuposEvento: number;
  nuevoDestino: string; nuevoEspacio: string;
  espaciosCargados: Espacio[];
  espaciosExternos: Array<{ destinoId: string; destinoNombre: string; espacios: Espacio[] }>;
  loadingEspacios: boolean;
}

const EMPTY_FORM: FormData = {
  titulo: "", descripcion: "", fecha: "",
  horaInicio: "", horaFin: "", destino: "", espacio: "", cupos: 1,
};

/* ═══════════ HELPERS ═══════════ */

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const toInputDate   = (iso: string) => iso ? iso.split("T")[0] : "";
const formatFecha   = (iso: string) => !iso ? "—" : new Date(iso).toLocaleDateString("es-MX", { day:"2-digit", month:"short", year:"numeric", timeZone:"UTC" });
const getNombreDest = (d: Destino | string | undefined) => !d ? "—" : typeof d === "string" ? d : d.nombre;
const getDestinoId  = (d: Destino | string) => !d ? "" : typeof d === "string" ? d : d._id;
const getSalaId     = (e: Evento["espacio"]) => !e ? "" : typeof e === "string" ? e : (e as any)._id;
const toMin         = (h: string) => { const [hh,mm] = h.split(":").map(Number); return hh*60+mm; };
const hayTraslapeH  = (h1i:string,h1f:string,h2i:string,h2f:string) => toMin(h1i)<toMin(h2f) && toMin(h1f)>toMin(h2i);

/* ═══════════ COMPONENTE PRINCIPAL ═══════════ */

const Eventos: React.FC = () => {
  const ROL_ACTUAL   = localStorage.getItem("rol") || "admin";
  const esSuperAdmin = ROL_ACTUAL === "superadmin";
  const userIdActual = localStorage.getItem("userId") || "";
  const navigate     = useNavigate();
  const variant      = esSuperAdmin ? "superadmin" : "admin" as const;

  useEffect(() => {
    import("../styles/Eventos.css");
    if (!esSuperAdmin) import("../styles/GestionEventos.css");
  }, [esSuperAdmin]);

  const confirm = useConfirm();

  /* ── Estado ── */
  const [eventos,         setEventos]         = useState<Evento[]>([]);
  const [destinos,        setDestinos]        = useState<Destino[]>([]);
  const [espaciosDestino, setEspaciosDestino] = useState<Espacio[]>([]);
  const [loadingEspacios, setLoadingEspacios] = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState("");
  const [pagina,          setPagina]          = useState(1);
  const POR_PAGINA = 15;

  const [showModal,       setShowModal]       = useState(false);
  const [modoEdicion,     setModoEdicion]     = useState(false);
  const [eventoActual,    setEventoActual]    = useState<Evento|null>(null);
  const [saving,          setSaving]          = useState(false);
  const [uploadingImg,    setUploadingImg]    = useState(false);
  const [imagenPendiente, setImagenPendiente] = useState<File|null>(null);
  const [modalError,      setModalError]      = useState("");
  const [formData,        setFormData]        = useState<FormData>(EMPTY_FORM);
  const [formErrors,      setFormErrors]      = useState<FormErrors>({});
  const [paso,            setPaso]            = useState<1|2>(1);
  const [conflicto,       setConflicto]       = useState<ConflictoInfo|null>(null);

  const [busqueda,  setBusqueda]  = useState("");
  const [tabActivo, setTabActivo] = useState<"mios"|"todos">("mios");

  const refTitulo    = useRef<HTMLDivElement>(null);
  const refDesc      = useRef<HTMLDivElement>(null);
  const refDestino   = useRef<HTMLDivElement>(null);
  const refFecha     = useRef<HTMLDivElement>(null);
  const refHorario   = useRef<HTMLDivElement>(null);
  const refCupos     = useRef<HTMLDivElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  /* ── Permisos ── */
  const esMio = (ev: Evento) => {
    if (esSuperAdmin) return true;
    if (!ev.creadoPor) return false;
    const cId = typeof ev.creadoPor === "object" ? ev.creadoPor._id : ev.creadoPor;
    return cId === userIdActual;
  };
  const eventoYaPaso  = (ev: Evento) => new Date(`${ev.fecha}T${ev.horaFin}`) < new Date();
  const nombreCreador = (ev: Evento) => {
    if (!ev.creadoPor || typeof ev.creadoPor === "string") return "—";
    return ev.creadoPor.nombre;
  };

  /* ── Fetch ── */
  const fetchEventos = async () => {
    setLoading(true); setError("");
    try {
      const lista = await getEventos();
      setEventos(lista as Evento[]);
    } catch { setError("No se pudieron cargar los eventos."); }
    finally  { setLoading(false); }
  };

  const fetchDestinos = async () => {
    try {
      const lista = await getLocations();
      setDestinos(lista);
    } catch {}
  };

  const fetchEspaciosPorDestino = async (destinoId: string): Promise<Espacio[]> => {
    if (!destinoId) { setEspaciosDestino([]); return []; }
    setLoadingEspacios(true);
    try {
      const lista: Espacio[] = await getEspaciosPorDestino(destinoId);
      setEspaciosDestino(lista);
      return lista;
    } catch { setEspaciosDestino([]); return []; }
    finally  { setLoadingEspacios(false); }
  };

  const fetchEspaciosParaConflicto = async (destinoId: string) => {
    const cuposEvento = conflicto?.cuposEvento || 1;
    if (!destinoId || !formData.fecha || !formData.horaInicio || !formData.horaFin) {
      setConflicto(p => p ? { ...p, nuevoDestino:"", nuevoEspacio:"", espaciosCargados:[], espaciosExternos:[], loadingEspacios:false } : p);
      return;
    }
    setConflicto(p => p ? { ...p, nuevoDestino:destinoId, nuevoEspacio:"", espaciosCargados:[], espaciosExternos:[], loadingEspacios:true } : p);
    try {
      const libresMismo: Espacio[] = await getEspaciosSugerencias({ destinoId, fecha:formData.fecha, horaInicio:formData.horaInicio, horaFin:formData.horaFin, cupos:cuposEvento });
      const externos: ConflictoInfo["espaciosExternos"] = [];
      await Promise.all(destinos.filter(d => d._id !== destinoId).map(async d => {
        try {
          const libres: Espacio[] = await getEspaciosSugerencias({ destinoId:d._id, fecha:formData.fecha, horaInicio:formData.horaInicio, horaFin:formData.horaFin, cupos:cuposEvento });
          if (libres.length > 0) externos.push({ destinoId:d._id, destinoNombre:d.nombre, espacios:libres });
        } catch {}
      }));
      setConflicto(p => p ? { ...p, espaciosCargados:libresMismo, espaciosExternos:externos, loadingEspacios:false } : p);
    } catch {
      setConflicto(p => p ? { ...p, espaciosCargados:[], espaciosExternos:[], loadingEspacios:false } : p);
    }
  };

  useEffect(() => { fetchEventos(); fetchDestinos(); }, []);

  /* ── Listas derivadas ── */
  const eventosMios  = useMemo(() => eventos.filter(ev =>
    ev.creadoPor != null && (typeof ev.creadoPor === "object" ? ev.creadoPor._id : ev.creadoPor) === userIdActual
  ), [eventos, userIdActual]);

  const eventosOtros = useMemo(() => eventos.filter(ev => {
    if (!ev.creadoPor) return false;
    const cId = typeof ev.creadoPor === "object" ? ev.creadoPor._id : ev.creadoPor;
    return cId !== userIdActual;
  }), [eventos, userIdActual]);

  const listaAdminActiva = tabActivo === "mios" ? eventosMios : eventosOtros;

  const listaAdminFiltrada = useMemo(() => {
    if (!busqueda) return listaAdminActiva;
    const q = busqueda.toLowerCase();
    return listaAdminActiva.filter(ev =>
      ev.titulo.toLowerCase().includes(q) || getNombreDest(ev.destino).toLowerCase().includes(q)
    );
  }, [listaAdminActiva, busqueda]);

  useEffect(() => { setPagina(1); }, [listaAdminActiva, busqueda]);

  const listaAdminPagina = useMemo(
    () => listaAdminFiltrada.slice((pagina-1)*POR_PAGINA, pagina*POR_PAGINA),
    [listaAdminFiltrada, pagina]
  );
  const eventosPagina = eventos.slice((pagina-1)*POR_PAGINA, pagina*POR_PAGINA);

  /* ── Modal: abrir / cerrar ── */
  const abrirAgregar = () => {
    setModoEdicion(false); setEventoActual(null);
    setFormData(EMPTY_FORM); setModalError(""); setFormErrors({});
    setEspaciosDestino([]); setPaso(1); setConflicto(null); setShowModal(true);
  };

  const abrirEditar = (ev: Evento) => {
    if (!esMio(ev)) return;
    setModoEdicion(true); setEventoActual(ev);
    const destinoId = getDestinoId(ev.destino);
    setFormData({ titulo: ev.titulo, descripcion: ev.descripcion || "", fecha: toInputDate(ev.fecha), horaInicio: ev.horaInicio, horaFin: ev.horaFin, destino: destinoId, espacio: getSalaId(ev.espacio), cupos: ev.cupos });
    fetchEspaciosPorDestino(destinoId);
    setModalError(""); setFormErrors({}); setPaso(1); setConflicto(null); setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false); setModalError(""); setFormErrors({});
    setPaso(1); setConflicto(null); setFormData(EMPTY_FORM);
    setModoEdicion(false); setEventoActual(null); setImagenPendiente(null); setEspaciosDestino([]);
  };

  /* ── Handlers ── */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === "cupos" ? Number(value) : value, ...(name === "destino" ? { espacio: "" } : {}) }));
    if (name === "destino") fetchEspaciosPorDestino(value);
    if (formErrors[name as keyof FormErrors]) setFormErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleHorarioChange = (horaInicio:string, horaFin:string) => {
    setFormData(prev => ({ ...prev, horaInicio, horaFin }));
    if (formErrors.horario) setFormErrors(prev => ({ ...prev, horario: undefined }));
  };

  const inputErrStyle = (hasErr: boolean): React.CSSProperties => hasErr ? { border: "1.5px solid #f87171", outline: "none" } : {};

  const scrollToFirstError = (ref: React.RefObject<HTMLDivElement> | null) => {
    setTimeout(() => {
      if (!ref?.current) return;
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
      (ref.current.querySelector("input, select, textarea") as HTMLElement | null)?.focus();
    }, 50);
  };

  /* ── Validación — usa validateField + FIELD_LIMITS ── */
  const validarFormEvento = (): { errors: FormErrors; firstRef: React.RefObject<HTMLDivElement> | null } => {
    const errors: FormErrors = {};
    let firstRef: React.RefObject<HTMLDivElement> | null = null;

    const errTitulo = validateField(formData.titulo, FIELD_LIMITS.titulo);
    if (errTitulo) { errors.titulo = errTitulo; if (!firstRef) firstRef = refTitulo; }

    const errDesc = validateField(formData.descripcion, FIELD_LIMITS.descripcion);
    if (errDesc) { errors.descripcion = errDesc; if (!firstRef) firstRef = refDesc; }

    if (!formData.destino) { errors.destino = "Debes seleccionar un lugar para el evento."; if (!firstRef) firstRef = refDestino; }
    else if (espaciosDestino.length === 0 && !loadingEspacios) { errors.destino = "El lugar seleccionado no tiene espacios registrados."; if (!firstRef) firstRef = refDestino; }

    if (!formData.fecha) { errors.fecha = "La fecha del evento es obligatoria."; if (!firstRef) firstRef = refFecha; }
    else if (!modoEdicion && formData.fecha < getTodayStr()) { errors.fecha = "No puedes crear eventos en fechas pasadas."; if (!firstRef) firstRef = refFecha; }

    if (!formData.horaInicio || !formData.horaFin) { errors.horario = "Selecciona el horario del evento en la grilla."; if (!firstRef) firstRef = refHorario; }
    else if (toMin(formData.horaFin) <= toMin(formData.horaInicio)) { errors.horario = "La hora de fin debe ser posterior a la hora de inicio."; if (!firstRef) firstRef = refHorario; }

    if (!formData.cupos || formData.cupos < 1) { errors.cupos = "El número de cupos debe ser mayor a 0."; if (!firstRef) firstRef = refCupos; }
    else if (!Number.isInteger(formData.cupos)) { errors.cupos = "Los cupos deben ser un número entero."; if (!firstRef) firstRef = refCupos; }
    else if (formData.espacio && esSuperAdmin) {
      const espacioSel = espaciosDestino.find(esp => esp._id === formData.espacio);
      if (espacioSel && formData.cupos > espacioSel.cupos) { errors.cupos = `El espacio "${espacioSel.nombre}" tiene capacidad de ${espacioSel.cupos} cupos.`; if (!firstRef) firstRef = refCupos; }
    }

    return { errors, firstRef };
  };

  /* ── Guardar ── */
  const guardarEvento = async () => {
    const { errors, firstRef } = validarFormEvento();
    if (Object.keys(errors).length > 0) { setFormErrors(errors); scrollToFirstError(firstRef); return; }

    if (esSuperAdmin && formData.espacio) {
      const editId = modoEdicion ? eventoActual?._id : undefined;
      const eventoConflictivo = eventos.find(ev => {
        if (!ev.activo || (editId && ev._id === editId)) return false;
        if (getSalaId(ev.espacio) !== formData.espacio || toInputDate(ev.fecha) !== formData.fecha) return false;
        return hayTraslapeH(formData.horaInicio, formData.horaFin, ev.horaInicio, ev.horaFin);
      });
      if (eventoConflictivo) {
        setConflicto({ eventoId: eventoConflictivo._id, eventoTitulo: eventoConflictivo.titulo, horaInicio: eventoConflictivo.horaInicio, horaFin: eventoConflictivo.horaFin, cuposEvento: eventoConflictivo.cupos, nuevoDestino:"", nuevoEspacio:"", espaciosCargados:[], espaciosExternos:[], loadingEspacios:false });
        setModalError(""); setPaso(2); fetchEspaciosParaConflicto(formData.destino); return;
      }
    }

    if (!esSuperAdmin) {
      const editId = modoEdicion ? eventoActual?._id : undefined;
      const conflictoAdmin = eventos.find(ev => {
        if (!ev.activo || (editId && ev._id === editId)) return false;
        if (formData.espacio ? getSalaId(ev.espacio) !== formData.espacio : getDestinoId(ev.destino) !== formData.destino) return false;
        if (toInputDate(ev.fecha) !== formData.fecha) return false;
        return hayTraslapeH(formData.horaInicio, formData.horaFin, ev.horaInicio, ev.horaFin);
      });
      if (conflictoAdmin) {
        setFormErrors(prev => ({ ...prev, horario: `El horario ${formData.horaInicio}–${formData.horaFin} ya está ocupado por "${conflictoAdmin.titulo}".` }));
        scrollToFirstError(refHorario); return;
      }
    }

    await _ejecutarGuardado();
  };

  const _ejecutarGuardado = async () => {
    setSaving(true); setModalError("");
    const dataToSend = { ...formData, espacio: formData.espacio || null };
    try {
      if (modoEdicion && eventoActual) {
        await updateEvento(eventoActual._id, dataToSend);
        if (imagenPendiente) { try { await updateEventoImage(eventoActual._id, imagenPendiente); } catch {} }
      } else {
        const nuevoId = await createEvento(esSuperAdmin ? { ...dataToSend, creadoPor: userIdActual||undefined } : dataToSend);
        if (nuevoId && imagenPendiente) { try { await uploadEventoImage(nuevoId, imagenPendiente); } catch {} setImagenPendiente(null); }
      }
      cerrarModal(); fetchEventos();
      if (!esSuperAdmin) setTabActivo("mios");
    } catch (err: any) {
      const data = err.response?.data;
      if (esSuperAdmin) {
        let eventoConf: any = null;
        try {
          if (data?.error?.startsWith?.("CONFLICT_SALA::")) eventoConf = JSON.parse(data.error.replace("CONFLICT_SALA::",""));
          else if (err.response?.status === 409 && data?.conflictoSala) eventoConf = data.conflictoSala;
        } catch {}
        if (eventoConf) {
          setConflicto({ eventoId:eventoConf.id||eventoConf._id, eventoTitulo:eventoConf.titulo, horaInicio:eventoConf.horaInicio, horaFin:eventoConf.horaFin, cuposEvento:eventoConf.cupos||1, nuevoDestino:"", nuevoEspacio:"", espaciosCargados:[], espaciosExternos:[], loadingEspacios:false });
          setModalError(""); setPaso(2); fetchEspaciosParaConflicto(formData.destino); return;
        }
      }
      setModalError(data?.error || "Error al guardar el evento.");
    } finally { setSaving(false); }
  };

  const confirmarReasignacion = async () => {
    if (!conflicto) return;
    if (!conflicto.nuevoDestino || !conflicto.nuevoEspacio) { setModalError("Selecciona un lugar y espacio donde reubicar el evento existente."); return; }
    setSaving(true); setModalError("");
    const dataToSend = { ...formData, espacio:formData.espacio||null, cuposDisponibles: modoEdicion ? (eventoActual?.cuposDisponibles ?? formData.cupos) : formData.cupos };
    try {
      if (modoEdicion && eventoActual) {
        await reasignarActualizarEvento(eventoActual._id, { eventoPrevioId: conflicto.eventoId, nuevaEspacioId: conflicto.nuevoEspacio||undefined, nuevaDestinoPrevioId: conflicto.nuevoDestino||undefined, updateData: dataToSend });
        if (imagenPendiente) { try { await updateEventoImage(eventoActual._id, imagenPendiente); } catch {} }
      } else {
        const nuevoId = await reasignarCrearEvento({ eventoPrevioId: conflicto.eventoId, nuevaEspacioId: conflicto.nuevoEspacio||undefined, nuevaDestinoPrevioId: conflicto.nuevoDestino||undefined, nuevoEvento: { ...dataToSend, creadoPor:userIdActual||undefined } });
        if (nuevoId && imagenPendiente) { try { await uploadEventoImage(nuevoId, imagenPendiente); } catch {} setImagenPendiente(null); }
      }
      cerrarModal(); fetchEventos();
    } catch (err:any) { setModalError(err.response?.data?.error || "Error al reasignar."); }
    finally { setSaving(false); }
  };

  /* ── Acciones de tabla ── */
  const eliminarEvento = (ev: Evento) => {
    if (!esMio(ev)) return;
    confirm.pedir(`¿Eliminar "${ev.titulo}" permanentemente? Esta acción no se puede deshacer.`, async () => {
      try { await deleteEvento(ev._id); fetchEventos(); } catch { setModalError("Error al eliminar."); }
    });
  };

  const toggleActivo = async (ev: Evento) => {
    if (!esMio(ev)) return;
    try {
      if (ev.activo) await deactivateEvento(ev._id);
      else await activateEvento(ev._id);
      fetchEventos();
    } catch {}
  };

  const subirImagenEvento = async (id:string, file:File) => {
    setUploadingImg(true);
    try { await uploadEventoImage(id, file); fetchEventos(); }
    catch { setModalError("Error al subir la imagen."); } finally { setUploadingImg(false); }
  };

  const eliminarImagenEvento = async (id:string) => {
    setUploadingImg(true);
    try { await deleteEventoImage(id); fetchEventos(); }
    catch { setModalError("Error al eliminar la imagen."); } finally { setUploadingImg(false); }
  };

  const seleccionarSalaReubicacion = (destinoId:string, salaId:string) =>
    setConflicto(p => p ? { ...p, nuevoDestino:destinoId, nuevoEspacio:salaId } : p);

  /* ── Render: selector de sala (compartido) ── */
  const renderSalaSelect = () => {
    if (!formData.destino) return null;
    return (
      <EventFormField label="Sala / Aula" variant={variant}>
        {loadingEspacios
          ? <p className="form-hint">Cargando aulas…</p>
          : espaciosDestino.length > 0
            ? <select name="espacio" value={formData.espacio} onChange={handleChange}>
                <option value="">— Sin sala específica —</option>
                {espaciosDestino.map(esp => {
                  const insuf = esSuperAdmin && formData.cupos > esp.cupos;
                  return (
                    <option key={esp._id} value={esp._id} disabled={insuf || !!esp.ocupado}>
                      {esp.nombre} · Planta {esp.planta} · {esp.cupos} cupos{insuf ? " (Cupo insuficiente)" : esp.ocupado ? " (Ocupado)" : ""}
                    </option>
                  );
                })}
              </select>
            : <p className="form-hint sin-aulas">Sin aulas registradas en este lugar.</p>
        }
      </EventFormField>
    );
  };

  /* ── Render: formulario compartido Admin + SuperAdmin ── */
  const renderFormularioModal = () => (
    <>
      <EventFormField label="Título del evento *" variant={variant} containerRef={refTitulo}
        charMin={FIELD_LIMITS.titulo.min} charMax={FIELD_LIMITS.titulo.max} charCurrent={formData.titulo.length} error={formErrors.titulo}>
        <input type="text" name="titulo"
          placeholder="Ej. Conferencia de bienvenida" value={formData.titulo}
          onChange={handleChange} maxLength={FIELD_LIMITS.titulo.max} style={inputErrStyle(!!formErrors.titulo)} />
      </EventFormField>

      <EventFormField label="Descripción *" variant={variant} containerRef={refDesc}
        charMin={FIELD_LIMITS.descripcion.min} charMax={FIELD_LIMITS.descripcion.max} charCurrent={formData.descripcion.length} error={formErrors.descripcion}>
        <textarea name="descripcion"
          placeholder="Describe el evento…" rows={3} value={formData.descripcion}
          onChange={handleChange} maxLength={FIELD_LIMITS.descripcion.max} style={inputErrStyle(!!formErrors.descripcion)} />
      </EventFormField>

      <EventFormField label="Cupos totales *" variant={variant} containerRef={refCupos} error={formErrors.cupos}>
        <input type="number" name="cupos"
          min={1} step={1} value={formData.cupos} onChange={handleChange}
          onKeyDown={e => [".",",","e","E","+","-"].includes(e.key) && e.preventDefault()}
          style={inputErrStyle(!!formErrors.cupos)} />
        {esSuperAdmin && <p className="form-hint">Elige el tamaño del evento antes de seleccionar sala.</p>}
      </EventFormField>

      <EventFormField label="Lugar *" variant={variant} containerRef={refDestino} error={formErrors.destino}>
        <select name="destino"
          value={formData.destino} onChange={handleChange} style={inputErrStyle(!!formErrors.destino)}>
          <option value="">— Selecciona un lugar —</option>
          {destinos.map(d => <option key={d._id} value={d._id}>{d.nombre}</option>)}
        </select>
      </EventFormField>

      {renderSalaSelect()}

      <EventFormField label="Fecha del evento *" variant={variant} containerRef={refFecha} error={formErrors.fecha}>
        <input type="date" name="fecha"
          value={formData.fecha} min={modoEdicion ? undefined : getTodayStr()}
          onChange={handleChange} style={inputErrStyle(!!formErrors.fecha)} />
      </EventFormField>

      <div ref={refHorario}>
        <GrillaHorarios eventos={eventos} espacioId={formData.espacio} destinoId={formData.destino}
          fecha={formData.fecha} horaInicioSel={formData.horaInicio} horaFinSel={formData.horaFin}
          esSuperAdmin={esSuperAdmin} eventoEditandoId={eventoActual?._id} modoEdicion={modoEdicion}
          onChange={handleHorarioChange} />
        <FieldError msg={formErrors.horario} isAdmin={!esSuperAdmin} />
      </div>

      {(formData.horaInicio || formData.horaFin) && (
        <div className="form-row">
          <EventFormField label="Hora inicio" variant={variant}>
            <input type="time" value={formData.horaInicio} readOnly
              style={{ background: "var(--bg-main)", cursor: "default" }} />
          </EventFormField>
          <EventFormField label="Hora fin" variant={variant}>
            <input type="time" value={formData.horaFin} readOnly
              style={{ background: "var(--bg-main)", cursor: "default" }} />
          </EventFormField>
        </div>
      )}

      {formData.horaInicio && formData.horaFin && (
        <p style={{ fontSize: "0.78rem", color: "#6b7280", margin: "-4px 0 4px", padding: "6px 10px", background: "rgba(59,130,246,0.05)", borderRadius: 6, border: "1px solid rgba(59,130,246,0.12)" }}>
          ℹ️ Se agrega automáticamente un margen de 30 min al final del evento para transición entre actividades.
        </p>
      )}

      <EventFormField label="Imagen del evento" variant={variant}>
        {modoEdicion && eventoActual ? (
          <ImageUploader currentImage={eventoActual.image} onUpload={file => subirImagenEvento(eventoActual._id, file)} onDelete={() => eliminarImagenEvento(eventoActual._id)} uploading={uploadingImg} shape="rect" size={140} />
        ) : (
          <ImageUploader currentImage={imagenPendiente ? URL.createObjectURL(imagenPendiente) : null} onFileSelect={f => setImagenPendiente(f)} uploading={false} shape="rect" size={140} />
        )}
      </EventFormField>

      {modalError && <div className="modal-error-box"><p>{modalError}</p></div>}
    </>
  );

  /* ═══════════ RENDER ADMIN ═══════════ */
  if (!esSuperAdmin) {
    return (
      <div className="eventos-container">
        <NavSidebar rol="admin" />
        <div className="eventos-main">
          <PageTopbar
            title="Gestión de Eventos"
            subtitle={`${eventosMios.length} mis eventos · ${eventos.length} total`}
            onDownloadPDF={() => exportEventosPDF(eventos)}
          >
            <span className="ge-badge-rol">Admin</span>
            <button data-action className="eventos-btn-agregar" onClick={abrirAgregar}><Plus size={16} /> Nuevo Evento</button>
          </PageTopbar>

          <div className="eventos-content">
            <div className="ge-tabs-bar">
              <button className={`ge-tab ${tabActivo==="mios" ? "active" : ""}`} onClick={() => { setTabActivo("mios"); setBusqueda(""); setPagina(1); }}>
                <Calendar size={15} /> Mis Eventos <span className="ge-tab-count">{eventosMios.length}</span>
              </button>
              <button className={`ge-tab ${tabActivo==="todos" ? "active" : ""}`} onClick={() => { setTabActivo("todos"); setBusqueda(""); setPagina(1); }}>
                <Users size={15} /> Eventos Generales <span className="ge-tab-count">{eventosOtros.length}</span>
              </button>
            </div>

            <div className="ge-toolbar">
              <div className="ge-search-wrapper">
                <Search size={15} />
                <input type="text" className="ge-search" placeholder={tabActivo==="mios" ? "Buscar en mis eventos…" : "Buscar en eventos generales…"} value={busqueda} onChange={e => setBusqueda(e.target.value)} />
              </div>
              {busqueda && <button onClick={() => setBusqueda("")} style={{ display:"inline-flex", alignItems:"center", gap:5, background:"transparent", border:"1.5px solid var(--border)", color:"var(--gray-500)", padding:"8px 12px", borderRadius:"var(--radius-md)", cursor:"pointer", fontSize:"0.82rem" }}><X size={13} /> Limpiar</button>}
              <span style={{ color:"var(--gray-400)", fontSize:"0.82rem", whiteSpace:"nowrap" }}>{listaAdminFiltrada.length} de {listaAdminActiva.length} eventos</span>
            </div>

            <TableWrapper loading={loading} error={error} empty={listaAdminFiltrada.length === 0} variant="admin"
              emptyIcon={<Calendar size={38} />}
              emptyMsg={busqueda ? `Sin resultados para "${busqueda}"` : tabActivo==="mios" ? "Aún no has creado ningún evento" : "No hay eventos de otros administradores"}>
              <div className="ut-table-wrapper">
                <table className="ut-table">
                  <thead><tr>
                    <th>Evento</th><th style={{ width:"25%" }}>Descripción</th>
                    <th><MapPin size={12} style={{ verticalAlign:"middle" }} /> Lugar</th>
                    <th>Fecha</th>
                    <th><Clock size={12} style={{ verticalAlign:"middle" }} /> Horario</th>
                    <th><Users size={12} style={{ verticalAlign:"middle" }} /> Cupos</th>
                    <th>Estado</th><th style={{ width:130 }}>Acciones</th>
                  </tr></thead>
                  <tbody>
                    {listaAdminPagina.map(ev => {
                      const mio = esMio(ev), pasado = eventoYaPaso(ev), pocos = ev.cuposDisponibles < 5;
                      return (
                        <tr key={ev._id} className={!mio ? "ut-row-disabled" : pasado ? "ge-row-pasado" : ""}>
                          <td><strong>{ev.titulo}</strong></td>
                          <td style={{ fontSize:"0.84rem", color:"var(--gray-600)" }}>
                            {ev.descripcion
                              ? <span title={ev.descripcion}>{ev.descripcion.length>50 ? `${ev.descripcion.slice(0,50)}...` : ev.descripcion}</span>
                              : <span style={{ color:"var(--gray-400)", fontStyle:"italic" }}>Sin descripción</span>}
                          </td>
                          <td><span className="ut-badge ut-badge--info">{getNombreDest(ev.destino)}</span></td>
                          <td style={{ fontSize:"0.84rem", color:"var(--gray-600)", whiteSpace:"nowrap" }}>{formatFecha(ev.fecha)}</td>
                          <td style={{ fontSize:"0.84rem", color:"var(--gray-600)", whiteSpace:"nowrap" }}>{ev.horaInicio} – {ev.horaFin}</td>
                          <td><span className={`ut-badge ${pocos ? "ut-badge--lleno" : "ut-badge--info"}`}>{ev.cuposDisponibles}/{ev.cupos}</span></td>
                          <td>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              {pasado && <span style={{ fontSize:"0.75rem", background:"#fee2e2", color:"#b91c1c", padding:"4px 8px", borderRadius:4, fontWeight:600 }}>Pasado</span>}
                              <span className={ev.activo ? "estatus-activo" : "estatus-inactivo"}>{ev.activo ? "Activo" : "Inactivo"}</span>
                            </div>
                          </td>
                          <td>
                            <div className="ut-actions">
                              <button className="ut-btn-icon" title="Ver inscritos" onClick={() => navigate(`/admin/inscritos/${ev._id}`)}><Eye size={15} /></button>
                              {mio && !pasado ? (
                                <>
                                  <button data-action className="ut-btn-icon" title="Editar" onClick={() => abrirEditar(ev)}><Pencil size={15} /></button>
                                  <button data-action className="ut-btn-icon" title={ev.activo ? "Desactivar" : "Activar"} onClick={() => toggleActivo(ev)}>{ev.activo ? <PowerOff size={15} /> : <Power size={15} />}</button>
                                  <button data-action className="ut-btn-icon ut-btn-icon--danger" title="Eliminar" onClick={() => eliminarEvento(ev)}><Trash2 size={15} /></button>
                                </>
                              ) : mio && pasado ? <span style={{ fontSize:"0.7rem", color:"var(--gray-400)", fontStyle:"italic" }}>No editable</span> : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Paginacion total={listaAdminFiltrada.length} porPagina={POR_PAGINA} paginaActual={pagina} onChange={setPagina} />
            </TableWrapper>
          </div>
        </div>

        <AppModal open={showModal} titulo={modoEdicion ? "Editar Evento" : "Nuevo Evento"} subtitulo={modoEdicion ? "Modifica los datos del evento" : "Crea un nuevo evento para tu agenda"}
          onClose={cerrarModal} onSave={guardarEvento} saving={saving}
          saveText={modoEdicion ? "Actualizar" : "Crear Evento"}
          saveDisabled={Boolean(formData.destino) && espaciosDestino.length === 0 && !loadingEspacios}
          bodyRef={modalBodyRef}>
          {renderFormularioModal()}
        </AppModal>

        <ConfirmModal open={confirm.open} mensaje={confirm.mensaje} onConfirm={confirm.ejecutar} onCancel={confirm.cancelar} />
      </div>
    );
  }

  /* ═══════════ RENDER SUPERADMIN ═══════════ */
  return (
    <div className="eventos-container">
      <NavSidebar rol="superadmin" />
      <div className="eventos-main">
        <PageTopbar
          title="Gestión de Eventos"
          subtitle={`${eventos.length} evento(s) registrados`}
          onDownloadPDF={() => exportEventosPDF(eventos)}
        >
          <span style={{ fontSize:"0.75rem", padding:"4px 12px", borderRadius:20, background:"rgba(139,92,246,0.2)", color:"#c4b5fd", border:"1px solid rgba(139,92,246,0.4)", fontWeight:600 }}>⚡ Super Admin</span>
        </PageTopbar>

        <div className="eventos-content">
          <EventosCalendario eventos={eventos} />
          <div className="eventos-actions-top" style={{ marginTop:32 }}>
            <button data-action className="eventos-btn-agregar" onClick={abrirAgregar}><Plus size={18} /> Agregar Evento</button>
          </div>

          <TableWrapper loading={loading} error={error} empty={eventos.length === 0} variant="superadmin"
            emptyIcon={<Calendar size={38} />} emptyMsg="Sin eventos registrados">
            <>
              <table className="ut-table">
                <thead><tr>
                  <th>Título</th><th><MapPin size={13} /> Lugar</th><th>Fecha</th>
                  <th><Clock size={13} /> Horario</th><th><Users size={13} /> Cupos</th>
                  <th>Creado por</th><th>Estado</th><th>Acciones</th>
                </tr></thead>
                <tbody>
                  {eventosPagina.map(ev => {
                    const puedeMod = esMio(ev);
                    return (
                      <tr key={ev._id} style={{ opacity: puedeMod ? 1 : 0.6 }}>
                        <td style={{ fontWeight:600 }}>{ev.titulo}</td>
                        <td>{getNombreDest(ev.destino)}</td>
                        <td>{formatFecha(ev.fecha)}</td>
                        <td>{ev.horaInicio}–{ev.horaFin}</td>
                        <td>{ev.cuposDisponibles}/{ev.cupos}</td>
                        <td style={{ fontSize:"0.82rem", color:"#6b7280" }}>{nombreCreador(ev)}</td>
                        <td><span className={ev.activo ? "estatus-activo" : "estatus-inactivo"}>{ev.activo ? "Activo" : "Inactivo"}</span></td>
                        <td className="ut-actions">
                          <button className="ut-btn-icon" title="Ver inscritos" onClick={() => navigate(`/admin-sp/inscritos/${ev._id}`)}><Eye size={16} /></button>
                          <button data-action className="ut-btn-icon" onClick={() => abrirEditar(ev)} disabled={!puedeMod}><Pencil size={16} /></button>
                          <button data-action className="ut-btn-icon" onClick={() => toggleActivo(ev)} disabled={!puedeMod}>{ev.activo ? <PowerOff size={16} /> : <Power size={16} />}</button>
                          <button data-action className="ut-btn-icon ut-btn-icon--danger" onClick={() => eliminarEvento(ev)} disabled={!puedeMod}><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Paginacion total={eventos.length} porPagina={POR_PAGINA} paginaActual={pagina} onChange={setPagina} />
            </>
          </TableWrapper>
        </div>
      </div>

      {showModal && (
        <AppModal open={showModal} titulo={modoEdicion ? "Editar Evento" : "Agregar Evento"}
          onClose={cerrarModal} large bodyRef={modalBodyRef} hideFooter
          headerInside={
            <div className="paso-indicador">
              <span className={`paso-burbuja ${paso===1 ? "activo" : "completado"}`}>1</span>
              <span className="paso-linea" />
              <span className={`paso-burbuja ${paso===2 ? "activo" : "inactivo"}`}>2</span>
              <span className="paso-etiqueta">{paso===1 ? "Datos del evento" : "Reubicar evento existente"}</span>
            </div>
          }>
          {paso === 1 && (
            <>
              {renderFormularioModal()}
              <div className="modal-footer" style={{ marginTop:8 }}>
                <button className="btn-cancelar" onClick={cerrarModal}>Cancelar</button>
                <button data-action className="btn-guardar" onClick={guardarEvento} disabled={saving || (Boolean(formData.destino) && espaciosDestino.length===0 && !loadingEspacios)}>
                  {saving ? "Verificando..." : modoEdicion ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </>
          )}

          {paso === 2 && conflicto && (
            <>
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <div style={{ background:"linear-gradient(135deg,#fef3c7,#fde68a)", border:"1px solid #f59e0b", borderRadius:10, padding:"14px 16px", display:"flex", gap:10, alignItems:"flex-start" }}>
                  <AlertTriangle size={20} color="#d97706" style={{ flexShrink:0, marginTop:1 }} />
                  <div>
                    <p style={{ fontWeight:700, color:"#92400e", fontSize:"0.88rem", margin:0 }}>El lugar y espacio seleccionado ya está ocupado</p>
                    <p style={{ color:"#78350f", fontSize:"0.8rem", margin:"4px 0 0" }}>
                      El horario <strong>{formData.horaInicio}–{formData.horaFin}</strong> del{" "}
                      <strong>{new Date(formData.fecha+"T12:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"long",year:"numeric"})}</strong>{" "}
                      está ocupado por <em>"{conflicto.eventoTitulo}"</em>. Para continuar, elige un nuevo espacio.
                    </p>
                  </div>
                </div>

                <div className="nuevo-evento-box">
                  <p className="ne-label">Tu evento ({modoEdicion ? "editado" : "nuevo"}):</p>
                  <p className="ne-titulo">{formData.titulo}</p>
                  <p className="ne-meta">{new Date(formData.fecha+"T12:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"long"})}{" · "}{formData.horaInicio}–{formData.horaFin}{" · "}{destinos.find(d=>d._id===formData.destino)?.nombre||""}</p>
                </div>

                <div className="conflicto-box">
                  <p className="conflicto-titulo"><AlertTriangle size={14} /> Evento a reubicar:</p>
                  <p className="conflicto-nombre">"{conflicto.eventoTitulo}"</p>
                  <p className="conflicto-horario">{conflicto.horaInicio}–{conflicto.horaFin}</p>
                </div>

                <div className="form-group">
                  <label style={{ fontWeight:600, color:"#374151" }}>Sugerencias de reubicación *</label>
                  {conflicto.loadingEspacios && <p className="form-hint">Cargando sugerencias…</p>}
                  {!conflicto.loadingEspacios && conflicto.espaciosCargados.length===0 && conflicto.espaciosExternos.length===0 && <div className="sin-salas-aviso">⚠ No hay sugerencias disponibles para esta fecha/hora/cupo.</div>}

                  {!conflicto.loadingEspacios && conflicto.espaciosCargados.length > 0 && (
                    <div className="sugerencias-group">
                      <h4>Sugerencias en el edificio actual</h4>
                      <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:6 }}>
                        {conflicto.espaciosCargados.map(sala => (
                          <label key={sala._id} className={`sala-opcion ${conflicto.nuevoDestino===formData.destino && conflicto.nuevoEspacio===sala._id ? "seleccionada" : ""}`} onClick={() => seleccionarSalaReubicacion(formData.destino, sala._id)} style={{ cursor:"pointer" }}>
                            {conflicto.nuevoDestino===formData.destino && conflicto.nuevoEspacio===sala._id ? <CheckCircle2 size={18} color="#16a34a" /> : <div className="sala-radio-circulo" />}
                            <div><p className="sala-nombre">{sala.nombre}</p><p className="sala-meta">Planta {sala.planta} · {sala.cupos} cupos · ✓ Disponible</p></div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {!conflicto.loadingEspacios && conflicto.espaciosExternos.length > 0 && (
                    <div className="sugerencias-group" style={{ marginTop:14 }}>
                      <h4>Sugerencias en otros edificios</h4>
                      {conflicto.espaciosExternos.map(dest => (
                        <div key={dest.destinoId} style={{ border:"1px solid #e5e7eb", borderRadius:8, padding:10, marginBottom:10 }}>
                          <p style={{ margin:"0 0 6px", fontWeight:600 }}>{dest.destinoNombre}</p>
                          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                            {dest.espacios.map(sala => (
                              <label key={sala._id} className={`sala-opcion ${conflicto.nuevoDestino===dest.destinoId && conflicto.nuevoEspacio===sala._id ? "seleccionada" : ""}`} onClick={() => seleccionarSalaReubicacion(dest.destinoId, sala._id)} style={{ cursor:"pointer" }}>
                                {conflicto.nuevoDestino===dest.destinoId && conflicto.nuevoEspacio===sala._id ? <CheckCircle2 size={18} color="#16a34a" /> : <div className="sala-radio-circulo" />}
                                <div><p className="sala-nombre">{sala.nombre}</p><p className="sala-meta">Planta {sala.planta} · {sala.cupos} cupos · ✓ Disponible</p></div>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {conflicto.nuevoEspacio && (
                    <div style={{ background:"#f0fdf4", border:"1px solid #86efac", borderRadius:8, padding:"10px 14px", display:"flex", gap:8, alignItems:"center", marginTop:12 }}>
                      <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink:0 }} />
                      <p style={{ fontSize:"0.82rem", color:"#15803d", margin:0 }}>
                        <strong>"{conflicto.eventoTitulo}"</strong> se moverá a <strong>{destinos.find(d=>d._id===conflicto.nuevoDestino)?.nombre}</strong>{" – "}
                        <strong>{conflicto.espaciosCargados.find(e=>e._id===conflicto.nuevoEspacio)?.nombre || conflicto.espaciosExternos.flatMap(d=>d.espacios).find(e=>e._id===conflicto.nuevoEspacio)?.nombre}</strong>.
                      </p>
                    </div>
                  )}

                  {modalError && <div className="modal-error-box"><p>{modalError}</p></div>}
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop:8 }}>
                <button className="btn-cancelar" onClick={() => { setPaso(1); setModalError(""); setConflicto(null); }}>← Volver</button>
                <button data-action className="btn-guardar" onClick={confirmarReasignacion} disabled={saving || !conflicto.nuevoDestino || !conflicto.nuevoEspacio}>
                  {saving ? "Guardando..." : "Confirmar"}
                </button>
              </div>
            </>
          )}
        </AppModal>
      )}

      <ConfirmModal open={confirm.open} mensaje={confirm.mensaje} onConfirm={confirm.ejecutar} onCancel={confirm.cancelar} />
    </div>
  );
};

export default Eventos;