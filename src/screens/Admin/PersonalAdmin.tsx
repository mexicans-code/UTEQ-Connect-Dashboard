import React, { useState, useEffect, useMemo } from "react";
import "../../styles/GestionPersonal.css";
import NavAdmin from "../components/NavAdmin";
import {
  Plus, Pencil, Trash2, X, Search,
  Mail, Phone, Building2, MapPin, User,
  LayoutGrid, List, Ban, CheckCircle,
  Briefcase, GraduationCap, Wrench, Star,
  ShieldCheck, UserCheck,
} from "lucide-react";
import api from "../../api/axios";
import ConfirmModal from "../../components/ConfirmModal";
import Paginacion from "../../components/Paginacion";
import ImageUploader from "../../components/ImageUploader";

/* ─── Tipos alineados al modelo del backend ─── */
interface Personal {
  _id: string;
  numeroEmpleado: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  email: string;
  telefono: string;
  departamento: string;
  cargo: string;
  cubiculo?: string;
  planta?: string;
  fechaIngreso: string;
  estatus: "activo" | "inactivo";
  rol: "admin" | "superadmin";
  imagenPerfil?: string | null;
}

interface FormData {
  numeroEmpleado: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  email: string;
  password: string;
  telefono: string;
  departamento: string;
  cargo: string;
  cubiculo: string;
  planta: string;
  fechaIngreso: string;
  estatus: "activo" | "inactivo";
  rol: "admin" | "superadmin";
  tipoCuenta: "user" | "admin" | "none";
}

const EMPTY_FORM: FormData = {
  numeroEmpleado: "", nombre: "", apellidoPaterno: "", apellidoMaterno: "",
  email: "", password: "", telefono: "", departamento: "", cargo: "",
  cubiculo: "", planta: "", fechaIngreso: "", estatus: "activo", rol: "admin", tipoCuenta: "none",
};

// Departamentos se cargan dinámicamente desde /locations

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

const getIniciales = (nombre: string, ap: string) =>
  `${nombre.charAt(0)}${ap.charAt(0)}`.toUpperCase();

const CARGOS = [
  "Profesor / Docente", "Coordinador de Carrera", "Jefe de Departamento",
  "Director de División", "Rector", "Secretaria", "Administrativo",
  "Recursos Humanos", "Servicios Escolares", "Biblioteca", "Enfermería",
  "Mantenimiento", "Intendente / Limpieza", "Cafetería",
  "Seguridad / Vigilancia", "Otro",
];

const TABS = ["Datos personales", "Laboral", "Acceso al sistema"];

/* ═══════════════════════════════════════════════════════════ */

