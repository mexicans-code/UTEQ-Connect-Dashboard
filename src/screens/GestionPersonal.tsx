import React, { useState, useEffect, useMemo, useRef } from "react";
import "../styles/GestionPersonal.css";
import "../styles/tabla.css";
import NavSidebar from "./components/NavSidebar";
import PageTopbar from "./components/PageTopbar";
import {
  Plus, Pencil, Trash2, X, Search,
  Mail, Phone, Building2, MapPin, User,
  LayoutGrid, List, Ban, CheckCircle,
  Briefcase, GraduationCap, Wrench, Star,
  ShieldCheck, UserCheck, FileDown,
} from "lucide-react";
import {
  getPersonal, createPersonal, updatePersonal, deletePersonal, toggleEstatusPersonal,
  uploadPersonalProfileImage, deletePersonalProfileImage,
  uploadPersonalScheduleImage, deletePersonalScheduleImage,
  type Personal, type CreatePersonalData,
} from "../api/personal";
import {
  getUserById, updateUsuario, deleteUsuario, registerAdmin,
} from "../api/users";
import { getLocations } from "../api/locations";
import Paginacion from "./components/Paginacion";
import ImageUploader from "./components/ImageUploader";
import { exportPersonalPDF } from "../utils/pdfExport";
import { notifyLocal } from "../utils/notify.ts";
import FieldError from "./components/ui/FieldError";
import CharCount from "./components/ui/CharCount";
import FormField from "./components/ui/FormField";
import { FIELD_LIMITS, validateField } from "../utils/fieldLimits";
import AppModal from "./components/shared/AppModal";
import TableWrapper from "./components/shared/TableWrapper";
import { useConfirm } from "../hooks/useConfirm";
import ConfirmModal from "./components/ConfirmModal";

interface Props { rol: "admin" | "superadmin"; }

type TipoCuenta = "none" | "user" | "admin" | "superadmin";

interface FormData {
  numeroEmpleado: string; nombre: string; apellidoPaterno: string; apellidoMaterno: string;
  email: string; telefono: string; departamento: string; cargo: string;
  cubiculo: string; planta: string; fechaIngreso: string;
  estatus: "activo" | "inactivo"; rol: "admin" | "superadmin"; tipoCuenta: TipoCuenta;
}

interface FormErrors {
  nombre?: string; apellidoPaterno?: string; apellidoMaterno?: string;
  email?: string; telefono?: string; numeroEmpleado?: string;
  departamento?: string; cargo?: string; fechaIngreso?: string;
}

const EMPTY_FORM: FormData = {
  numeroEmpleado: "", nombre: "", apellidoPaterno: "", apellidoMaterno: "",
  email: "", telefono: "", departamento: "", cargo: "",
  cubiculo: "", planta: "", fechaIngreso: "", estatus: "activo", rol: "admin", tipoCuenta: "none",
};

const CARGOS = [
  "Profesor / Docente", "Coordinador de Carrera", "Jefe de Departamento",
  "Director de División", "Rector", "Secretaria", "Administrativo",
  "Recursos Humanos", "Servicios Escolares", "Biblioteca", "Enfermería",
  "Mantenimiento", "Intendente / Limpieza", "Cafetería", "Seguridad / Vigilancia", "Otro",
];

const TABS = ["Datos personales", "Laboral", "Acceso al sistema"];

const getTipoBadge = (cargo: string) => {
  const c = cargo.toLowerCase();
  if (c.includes("profesor") || c.includes("docente") || c.includes("maestro"))
    return { label: "Docente",   cls: "badge-tipo-docente",   icon: <GraduationCap size={11} /> };
  if (c.includes("director") || c.includes("rector") || c.includes("jefe") || c.includes("coordinador"))
    return { label: "Directivo", cls: "badge-tipo-directivo", icon: <Star size={11} /> };
  if (c.includes("admin") || c.includes("secretar"))
    return { label: "Admin",     cls: "badge-tipo-admin",     icon: <Briefcase size={11} /> };
  if (c.includes("manten") || c.includes("limpieza") || c.includes("servicio") || c.includes("cafet") || c.includes("intendente"))
    return { label: "Servicio",  cls: "badge-tipo-servicio",  icon: <Wrench size={11} /> };
  return   { label: "Personal",  cls: "badge-tipo-default",   icon: <User size={11} /> };
};

const getIniciales = (nombre: string, ap: string) => `${nombre.charAt(0)}${ap.charAt(0)}`.toUpperCase();

const OPCIONES_CUENTA: Record<"admin" | "superadmin", { val: TipoCuenta; icon: React.ReactNode; label: string; desc: string; color: string }[]> = {
  admin: [
    { val: "none",  icon: <X size={18}/>,          label: "Ninguno",       desc: "Sin cuenta de acceso.",           color: "#6b7280" },
    { val: "admin", icon: <ShieldCheck size={18}/>, label: "Administrador", desc: "Gestiona eventos y ubicaciones.", color: "#8b5cf6" },
  ],
  superadmin: [
    { val: "none",       icon: <X size={18}/>,          label: "Ninguno",            desc: "Sin cuenta de acceso.",       color: "#6b7280" },
    { val: "user",       icon: <UserCheck size={18}/>,   label: "Usuario normal",     desc: "Puede ver eventos y rutas.",  color: "#3b82f6" },
    { val: "admin",      icon: <ShieldCheck size={18}/>, label: "Administrador",      desc: "Gestiona eventos y rutas.",   color: "#8b5cf6" },
    { val: "superadmin", icon: <Star size={18}/>,        label: "Super Administrador",desc: "Control total del sistema.",  color: "#ef4444" },
  ],
};

const getPassInicial = (numeroEmpleado: string): string =>
  numeroEmpleado.length >= 8 ? numeroEmpleado : `${numeroEmpleado}@ITQ`;

const GestionPersonal: React.FC<Props> = ({ rol }) => {
  const esSuperAdmin = rol === "superadmin";
  const confirm = useConfirm();

  const [personal,  setPersonal]  = useState<Personal[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [locations, setLocations] = useState<string[]>([]);

  const [busqueda,      setBusqueda]      = useState("");
  const [filtroDpto,    setFiltroDpto]    = useState("");
  const [filtroEstatus, setFiltroEstatus] = useState("");
  const [vista,         setVista]         = useState<"grid" | "lista">("grid");
  const [pagina,        setPagina]        = useState(1);
  const POR_PAGINA = 12;

  const [showModal,                setShowModal]                = useState(false);
  const [modoEdicion,              setModoEdicion]              = useState(false);
  const [actual,                   setActual]                   = useState<Personal | null>(null);
  const [saving,                   setSaving]                   = useState(false);
  const [uploadingImg,             setUploadingImg]             = useState(false);
  const [imagenPendiente,          setImagenPendiente]          = useState<File | null>(null);
  const [imagenHorarioPendiente,   setImagenHorarioPendiente]   = useState<File | null>(null);
  const [modalError,               setModalError]               = useState("");
  const [formData,                 setFormData]                 = useState<FormData>(EMPTY_FORM);
  const [formErrors,               setFormErrors]               = useState<FormErrors>({});
  const [tabActivo,                setTabActivo]                = useState(0);
  const [showCuentaModal,          setShowCuentaModal]          = useState(false);
  const [pendingForm,              setPendingForm]              = useState<FormData | null>(null);
  const [userActual,               setUserActual]               = useState<any | null>(null);

  const refNombre         = useRef<HTMLDivElement>(null);
  const refApPaterno      = useRef<HTMLDivElement>(null);
  const refApMaterno      = useRef<HTMLDivElement>(null);
  const refTelefono       = useRef<HTMLDivElement>(null);
  const refEmail          = useRef<HTMLDivElement>(null);
  const refNumeroEmpleado = useRef<HTMLDivElement>(null);
  const refDepartamento   = useRef<HTMLDivElement>(null);
  const refCargo          = useRef<HTMLDivElement>(null);
  const refFechaIngreso   = useRef<HTMLDivElement>(null);
  const modalBodyRef      = useRef<HTMLDivElement>(null);

  /* ── Fetch ── */
  const fetchPersonal = async () => {
    setLoading(true); setError("");
    try {
      const data = await getPersonal();
      setPersonal(data);
    } catch { setError("Error al cargar personal. Verifica tu sesión."); }
    finally { setLoading(false); }
  };

  const fetchLocations = async () => {
    try {
      const lista = await getLocations();
      setLocations(lista.map(l => l.nombre));
    } catch {}
  };

  useEffect(() => { fetchPersonal(); fetchLocations(); }, []);

  /* ── Filtros ── */
  const personalFiltrado = useMemo(() => {
    return personal.filter(p => {
      const full = `${p.nombre ?? ""} ${p.apellidoPaterno ?? ""} ${p.apellidoMaterno ?? ""}`.toLowerCase();
      const matchQ = !busqueda || [full, p.email ?? "", p.numeroEmpleado ?? "", p.cargo ?? "", p.departamento ?? ""]
        .some(s => s.toLowerCase().includes(busqueda.toLowerCase()));
      return matchQ && (!filtroDpto || p.departamento === filtroDpto) && (!filtroEstatus || p.estatus === filtroEstatus);
    });
  }, [personal, busqueda, filtroDpto, filtroEstatus]);

  useEffect(() => { setPagina(1); }, [busqueda, filtroDpto, filtroEstatus]);

  const personalPagina = useMemo(
    () => personalFiltrado.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
    [personalFiltrado, pagina]
  );

  /* ── Modal: abrir / cerrar ── */
  const abrirAgregar = () => {
    setModoEdicion(false); setActual(null);
    setFormData(EMPTY_FORM); setFormErrors({}); setModalError(""); setTabActivo(0); setShowModal(true);
  };

  const abrirEditar = async (p: Personal) => {
    setModoEdicion(true); setActual(p); setUserActual(null);
    let tipoCuenta: TipoCuenta = "none";
    if (p.userId) {
      try {
        const res = await getUserById(p.userId as string);
        if (res.success) {
          const user = res.data;
          setUserActual(user);
          tipoCuenta = esSuperAdmin ? user.rol : (user.rol === "admin" ? "admin" : "none");
        }
      } catch (err) { console.warn("Error fetching user:", err); }
    }
    setFormData({
      numeroEmpleado: p.numeroEmpleado, nombre: p.nombre,
      apellidoPaterno: p.apellidoPaterno, apellidoMaterno: p.apellidoMaterno,
      email: p.email, telefono: p.telefono, departamento: p.departamento, cargo: p.cargo,
      cubiculo: p.cubiculo || "", planta: p.planta || "",
      fechaIngreso: p.fechaIngreso ? p.fechaIngreso.split("T")[0] : "",
      estatus: p.estatus, rol: p.rol as "admin" | "superadmin", tipoCuenta,
    });
    setFormErrors({}); setModalError(""); setTabActivo(0); setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false); setFormErrors({}); setModalError(""); setFormData(EMPTY_FORM);
    setTabActivo(0); setModoEdicion(false); setActual(null);
    setImagenPendiente(null); setImagenHorarioPendiente(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof FormErrors]) setFormErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const scrollToRef = (ref: React.RefObject<HTMLDivElement>) => {
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      (ref.current?.querySelector("input, select") as HTMLElement | null)?.focus();
    }, 50);
  };

  const errStyle = (hasErr: boolean): React.CSSProperties => hasErr ? { border: "1.5px solid #f87171", outline: "none" } : {};

  /* ── Validación ── */
  const validar = (): boolean => {
    const errors: FormErrors = {};
    let firstRef: React.RefObject<HTMLDivElement> | null = null;
    let firstTab: number | null = null;

    const errNombre = validateField(formData.nombre, FIELD_LIMITS.nombre);
    if (errNombre) { errors.nombre = errNombre; if (!firstRef) { firstRef = refNombre; firstTab = 0; } }

    const errApPaterno = validateField(formData.apellidoPaterno, FIELD_LIMITS.apellidoPaterno);
    if (errApPaterno) { errors.apellidoPaterno = errApPaterno; if (!firstRef) { firstRef = refApPaterno; firstTab = 0; } }

    const errApMaterno = validateField(formData.apellidoMaterno, FIELD_LIMITS.apellidoMaterno);
    if (errApMaterno) { errors.apellidoMaterno = errApMaterno; if (!firstRef) { firstRef = refApMaterno; firstTab = 0; } }

    if (!formData.telefono.trim()) { errors.telefono = "El teléfono es obligatorio."; if (!firstRef) { firstRef = refTelefono; firstTab = 0; } }
    else if (!/^[0-9]{10}$/.test(formData.telefono.replace(/\s/g, ""))) { errors.telefono = "El teléfono debe tener exactamente 10 dígitos."; if (!firstRef) { firstRef = refTelefono; firstTab = 0; } }

    if (!formData.email.trim()) { errors.email = "El correo electrónico es obligatorio."; if (!firstRef) { firstRef = refEmail; firstTab = 0; } }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { errors.email = "El correo no tiene un formato válido."; if (!firstRef) { firstRef = refEmail; firstTab = 0; } }

    const errNumEmp = validateField(formData.numeroEmpleado, FIELD_LIMITS.numeroEmpleado);
    if (errNumEmp) { errors.numeroEmpleado = errNumEmp; if (!firstRef) { firstRef = refNumeroEmpleado; firstTab = 1; } }

    if (!formData.departamento) { errors.departamento = "Selecciona un departamento."; if (!firstRef) { firstRef = refDepartamento; firstTab = 1; } }
    if (!formData.cargo)        { errors.cargo = "Selecciona un cargo."; if (!firstRef) { firstRef = refCargo; firstTab = 1; } }
    if (!formData.fechaIngreso) { errors.fechaIngreso = "La fecha de ingreso es obligatoria."; if (!firstRef) { firstRef = refFechaIngreso; firstTab = 1; } }

    setFormErrors(errors);
    if (firstRef) {
      if (firstTab !== null && firstTab !== tabActivo) { setTabActivo(firstTab); setTimeout(() => scrollToRef(firstRef!), 120); }
      else scrollToRef(firstRef);
      return false;
    }
    return true;
  };

  /* ── Guardar ── */
  const guardar = async () => {
    if (!validar()) return;
    if (!modoEdicion) {
      if (!esSuperAdmin || formData.tipoCuenta !== "none") { setPendingForm({ ...formData }); setShowCuentaModal(true); return; }
      await ejecutarGuardar({ ...formData }, false); return;
    }
    await ejecutarGuardar(formData, false);
  };

  const ejecutarGuardar = async (data: FormData, crearCuenta: boolean) => {
    setSaving(true); setModalError("");
    try {
      if (modoEdicion && actual) {
        const tipoCuentaAnterior: TipoCuenta = !actual.userId ? "none" : (userActual?.rol || "none");
        const tipoCuentaNuevo = data.tipoCuenta;
        let userId = actual.userId;

        if (tipoCuentaAnterior === "none" && tipoCuentaNuevo !== "none") {
          try {
            const passInicial = getPassInicial(data.numeroEmpleado);
            const nuevoUserId = await registerAdmin({
              nombre: `${data.nombre} ${data.apellidoPaterno}`,
              email: data.email, password: passInicial, rol: tipoCuentaNuevo,
              requiereCambioPassword: tipoCuentaNuevo === "admin" || tipoCuentaNuevo === "superadmin",
            });
            if (nuevoUserId) userId = nuevoUserId;
          } catch (e: any) { console.warn("Error al crear cuenta:", e?.response?.data); setModalError("Personal actualizado, pero no se pudo crear la cuenta de acceso."); }
        } else if (tipoCuentaAnterior !== "none" && tipoCuentaNuevo === "none") {
          if (actual.userId) {
            try { await deleteUsuario(actual.userId as string); userId = undefined; }
            catch (e: any) { setModalError("Personal actualizado, pero no se pudo eliminar la cuenta."); }
          }
        } else if (tipoCuentaAnterior !== "none" && tipoCuentaNuevo !== "none" && tipoCuentaAnterior !== tipoCuentaNuevo) {
          if (actual.userId) {
            try { await updateUsuario(actual.userId, { rol: tipoCuentaNuevo }); }
            catch (e: any) { setModalError("Personal actualizado, pero no se pudo cambiar el rol."); }
          }
        }

        await updatePersonal(actual._id, {
          numeroEmpleado: data.numeroEmpleado, nombre: data.nombre,
          apellidoPaterno: data.apellidoPaterno, apellidoMaterno: data.apellidoMaterno,
          email: data.email, telefono: data.telefono, departamento: data.departamento,
          cargo: data.cargo, cubiculo: data.cubiculo, planta: data.planta,
          fechaIngreso: data.fechaIngreso, estatus: data.estatus,
          ...(userId !== undefined ? { userId } : {}),
        });
      } else {
        let userId: string | null = null;
        if (crearCuenta && data.tipoCuenta !== "none") {
          try {
            const passInicial = getPassInicial(data.numeroEmpleado);
            userId = await registerAdmin({
              nombre: `${data.nombre} ${data.apellidoPaterno}`,
              email: data.email, password: passInicial, rol: data.tipoCuenta,
              requiereCambioPassword: data.tipoCuenta === "admin" || data.tipoCuenta === "superadmin",
            });
          } catch (e: any) { setModalError("Personal guardado, pero no se pudo crear la cuenta de acceso."); }
        }
        const nuevoId = await createPersonal({
          numeroEmpleado: data.numeroEmpleado, nombre: data.nombre,
          apellidoPaterno: data.apellidoPaterno, apellidoMaterno: data.apellidoMaterno,
          email: data.email, telefono: data.telefono, departamento: data.departamento,
          cargo: data.cargo, cubiculo: data.cubiculo, planta: data.planta,
          fechaIngreso: data.fechaIngreso, estatus: data.estatus,
          ...(userId ? { userId } : {}),
        });
        if (nuevoId && imagenPendiente) {
          try { await uploadPersonalProfileImage(nuevoId, imagenPendiente); } catch {}
          setImagenPendiente(null);
        }
        if (nuevoId && imagenHorarioPendiente) {
          try { await uploadPersonalScheduleImage(nuevoId, imagenHorarioPendiente); } catch {}
          setImagenHorarioPendiente(null);
        }
      }
      setShowCuentaModal(false);
      cerrarModal(); fetchPersonal();
      notifyLocal(
        modoEdicion ? "Personal actualizado" : "Personal registrado",
        `${data.nombre} ${data.apellidoPaterno} fue ${modoEdicion ? "actualizado" : "registrado"} correctamente.`
      );
    } catch (err: any) {
      setModalError(err.response?.data?.message || err.response?.data?.error || "Error al guardar.");
    } finally { setSaving(false); }
  };

  /* ── Acciones ── */
  const eliminar = (id: string) => {
    const found = personal.find(p => p._id === id);
    confirm.pedir("¿Eliminar este registro permanentemente? Esta acción no se puede deshacer.", async () => {
      try {
        await deletePersonal(id); fetchPersonal();
        notifyLocal("Personal eliminado", found ? `${found.nombre} ${found.apellidoPaterno} fue eliminado.` : "Registro eliminado.");
      } catch { setModalError("Error al eliminar."); }
    });
  };

  const toggleEstatus = async (p: Personal) => {
    try {
      await toggleEstatusPersonal(p._id, p.estatus);
      fetchPersonal();
      notifyLocal("Estatus actualizado", `${p.nombre} ${p.apellidoPaterno} fue ${p.estatus === "activo" ? "desactivado" : "activado"}.`);
    } catch {}
  };

  const subirImagenPersonal    = async (id: string, file: File) => { setUploadingImg(true); try { await uploadPersonalProfileImage(id, file); fetchPersonal(); } catch { setModalError("Error al subir la imagen."); } finally { setUploadingImg(false); } };
  const eliminarImagenPersonal = async (id: string) => { setUploadingImg(true); try { await deletePersonalProfileImage(id); fetchPersonal(); } catch { setModalError("Error al eliminar la imagen."); } finally { setUploadingImg(false); } };
  const subirImagenHorario     = async (id: string, file: File) => { setUploadingImg(true); try { await uploadPersonalScheduleImage(id, file); fetchPersonal(); } catch { setModalError("Error al subir la imagen de horario."); } finally { setUploadingImg(false); } };
  const eliminarImagenHorario  = async (id: string) => { setUploadingImg(true); try { await deletePersonalScheduleImage(id); fetchPersonal(); } catch { setModalError("Error al eliminar la imagen de horario."); } finally { setUploadingImg(false); } };

  const renderAcciones = (p: Personal) => (
    <div className={vista === "grid" ? "personal-card-actions" : "acciones"}>
      <button data-action className="ut-btn-icon" onClick={() => abrirEditar(p)} title="Editar"><Pencil size={14}/></button>
      <button data-action className={`ut-btn-icon ${p.estatus === "activo" ? "ut-btn-icon--warn" : "ut-btn-icon--success"}`} onClick={() => toggleEstatus(p)} title={p.estatus === "activo" ? "Desactivar" : "Activar"}>
        {p.estatus === "activo" ? <Ban size={14}/> : <CheckCircle size={14}/>}
      </button>
      <button data-action className="ut-btn-icon ut-btn-icon--danger" onClick={() => eliminar(p._id)} title="Eliminar"><Trash2 size={14}/></button>
    </div>
  );

  return (
    <div className="personal-container">
      <NavSidebar rol={rol} />

      <div className="personal-main">
        <PageTopbar
          title="Gestión de Personal"
          subtitle={loading ? "Cargando…" : `${personal.length} registro(s) · ${personalFiltrado.length} mostrado(s)`}
          showDownload={false}
        />

        <div className="personal-content">
          <div className="personal-toolbar">
            <div className="personal-search-wrapper">
              <Search size={15} />
              <input className="personal-search" placeholder="Buscar por nombre, correo, n° empleado o cargo…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </div>
            <select className="personal-filter" value={filtroDpto} onChange={e => setFiltroDpto(e.target.value)}>
              <option value="">Todos los deptos.</option>
              {locations.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select className="personal-filter" value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)} style={{ minWidth: 110 }}>
              <option value="">Todos</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
            </select>
            <div className="vista-toggle">
              <button className={vista === "grid" ? "active" : ""} onClick={() => setVista("grid")} title="Tarjetas"><LayoutGrid size={15} /></button>
              <button className={vista === "lista" ? "active" : ""} onClick={() => setVista("lista")} title="Lista"><List size={15} /></button>
            </div>
            <button data-action className="btn-agregar-personal" onClick={abrirAgregar}><Plus size={16} /> Agregar Personal</button>
            <button data-action onClick={() => exportPersonalPDF(personalFiltrado)} title="Descargar PDF"
              style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 14px", borderRadius:"var(--radius-sm)", background:"#e53e3e", color:"#fff", border:"none", cursor:"pointer", fontSize:"0.85rem", fontWeight:600 }}>
              <FileDown size={15} /> Descargar PDF
            </button>
          </div>

          {/* Vista Grid */}
          {!loading && vista === "grid" && (
            <TableWrapper loading={false} error={error} empty={personalFiltrado.length === 0} variant="admin"
              emptyIcon={<User size={40} />} emptyMsg="No se encontró personal con esos filtros.">
              <div className="personal-grid">
                {personalPagina.map(p => {
                  const tipo = getTipoBadge(p.cargo);
                  const nc = `${p.nombre} ${p.apellidoPaterno} ${p.apellidoMaterno}`;
                  return (
                    <div key={p._id} className={`personal-card ${p.estatus === "inactivo" ? "inactivo" : ""}`}>
                      <div className="personal-card-top">
                        {p.imagenPerfil
                          ? <img src={p.imagenPerfil} alt={nc} className="personal-avatar" />
                          : <div className="personal-avatar-placeholder">{getIniciales(p.nombre, p.apellidoPaterno)}</div>}
                        <div className="personal-card-info">
                          <p className="personal-card-nombre">{nc}</p>
                          <p className="personal-card-cargo">{p.cargo}</p>
                          <p className="personal-card-num">#{p.numeroEmpleado}</p>
                        </div>
                      </div>
                      <div className="personal-card-details">
                        <div className="personal-card-detail"><Building2 size={13}/><span>{p.departamento}</span></div>
                        <div className="personal-card-detail"><Mail size={13}/><span>{p.email}</span></div>
                        <div className="personal-card-detail"><Phone size={13}/><span>{p.telefono}</span></div>
                        {(p.planta || p.cubiculo) && <div className="personal-card-detail"><MapPin size={13}/><span>{[p.planta, p.cubiculo ? `Cub. ${p.cubiculo}` : ""].filter(Boolean).join(" · ")}</span></div>}
                      </div>
                      <div className="personal-card-footer">
                        <div className="personal-card-badges">
                          <span className={`badge-tipo ${tipo.cls}`}>{tipo.icon} {tipo.label}</span>
                          <span className={p.estatus === "activo" ? "estatus-activo" : "estatus-inactivo"}>{p.estatus}</span>
                        </div>
                        {renderAcciones(p)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TableWrapper>
          )}

          {/* Vista Lista */}
          {!loading && vista === "lista" && (
            <TableWrapper loading={loading} error={error} empty={personalFiltrado.length === 0} variant="admin"
              emptyIcon={<User size={40} />} emptyMsg="No se encontró personal.">
              <div className="ut-table-wrapper">
                <table className="ut-table">
                  <thead><tr>
                    <th>Nombre</th><th>Departamento</th><th>Cargo / Tipo</th>
                    <th>Teléfono</th><th>Ubicación</th><th>Estatus</th><th>Acciones</th>
                  </tr></thead>
                  <tbody>
                    {personalPagina.map(p => {
                      const tipo = getTipoBadge(p.cargo);
                      const nc = `${p.nombre} ${p.apellidoPaterno} ${p.apellidoMaterno}`;
                      return (
                        <tr key={p._id}>
                          <td>
                            <div className="table-nombre-cell">
                              {p.imagenPerfil ? <img src={p.imagenPerfil} alt={nc} className="table-avatar"/> : <div className="table-avatar-placeholder">{getIniciales(p.nombre, p.apellidoPaterno)}</div>}
                              <div className="table-nombre-info"><strong>{nc}</strong><span>#{p.numeroEmpleado}</span></div>
                            </div>
                          </td>
                          <td>{p.departamento}</td>
                          <td>
                            <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                              <span className={`badge-tipo ${tipo.cls}`}>{tipo.icon} {tipo.label}</span>
                              <span style={{ fontSize:"0.8rem", color:"var(--gray-600)" }}>{p.cargo}</span>
                            </div>
                          </td>
                          <td>{p.telefono}</td>
                          <td style={{ fontSize:"0.82rem", color:"var(--gray-500)" }}>{[p.planta, p.cubiculo ? `Cub. ${p.cubiculo}` : ""].filter(Boolean).join(" · ") || "—"}</td>
                          <td><span className={p.estatus === "activo" ? "estatus-activo" : "estatus-inactivo"}>{p.estatus}</span></td>
                          <td>{renderAcciones(p)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TableWrapper>
          )}

          <Paginacion total={personalFiltrado.length} porPagina={POR_PAGINA} paginaActual={pagina} onChange={setPagina} />
        </div>
      </div>

      {/* ══ Modal principal ══ */}
      <AppModal
        open={showModal}
        titulo={modoEdicion ? "Editar Personal" : "Agregar Personal"}
        onClose={cerrarModal}
        large
        bodyRef={modalBodyRef}
        saving={saving}
        saveText={modoEdicion ? "Actualizar" : "Guardar"}
        onSave={guardar}
        customFooter={
          <div style={{ display:"flex", width:"100%", alignItems:"center" }}>
            {tabActivo > 0 && <button className="btn-cancelar" onClick={() => setTabActivo(t => t - 1)} style={{ marginRight:"auto" }}>← Anterior</button>}
            <div style={{ marginLeft:"auto", display:"flex", gap:10 }}>
              <button className="btn-cancelar" onClick={cerrarModal}>Cancelar</button>
              {tabActivo < TABS.length - 1
                ? <button className="btn-guardar" onClick={() => setTabActivo(t => t + 1)}>Siguiente →</button>
                : <button className="btn-guardar" onClick={guardar} disabled={saving}>{saving ? "Guardando…" : modoEdicion ? "Actualizar" : "Guardar"}</button>}
            </div>
          </div>
        }
        headerExtra={
          <div className="modal-tabs">
            {TABS.map((t, i) => {
              const hasErr = (i === 0 && (formErrors.nombre || formErrors.apellidoPaterno || formErrors.apellidoMaterno || formErrors.email || formErrors.telefono)) ||
                             (i === 1 && (formErrors.numeroEmpleado || formErrors.departamento || formErrors.cargo || formErrors.fechaIngreso));
              return (
                <button key={t} className={`modal-tab ${tabActivo === i ? "active" : ""}`} onClick={() => setTabActivo(i)}
                  style={hasErr ? { color:"#dc2626", borderBottomColor:"#dc2626" } : {}}>
                  {t}{hasErr && <span style={{ marginLeft:5, fontSize:"0.65rem", color:"#dc2626" }}>⚠</span>}
                </button>
              );
            })}
          </div>
        }
      >
        {/* Tab 0: Datos personales */}
        {tabActivo === 0 && (
          <div className="form-grid">
            <div className="form-group full" style={{ display:"flex", justifyContent:"center", paddingBottom:8 }}>
              {modoEdicion && actual ? (
                <ImageUploader currentImage={actual.imagenPerfil}
                  placeholder={<span style={{ fontSize:"1.4rem", fontWeight:700, color:"var(--blue-700)" }}>{actual.nombre.charAt(0)}{actual.apellidoPaterno.charAt(0)}</span>}
                  onUpload={file => subirImagenPersonal(actual._id, file)} onDelete={() => eliminarImagenPersonal(actual._id)} uploading={uploadingImg} shape="circle" size={88} />
              ) : (
                <ImageUploader currentImage={imagenPendiente ? URL.createObjectURL(imagenPendiente) : null}
                  placeholder={<span style={{ fontSize:"1.4rem" }}>📷</span>}
                  onFileSelect={f => setImagenPendiente(f)} uploading={false} shape="circle" size={88} />
              )}
            </div>
            <FormField label="Nombre(s) *" limits={FIELD_LIMITS.nombre} value={formData.nombre} error={formErrors.nombre} containerRef={refNombre}>
              <input name="nombre" placeholder="Nombre(s)" value={formData.nombre} maxLength={FIELD_LIMITS.nombre.max} style={errStyle(!!formErrors.nombre)} onChange={handleChange} autoComplete="off" />
            </FormField>
            <FormField label="Apellido paterno *" limits={FIELD_LIMITS.apellidoPaterno} value={formData.apellidoPaterno} error={formErrors.apellidoPaterno} containerRef={refApPaterno}>
              <input name="apellidoPaterno" placeholder="Apellido paterno" value={formData.apellidoPaterno} maxLength={FIELD_LIMITS.apellidoPaterno.max} style={errStyle(!!formErrors.apellidoPaterno)} onChange={handleChange} />
            </FormField>
            <FormField label="Apellido materno *" limits={FIELD_LIMITS.apellidoMaterno} value={formData.apellidoMaterno} error={formErrors.apellidoMaterno} containerRef={refApMaterno}>
              <input name="apellidoMaterno" placeholder="Apellido materno" value={formData.apellidoMaterno} maxLength={FIELD_LIMITS.apellidoMaterno.max} style={errStyle(!!formErrors.apellidoMaterno)} onChange={handleChange} />
            </FormField>
            <FormField label="Teléfono *" max={10} value={formData.telefono} error={formErrors.telefono} containerRef={refTelefono}>
              <input name="telefono" placeholder="Ej: 4421234567" value={formData.telefono} maxLength={10} style={errStyle(!!formErrors.telefono)}
                onKeyDown={e => { if (!/[0-9]/.test(e.key) && !["Backspace","Delete","Tab","ArrowLeft","ArrowRight"].includes(e.key)) e.preventDefault(); }} onChange={handleChange} />
            </FormField>
            <FormField label="Correo electrónico * (único)" max={80} value={formData.email} error={formErrors.email} containerRef={refEmail} className="full">
              <input type="email" name="email" placeholder="correo@uteq.edu.mx" value={formData.email} style={errStyle(!!formErrors.email)} onChange={handleChange} autoComplete="off" />
            </FormField>
          </div>
        )}

        {/* Tab 1: Laboral */}
        {tabActivo === 1 && (
          <div className="form-grid">
            <FormField label="Número de empleado * (único)" limits={FIELD_LIMITS.numeroEmpleado} value={formData.numeroEmpleado} error={formErrors.numeroEmpleado} containerRef={refNumeroEmpleado}>
              <input name="numeroEmpleado" placeholder="Ej: EMP-001" value={formData.numeroEmpleado} maxLength={FIELD_LIMITS.numeroEmpleado.max} style={errStyle(!!formErrors.numeroEmpleado)} onChange={handleChange} />
            </FormField>
            <FormField label="Fecha de ingreso *" error={formErrors.fechaIngreso} containerRef={refFechaIngreso}>
              <input type="date" name="fechaIngreso" value={formData.fechaIngreso} style={errStyle(!!formErrors.fechaIngreso)} onChange={handleChange} />
            </FormField>
            <FormField label="Departamento *" error={formErrors.departamento} containerRef={refDepartamento} className="full">
              <select name="departamento" value={formData.departamento} style={errStyle(!!formErrors.departamento)} onChange={handleChange}>
                <option value="">-- Selecciona departamento --</option>
                {locations.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </FormField>
            <FormField label="Cargo *" error={formErrors.cargo} containerRef={refCargo} className="full">
              <select name="cargo" value={formData.cargo} style={errStyle(!!formErrors.cargo)} onChange={handleChange}>
                <option value="">-- Selecciona un cargo --</option>
                {CARGOS.map((c, i) => <option key={`cargo-${i}`} value={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="Planta / Piso">
              <select name="planta" value={formData.planta} onChange={handleChange}>
                <option value="">-- Selecciona --</option>
                <option value="Planta baja">Planta baja</option>
                <option value="Planta alta">Planta alta</option>
                <option value="Planta única">Planta única</option>
              </select>
            </FormField>
            <FormField label="Cubículo / Oficina" limits={FIELD_LIMITS.cubiculo} value={formData.cubiculo}>
              <input name="cubiculo" placeholder="Ej: K-14" value={formData.cubiculo} maxLength={FIELD_LIMITS.cubiculo?.max} onChange={handleChange} />
            </FormField>
            <div className="form-group full">
              <label>Imagen de horario (opcional)</label>
              <ImageUploader shape="rect" size={220}
                currentImage={modoEdicion && actual?.imagenHorario ? actual.imagenHorario : (imagenHorarioPendiente ? URL.createObjectURL(imagenHorarioPendiente) : null)}
                onUpload={modoEdicion && actual ? async (file) => subirImagenHorario(actual._id, file) : undefined}
                onFileSelect={!modoEdicion ? (f) => setImagenHorarioPendiente(f) : undefined}
                onDelete={modoEdicion && actual ? async () => eliminarImagenHorario(actual._id) : undefined}
                placeholder="Subir imagen de horario" />
            </div>
            {modoEdicion && (
              <div className="form-group">
                <label>Estatus</label>
                <select name="estatus" value={formData.estatus} onChange={handleChange}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Acceso al sistema */}
        {tabActivo === 2 && (
          <div className="form-grid">
            <div className="form-group full">
              <div className="form-info-box">
                <strong> Cuenta de acceso al dashboard</strong><br/>
                Elige el tipo de acceso para este personal. Si seleccionas "Ninguno" se guardará sin cuenta de acceso.
              </div>
            </div>
            <div className="form-group full">
              <label>Tipo de cuenta</label>
              <div style={{ display:"flex", gap:12, marginTop:6, flexWrap:"wrap" }}>
                {OPCIONES_CUENTA[rol].map(opt => (
                  <label key={opt.val} style={{ flex:1, minWidth:130, display:"flex", alignItems:"center", gap:10, border:`2px solid ${formData.tipoCuenta === opt.val ? opt.color : "var(--gray-200)"}`, borderRadius:10, padding:"12px 14px", cursor:"pointer", background:formData.tipoCuenta === opt.val ? `${opt.color}10` : "transparent", transition:"all 0.15s" }}>
                    <input type="radio" name="tipoCuenta" value={opt.val} checked={formData.tipoCuenta === opt.val} onChange={handleChange} style={{ display:"none" }} />
                    <div style={{ width:34, height:34, borderRadius:"50%", flexShrink:0, background:formData.tipoCuenta === opt.val ? `${opt.color}20` : "var(--gray-100)", display:"flex", alignItems:"center", justifyContent:"center", color:formData.tipoCuenta === opt.val ? opt.color : "var(--gray-400)" }}>
                      {opt.icon}
                    </div>
                    <div>
                      <p style={{ margin:0, fontWeight:600, fontSize:"0.88rem", color:"var(--gray-800)" }}>{opt.label}</p>
                      <p style={{ margin:0, fontSize:"0.75rem", color:"var(--gray-400)", marginTop:2 }}>{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            {!modoEdicion && formData.tipoCuenta !== "none" && (
              <div className="form-group full">
                <label>Credenciales iniciales</label>
                <div style={{ background:"var(--gray-50)", border:"1px solid var(--gray-200)", borderRadius:8, padding:"12px 14px", fontSize:"0.85rem", display:"flex", flexDirection:"column", gap:6 }}>
                  <div><strong>Usuario:</strong> {formData.email || <em style={{ color:"var(--gray-400)" }}>completa el correo en Datos personales</em>}</div>
                  <div><strong>Contraseña inicial:</strong> {formData.numeroEmpleado ? getPassInicial(formData.numeroEmpleado) : <em style={{ color:"var(--gray-400)" }}>completa el n° de empleado en Laboral</em>}</div>
                  {(formData.tipoCuenta === "admin" || formData.tipoCuenta === "superadmin") && (
                    <div style={{ marginTop:4, fontSize:"0.78rem", color:"#8b5cf6", display:"flex", alignItems:"center", gap:4 }}><ShieldCheck size={12}/> Se pedirá cambio de contraseña en el primer inicio de sesión.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {modalError && <p className="form-error">{modalError}</p>}
      </AppModal>

      {/* ══ Modal confirmación de cuenta ══ */}
      <AppModal open={showCuentaModal} titulo="Confirmar registro de personal"
        onClose={() => { setShowCuentaModal(false); setSaving(false); }} saving={saving}
        saveText="✓ Confirmar y guardar"
        onSave={() => pendingForm && ejecutarGuardar(pendingForm, true)}>
        {pendingForm && (
          <>
            <p style={{ fontSize:"0.9rem", color:"var(--gray-600)", margin:0 }}>Revisa los datos antes de guardar:</p>
            <div style={{ background:"var(--gray-50)", border:"1px solid var(--gray-200)", borderRadius:8, padding:"12px 14px", fontSize:"0.85rem", display:"flex", flexDirection:"column", gap:5 }}>
              <div style={{ fontWeight:700, fontSize:"0.95rem", marginBottom:4 }}>👤 {pendingForm.nombre} {pendingForm.apellidoPaterno} {pendingForm.apellidoMaterno}</div>
              <div><strong>N° Empleado:</strong> {pendingForm.numeroEmpleado}</div>
              <div><strong>Correo:</strong> {pendingForm.email}</div>
              <div><strong>Departamento:</strong> {pendingForm.departamento}</div>
              <div><strong>Cargo:</strong> {pendingForm.cargo}</div>
              {pendingForm.planta && <div><strong>Planta:</strong> {pendingForm.planta}</div>}
              {pendingForm.cubiculo && <div><strong>Cubículo:</strong> {pendingForm.cubiculo}</div>}
            </div>
            {pendingForm.tipoCuenta !== "none" ? (() => {
              const opt = OPCIONES_CUENTA[rol].find(o => o.val === pendingForm.tipoCuenta);
              return (
                <div style={{ background:`${opt?.color}10`, border:`1px solid ${opt?.color}30`, borderRadius:8, padding:"12px 14px", fontSize:"0.85rem", display:"flex", flexDirection:"column", gap:5 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                    <span style={{ color:opt?.color }}>{opt?.icon}</span>
                    <strong style={{ color:opt?.color }}>Cuenta: {opt?.label}</strong>
                  </div>
                  <div><strong>Usuario:</strong> {pendingForm.email}</div>
                  <div><strong>Contraseña inicial:</strong> {getPassInicial(pendingForm.numeroEmpleado)}</div>
                  {(pendingForm.tipoCuenta === "admin" || pendingForm.tipoCuenta === "superadmin") && (
                    <div style={{ marginTop:4, fontSize:"0.78rem", color:opt?.color, display:"flex", alignItems:"center", gap:4 }}><ShieldCheck size={12}/> Se pedirá cambio de contraseña en el primer inicio.</div>
                  )}
                </div>
              );
            })() : (
              <div style={{ background:"var(--gray-50)", border:"1px solid var(--border)", borderRadius:8, padding:"10px 14px", fontSize:"0.85rem", color:"var(--gray-500)" }}>
                ℹ Este personal se guardará sin cuenta de acceso al sistema.
              </div>
            )}
            {modalError && <p className="form-error">{modalError}</p>}
          </>
        )}
      </AppModal>

      <ConfirmModal open={confirm.open} mensaje={confirm.mensaje} onConfirm={confirm.ejecutar} onCancel={confirm.cancelar} />
    </div>
  );
};

export default GestionPersonal;