const PersonalAdmin: React.FC = () => {
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [locations, setLocations] = useState<string[]>([]);

  const fetchLocations = async () => {
    try {
      const res = await api.get("/locations");
      const raw = res.data;
      const lista = Array.isArray(raw) ? raw : (raw.data ?? []);
      setLocations(lista.map((l: any) => l.nombre));
    } catch {
      // Si falla, queda vacío; no bloquea la pantalla
    }
  };

  const [busqueda, setBusqueda]           = useState("");
  const [filtroDpto, setFiltroDpto]       = useState("");
  const [filtroEstatus, setFiltroEstatus] = useState("");
  const [vista, setVista]                 = useState<"grid" | "lista">("grid");

  const [showModal, setShowModal]     = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [actual, setActual]           = useState<Personal | null>(null);
  const [saving, setSaving]           = useState(false);
  const [confirmOpen, setConfirmOpen]   = useState(false);
  const [confirmMsg, setConfirmMsg]     = useState("");
  const [confirmFn, setConfirmFn]       = useState<() => void>(() => () => {});
  const confirmar = (msg: string, fn: () => void) => { setConfirmMsg(msg); setConfirmFn(() => fn); setConfirmOpen(true); };
  const [uploadingImg, setUploadingImg] = useState(false);
  const [imagenPendiente, setImagenPendiente] = useState<File | null>(null);
  const [modalError, setModalError]   = useState("");
  const [formData, setFormData]       = useState<FormData>(EMPTY_FORM);
  const [tabActivo, setTabActivo]     = useState(0);
  const [showCuentaModal, setShowCuentaModal] = useState(false);
  const [pendingForm, setPendingForm]         = useState<FormData | null>(null);
  const [pagina, setPagina]           = useState(1);
  const POR_PAGINA = 12;

  const fetchPersonal = async () => {
    setLoading(true); setError("");
    try {
      const res = await api.get("/personal");
      const raw = res.data;
      const lista: Personal[] = Array.isArray(raw) ? raw : (raw.data ?? []);
      setPersonal(lista);
    } catch {
      setError("Error al cargar personal. Verifica tu sesión.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPersonal(); fetchLocations(); }, []);

  const personalFiltrado = useMemo(() => {
    setPagina(1);
    const full_list = personal.filter(p => {
      const full = `${p.nombre ?? ""} ${p.apellidoPaterno ?? ""} ${p.apellidoMaterno ?? ""}`.toLowerCase();
      const matchQ = !busqueda || [full, p.email ?? "", p.numeroEmpleado ?? "", p.cargo ?? "", p.departamento ?? ""]
        .some(s => s.toLowerCase().includes(busqueda.toLowerCase()));
      return matchQ
        && (!filtroDpto    || p.departamento === filtroDpto)
        && (!filtroEstatus || p.estatus === filtroEstatus);
    });
    return full_list;
  }, [personal, busqueda, filtroDpto, filtroEstatus]);

  const personalPagina = useMemo(() => personalFiltrado.slice((pagina-1)*POR_PAGINA, pagina*POR_PAGINA), [personalFiltrado, pagina]);

  const abrirAgregar = () => {
    setModoEdicion(false); setActual(null);
    setFormData(EMPTY_FORM); setModalError(""); setTabActivo(0); setShowModal(true);
  };

  const abrirEditar = (p: Personal) => {
    setModoEdicion(true); setActual(p);
    setFormData({
      numeroEmpleado: p.numeroEmpleado, nombre: p.nombre,
      apellidoPaterno: p.apellidoPaterno, apellidoMaterno: p.apellidoMaterno,
      email: p.email, password: "", telefono: p.telefono,
      departamento: p.departamento, cargo: p.cargo,
      cubiculo: p.cubiculo || "", planta: p.planta || "",
      fechaIngreso: p.fechaIngreso ? p.fechaIngreso.split("T")[0] : "",
      estatus: p.estatus, rol: p.rol,
      tipoCuenta: (p.rol === "admin" || p.rol === "superadmin") ? "admin" : "user",
    });
    setModalError(""); setTabActivo(0); setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setModalError("");
    setFormData(EMPTY_FORM);
    setTabActivo(0);
    setModoEdicion(false);
    setActual(null);
    setImagenPendiente(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const validarCampos = (): boolean => {
    const req: (keyof FormData)[] = ["numeroEmpleado","nombre","apellidoPaterno","apellidoMaterno","email","telefono","departamento","cargo","fechaIngreso"];
    for (const f of req) {
      if (!formData[f]) { setModalError(`El campo "${f}" es obligatorio.`); return false; }
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) { setModalError("El correo electrónico no tiene un formato válido."); return false; }
    const telRegex = /^[0-9]{10}$/;
    if (!telRegex.test(formData.telefono.replace(/\s/g,""))) { setModalError("El teléfono debe tener exactamente 10 dígitos."); return false; }
    return true;
  };

  const guardar = async () => {
    if (!validarCampos()) return;
    if (!modoEdicion) {
      // Al crear: mostrar modal de confirmación (incluso para "ninguno")
      setPendingForm({ ...formData });
      setShowCuentaModal(true);
      return;
    }
    // Al editar: guardar directo
    await ejecutarGuardar({ ...formData }, false);
  };

  const ejecutarGuardar = async (data: FormData, crearCuenta: boolean) => {
    setSaving(true); setModalError("");
    try {
      if (modoEdicion && actual) {
        // Construir body con solo los campos del modelo (excluir password y tipoCuenta)
        const body: Record<string, any> = {
          numeroEmpleado: data.numeroEmpleado,
          nombre: data.nombre,
          apellidoPaterno: data.apellidoPaterno,
          apellidoMaterno: data.apellidoMaterno,
          email: data.email,
          telefono: data.telefono,
          departamento: data.departamento,
          cargo: data.cargo,
          cubiculo: data.cubiculo,
          planta: data.planta,
          fechaIngreso: data.fechaIngreso,
          estatus: data.estatus,
          rol: data.rol,
        };
        await api.put(`/personal/${actual._id}`, body);
      } else {
        let userId: string | null = null;
        if (crearCuenta && data.tipoCuenta !== "none") {
          try {
            const passwordInicial = data.numeroEmpleado.length >= 6
              ? data.numeroEmpleado
              : `${data.numeroEmpleado}@ITQ`;
            const resUser = await api.post("/auth/register-admin", {
              nombre: `${data.nombre} ${data.apellidoPaterno}`,
              email: data.email,
              password: passwordInicial,
              rol: data.tipoCuenta,
              requiereCambioPassword: data.tipoCuenta === "admin",
            });
            userId = resUser.data?.data?.user?._id || resUser.data?.data?._id || resUser.data?._id || null;
          } catch (authErr: any) {
            console.warn("Error al crear cuenta:", authErr?.response?.data);
            setModalError("Personal guardado, pero no se pudo crear la cuenta de acceso.");
          }
        }
        // Enviar solo los campos que acepta el modelo de personal (excluir password y tipoCuenta)
        const resPersonal = await api.post("/personal", {
          numeroEmpleado: data.numeroEmpleado,
          nombre: data.nombre,
          apellidoPaterno: data.apellidoPaterno,
          apellidoMaterno: data.apellidoMaterno,
          email: data.email,
          telefono: data.telefono,
          departamento: data.departamento,
          cargo: data.cargo,
          cubiculo: data.cubiculo,
          planta: data.planta,
          fechaIngreso: data.fechaIngreso,
          estatus: data.estatus,
          rol: data.rol,
          ...(userId ? { userId } : {}),
        });
        const nuevoId = resPersonal.data?.data?._id || resPersonal.data?._id;
        if (nuevoId && imagenPendiente) {
          try {
            const fd = new FormData();
            fd.append("image", imagenPendiente);
            await api.put(`/personal/${nuevoId}/profile-image`, fd, { headers: { "Content-Type": "multipart/form-data" } });
          } catch { /* imagen no crítica */ }
          setImagenPendiente(null);
        }
      }
      setShowCuentaModal(false);
      cerrarModal(); fetchPersonal();
    } catch (err: any) {
      setModalError(err.response?.data?.message || err.response?.data?.error || "Error al guardar.");
    } finally { setSaving(false); }
  };

  const eliminar = async (id: string) => {
    confirmar("¿Eliminar este registro permanentemente? Esta acción no se puede deshacer.", async () => {
      try { await api.delete(`/personal/${id}`); fetchPersonal(); }
      catch { setModalError("Error al eliminar."); }
    });
  };

  const toggleEstatus = async (p: Personal) => {
    try {
      await api.put(`/personal/${p._id}`, { estatus: p.estatus === "activo" ? "inactivo" : "activo" });
      fetchPersonal();
    } catch { /* silencioso */ }
  };

  /* ── Imagen personal ── */
  const subirImagenPersonal = async (id: string, file: File) => {
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      await api.put(`/personal/${id}/profile-image`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      fetchPersonal();
    } catch { setModalError("Error al subir la imagen."); }
    finally { setUploadingImg(false); }
  };

  const eliminarImagenPersonal = async (id: string) => {
    setUploadingImg(true);
    try {
      await api.delete(`/personal/${id}/profile-image`);
      fetchPersonal();
    } catch { setModalError("Error al eliminar la imagen."); }
    finally { setUploadingImg(false); }
  };

  /* ─── RENDER ─── */
  return (
    <div className="personal-container">
      <NavAdmin />

      <div className="personal-main">
        <header className="personal-header">
          <h1>Gestión de Personal</h1>
          <p>{loading ? "Cargando…" : `${personal.length} registro(s) · ${personalFiltrado.length} mostrado(s)`}</p>
        </header>

        <div className="personal-content">
          {/* ── Toolbar ── */}
          <div className="personal-toolbar">
            <div className="personal-search-wrapper">
              <Search size={15} />
              <input
                className="personal-search"
                placeholder="Buscar por nombre, correo, n° empleado o cargo…"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
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
              <button className={vista === "grid" ? "active" : ""} onClick={() => setVista("grid")} title="Tarjetas">
                <LayoutGrid size={15} />
              </button>
              <button className={vista === "lista" ? "active" : ""} onClick={() => setVista("lista")} title="Lista">
                <List size={15} />
              </button>
            </div>
            <button className="btn-agregar-personal" onClick={abrirAgregar}>
              <Plus size={16} /> Agregar Personal
            </button>
          </div>

          {error && <p className="form-error">{error}</p>}
          {loading && <p style={{ color: "var(--gray-400)", padding: "24px" }}>Cargando personal…</p>}

          {/* ── Vista Grid ── */}
          {!loading && vista === "grid" && (
            personalFiltrado.length === 0
              ? <div className="personal-empty"><User size={40} /><p>No se encontró personal con esos filtros.</p></div>
              : <div className="personal-grid">
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
                          {(p.planta || p.cubiculo) && (
                            <div className="personal-card-detail">
                              <MapPin size={13}/>
                              <span>{[p.planta, p.cubiculo ? `Cub. ${p.cubiculo}` : ""].filter(Boolean).join(" · ")}</span>
                            </div>
                          )}
                        </div>
                        <div className="personal-card-footer">
                          <div className="personal-card-badges">
                            <span className={`badge-tipo ${tipo.cls}`}>{tipo.icon} {tipo.label}</span>
                            <span className={p.estatus === "activo" ? "estatus-activo" : "estatus-inactivo"}>{p.estatus}</span>
                          </div>
                          <div className="personal-card-actions">
                            <button className="btn-icon" onClick={() => abrirEditar(p)} title="Editar"><Pencil size={14}/></button>
                            <button className={`btn-icon ${p.estatus === "activo" ? "toggle" : "success"}`} onClick={() => toggleEstatus(p)} title={p.estatus === "activo" ? "Desactivar" : "Activar"}>
                              {p.estatus === "activo" ? <Ban size={14}/> : <CheckCircle size={14}/>}
                            </button>
                            <button className="btn-icon delete" onClick={() => eliminar(p._id)} title="Eliminar"><Trash2 size={14}/></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
          )}

          {/* ── Vista Lista ── */}
          {!loading && vista === "lista" && (
            <div className="personal-table-wrapper">
              <table className="personal-table">
                <thead>
                  <tr>
                    <th>Nombre</th><th>Departamento</th><th>Cargo / Tipo</th>
                    <th>Teléfono</th><th>Ubicación</th><th>Estatus</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {personalFiltrado.length === 0
                    ? <tr><td colSpan={7} style={{ textAlign:"center", padding:"40px", color:"var(--gray-400)" }}>No se encontró personal.</td></tr>
                    : personalPagina.map(p => {
                        const tipo = getTipoBadge(p.cargo);
                        const nc = `${p.nombre} ${p.apellidoPaterno} ${p.apellidoMaterno}`;
                        return (
                          <tr key={p._id}>
                            <td>
                              <div className="table-nombre-cell">
                                {p.imagenPerfil
                                  ? <img src={p.imagenPerfil} alt={nc} className="table-avatar"/>
                                  : <div className="table-avatar-placeholder">{getIniciales(p.nombre, p.apellidoPaterno)}</div>}
                                <div className="table-nombre-info">
                                  <strong>{nc}</strong>
                                  <span>#{p.numeroEmpleado}</span>
                                </div>
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
                            <td style={{ fontSize:"0.82rem", color:"var(--gray-500)" }}>
                              {[p.planta, p.cubiculo ? `Cub. ${p.cubiculo}` : ""].filter(Boolean).join(" · ") || "—"}
                            </td>
                            <td>
                              <span className={p.estatus === "activo" ? "estatus-activo" : "estatus-inactivo"}>{p.estatus}</span>
                            </td>
                            <td>
                              <div className="acciones">
                                <button className="btn-icon" onClick={() => abrirEditar(p)} title="Editar"><Pencil size={14}/></button>
                                <button className={`btn-icon ${p.estatus === "activo" ? "toggle" : "success"}`} onClick={() => toggleEstatus(p)}>
                                  {p.estatus === "activo" ? <Ban size={14}/> : <CheckCircle size={14}/>}
                                </button>
                                <button className="btn-icon delete" onClick={() => eliminar(p._id)} title="Eliminar"><Trash2 size={14}/></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  }
                </tbody>
              </table>
            </div>
          )}
        <Paginacion total={personalFiltrado.length} porPagina={POR_PAGINA} paginaActual={pagina} onChange={setPagina} />
        </div>
      </div>

      {/* ══════════ MODAL ══════════ */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-personal">
            <div className="modal-header">
              <h2>{modoEdicion ? "Editar Personal" : "Agregar Personal"}</h2>
              <button onClick={cerrarModal}><X size={18}/></button>
            </div>

            <div className="modal-tabs">
              {TABS.map((t, i) => (
                <button key={t} className={`modal-tab ${tabActivo === i ? "active" : ""}`} onClick={() => setTabActivo(i)}>{t}</button>
              ))}
            </div>

            <div className="modal-body">
              {tabActivo === 0 && (
                <div className="form-grid">
                  <div className="form-group full" style={{ display: "flex", justifyContent: "center", paddingBottom: 8 }}>
                    {modoEdicion && actual ? (
                      <ImageUploader
                        currentImage={actual.imagenPerfil}
                        placeholder={
                          <span style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--blue-700)" }}>
                            {actual.nombre.charAt(0)}{actual.apellidoPaterno.charAt(0)}
                          </span>
                        }
                        onUpload={file => subirImagenPersonal(actual._id, file)}
                        onDelete={() => eliminarImagenPersonal(actual._id)}
                        uploading={uploadingImg}
                        shape="circle"
                        size={88}
                      />
                    ) : (
                      <ImageUploader
                        currentImage={imagenPendiente ? URL.createObjectURL(imagenPendiente) : null}
                        placeholder={<span style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--blue-700)" }}>📷</span>}
                        onUpload={async (file) => setImagenPendiente(file)}
                        onDelete={async () => setImagenPendiente(null)}
                        uploading={false}
                        shape="circle"
                        size={88}
                      />
                    )}
                  </div>
                  <div className="form-group">
                    <label>Nombre(s) *</label>
                    <input name="nombre" placeholder="Nombre(s)" value={formData.nombre} onChange={handleChange} autoComplete="off"/>
                  </div>
                  <div className="form-group">
                    <label>Apellido paterno *</label>
                    <input name="apellidoPaterno" placeholder="Apellido paterno" value={formData.apellidoPaterno} onChange={handleChange}/>
                  </div>
                  <div className="form-group">
                    <label>Apellido materno *</label>
                    <input name="apellidoMaterno" placeholder="Apellido materno" value={formData.apellidoMaterno} onChange={handleChange}/>
                  </div>
                  <div className="form-group">
                    <label>Teléfono *</label>
                    <input name="telefono" placeholder="Ej: 4421234567" value={formData.telefono} onChange={handleChange}/>
                  </div>
                  <div className="form-group full">
                    <label>Correo electrónico * (único)</label>
                    <input type="email" name="email" placeholder="correo@uteq.edu.mx" value={formData.email} onChange={handleChange} autoComplete="off"/>
                  </div>
                </div>
              )}

              {tabActivo === 1 && (
                <div className="form-grid">
                  <div className="form-group">
                    <label>Número de empleado * (único)</label>
                    <input name="numeroEmpleado" placeholder="Ej: EMP-001" value={formData.numeroEmpleado} onChange={handleChange}/>
                  </div>
                  <div className="form-group">
                    <label>Fecha de ingreso *</label>
                    <input type="date" name="fechaIngreso" value={formData.fechaIngreso} onChange={handleChange}/>
                  </div>
                  <div className="form-group full">
                    <label>Departamento *</label>
                    <select name="departamento" value={formData.departamento} onChange={handleChange}>
                      <option value="">-- Selecciona departamento --</option>
                      {locations.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="form-group full">
                    <label>Cargo *</label>
                    <select name="cargo" value={formData.cargo} onChange={handleChange}>
                      <option value="">-- Selecciona un cargo --</option>
                      {CARGOS.map((c, i) => <option key={`cargo-${i}`} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Planta / Piso</label>
                    <select name="planta" value={formData.planta} onChange={handleChange}>
                      <option value="">-- Selecciona --</option>
                      <option value="Planta baja">Planta baja</option>
                      <option value="Planta alta">Planta alta</option>
                      <option value="Planta única">Planta única</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Cubículo / Oficina</label>
                    <input name="cubiculo" placeholder="Ej: K-14" value={formData.cubiculo} onChange={handleChange}/>
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

              {tabActivo === 2 && (
                <div className="form-grid">
                  {modoEdicion ? (
                    <>
                      <div className="form-group">
                        <label>Rol del sistema</label>
                        <select name="rol" value={formData.rol} onChange={handleChange}>
                          <option value="admin">Administrador</option>
                          <option value="superadmin">Super Administrador</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Contraseña (vacío = sin cambio)</label>
                        <input type="password" name="password" placeholder="Dejar vacío para no cambiar" value={formData.password} onChange={handleChange} autoComplete="new-password"/>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="form-group full">
                        <div className="form-info-box">
                          <strong>🔐 Cuenta de acceso al dashboard</strong><br/>
                          Elige el tipo de acceso. Si seleccionas "Ninguno", se guardará el registro sin cuenta de acceso al sistema.
                        </div>
                      </div>
                      <div className="form-group full">
                        <label>Tipo de cuenta</label>
                        <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                          {[
                            { val: "none",  icon: <X size={18}/>,          label: "Ninguno",       desc: "Sin cuenta de acceso.",           color: "#6b7280", border: formData.tipoCuenta === "none"  ? "#6b7280" : "var(--gray-200)", bg: formData.tipoCuenta === "none"  ? "rgba(107,114,128,0.06)" : "transparent" },
                            { val: "user",  icon: <UserCheck size={18}/>,   label: "Usuario normal", desc: "Puede ver eventos y rutas.",       color: "#3b82f6", border: formData.tipoCuenta === "user"  ? "#3b82f6" : "var(--gray-200)", bg: formData.tipoCuenta === "user"  ? "rgba(59,130,246,0.06)"  : "transparent" },
                            { val: "admin", icon: <ShieldCheck size={18}/>, label: "Administrador",  desc: "Gestiona eventos y ubicaciones.", color: "#8b5cf6", border: formData.tipoCuenta === "admin" ? "#8b5cf6" : "var(--gray-200)", bg: formData.tipoCuenta === "admin" ? "rgba(139,92,246,0.06)" : "transparent" },
                          ].map(opt => (
                            <label key={opt.val} style={{ flex: 1, minWidth: 130, display: "flex", alignItems: "center", gap: 10, border: `2px solid ${opt.border}`, borderRadius: 10, padding: "12px 14px", cursor: "pointer", background: opt.bg, transition: "all 0.15s" }}>
                              <input type="radio" name="tipoCuenta" value={opt.val} checked={formData.tipoCuenta === opt.val} onChange={handleChange} style={{ display: "none" }} />
                              <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: formData.tipoCuenta === opt.val ? `${opt.color}20` : "var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "center", color: formData.tipoCuenta === opt.val ? opt.color : "var(--gray-400)" }}>
                                {opt.icon}
                              </div>
                              <div>
                                <p style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem", color: "var(--gray-800)" }}>{opt.label}</p>
                                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--gray-400)", marginTop: 2 }}>{opt.desc}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                      {formData.tipoCuenta !== "none" && (
                        <div className="form-group full">
                          <label>Credenciales iniciales</label>
                          <div style={{ background: "var(--gray-50)", border: "1px solid var(--gray-200)", borderRadius: 8, padding: "12px 14px", fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: 6 }}>
                            <div><strong>Usuario:</strong> {formData.email || <em style={{ color: "var(--gray-400)" }}>completa el correo en Datos personales</em>}</div>
                            <div><strong>Contraseña inicial:</strong> {formData.numeroEmpleado ? (formData.numeroEmpleado.length >= 6 ? formData.numeroEmpleado : `${formData.numeroEmpleado}@ITQ`) : <em style={{ color: "var(--gray-400)" }}>completa el n° de empleado en Laboral</em>}</div>
                            {formData.tipoCuenta === "admin" && (
                              <div style={{ marginTop: 4, fontSize: "0.78rem", color: "#8b5cf6", display: "flex", alignItems: "center", gap: 4 }}>
                                <ShieldCheck size={12}/> Se pedirá cambio de contraseña en el primer inicio de sesión.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {modalError && <p className="form-error">{modalError}</p>}
            </div>

            <div className="modal-footer">
              {tabActivo > 0 && (
                <button className="btn-cancelar" onClick={() => setTabActivo(t => t - 1)} style={{ marginRight:"auto" }}>
                  ← Anterior
                </button>
              )}
              <button className="btn-cancelar" onClick={cerrarModal}>Cancelar</button>
              {tabActivo < TABS.length - 1
                ? <button className="btn-guardar" onClick={() => setTabActivo(t => t + 1)}>Siguiente →</button>
                : <button className="btn-guardar" onClick={guardar} disabled={saving}>{saving ? "Guardando…" : modoEdicion ? "Actualizar" : "Guardar"}</button>
              }
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

      {/* ══ Modal confirmación de cuenta ══ */}
      {showCuentaModal && pendingForm && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-personal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3>Confirmar registro de personal</h3>
              <button onClick={() => { setShowCuentaModal(false); setSaving(false); }}><X size={18}/></button>
            </div>
            <div className="modal-body" style={{ gap: 14 }}>
              <p style={{ fontSize: "0.9rem", color: "var(--gray-600)", margin: 0 }}>Revisa los datos antes de guardar:</p>
              <div style={{ background: "var(--gray-50)", border: "1px solid var(--gray-200)", borderRadius: 8, padding: "12px 14px", fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 4 }}>👤 {pendingForm.nombre} {pendingForm.apellidoPaterno} {pendingForm.apellidoMaterno}</div>
                <div><strong>N° Empleado:</strong> {pendingForm.numeroEmpleado}</div>
                <div><strong>Correo:</strong> {pendingForm.email}</div>
                <div><strong>Departamento:</strong> {pendingForm.departamento}</div>
                <div><strong>Cargo:</strong> {pendingForm.cargo}</div>
                {pendingForm.planta && <div><strong>Planta:</strong> {pendingForm.planta}</div>}
                {pendingForm.cubiculo && <div><strong>Cubículo:</strong> {pendingForm.cubiculo}</div>}
              </div>
              {pendingForm.tipoCuenta !== "none" ? (
                <div style={{ background: pendingForm.tipoCuenta === "admin" ? "rgba(139,92,246,0.06)" : "rgba(59,130,246,0.06)", border: `1px solid ${pendingForm.tipoCuenta === "admin" ? "rgba(139,92,246,0.2)" : "rgba(59,130,246,0.2)"}`, borderRadius: 8, padding: "12px 14px", fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    {pendingForm.tipoCuenta === "admin"
                      ? <><ShieldCheck size={15} color="#8b5cf6"/><strong style={{ color: "#8b5cf6" }}>Cuenta: Administrador</strong></>
                      : <><UserCheck size={15} color="#3b82f6"/><strong style={{ color: "#3b82f6" }}>Cuenta: Usuario normal</strong></>}
                  </div>
                  <div><strong>Usuario:</strong> {pendingForm.email}</div>
                  <div><strong>Contraseña inicial:</strong> {pendingForm.numeroEmpleado.length >= 6 ? pendingForm.numeroEmpleado : `${pendingForm.numeroEmpleado}@ITQ`}</div>
                  {pendingForm.tipoCuenta === "admin" && (
                    <div style={{ marginTop: 4, fontSize: "0.78rem", color: "#8b5cf6", display: "flex", alignItems: "center", gap: 4 }}>
                      <ShieldCheck size={12}/> Se pedirá cambio de contraseña en el primer inicio.
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ background: "var(--gray-50)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", fontSize: "0.85rem", color: "var(--gray-500)" }}>
                  ℹ️ Este personal se guardará sin cuenta de acceso al sistema.
                </div>
              )}
              {modalError && <p className="form-error">{modalError}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn-cancelar" onClick={() => { setShowCuentaModal(false); setSaving(false); }}>Cancelar</button>
              <button className="btn-guardar" onClick={() => ejecutarGuardar(pendingForm, true)} disabled={saving}>
                {saving ? "Guardando…" : "✓ Confirmar y guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalAdmin;