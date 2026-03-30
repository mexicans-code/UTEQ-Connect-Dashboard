import React, { useState, useEffect, useMemo } from "react";
import "../../styles/GestionPersonal.css";
import NavSpAdmin from "../components/NavSpAdmin";
import {
  Plus, Pencil, Trash2, X, Search,
  Mail, Phone, Building2, MapPin, User,
  LayoutGrid, List, Ban, CheckCircle,
  Briefcase, GraduationCap, Wrench, Star,
  ShieldCheck, UserCheck, FileDown,
} from "lucide-react";
import api from "../../api/axios";
import ConfirmModal from "../../components/ConfirmModal";
import Paginacion from "../../components/Paginacion";
import ImageUploader from "../../components/ImageUploader";
import { getUserById, updateUser, deleteUser } from "../../api/users";
import { exportPersonalPDF } from "../../utils/pdfExport";

/* ─── Tipos ─── */
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
  rol: "user" | "admin" | "superadmin";
  userId?: string;
  imagenPerfil?: string | null;
  imagenHorario?: string | null;
}

interface FormData {
  numeroEmpleado: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  email: string;
  telefono: string;
  departamento: string;
  cargo: string;
  cubiculo: string;
  planta: string;
  fechaIngreso: string;
  estatus: "activo" | "inactivo";
  rol: "admin" | "superadmin";
  // acceso
  tipoCuenta: "user" | "admin" | "superadmin" | "none";
}

const EMPTY_FORM: FormData = {
  numeroEmpleado: "", nombre: "", apellidoPaterno: "", apellidoMaterno: "",
  email: "", telefono: "", departamento: "", cargo: "",
  cubiculo: "", planta: "", fechaIngreso: "", estatus: "activo", rol: "admin",
  tipoCuenta: "none",
};

// Departamentos se cargan dinámicamente desde /locations

const CARGOS = [
  "Profesor / Docente", "Coordinador de Carrera", "Jefe de Departamento",
  "Director de División", "Rector", "Secretaria", "Administrativo",
  "Recursos Humanos", "Servicios Escolares", "Biblioteca", "Enfermería",
  "Mantenimiento", "Intendente / Limpieza", "Cafetería",
  "Seguridad / Vigilancia", "Otro",
];

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

const TABS = ["Datos personales", "Laboral", "Acceso al sistema"];

/* ══════════════════════════════════════════════════════════════ */

const PersonalSpAdmin: React.FC = () => {
  const [personal, setPersonal]           = useState<Personal[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [locations, setLocations]         = useState<string[]>([]);

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
  const [pagina, setPagina]             = useState(1);
  const POR_PAGINA = 12;

  const [showModal, setShowModal]             = useState(false);
  const [modoEdicion, setModoEdicion]         = useState(false);
  const [actual, setActual]                   = useState<Personal | null>(null);
  const [saving, setSaving]                   = useState(false);
  const [confirmOpen, setConfirmOpen]   = useState(false);
  const [confirmMsg, setConfirmMsg]     = useState("");
  const [confirmFn, setConfirmFn]       = useState<() => void>(() => () => {});
  const confirmar = (msg: string, fn: () => void) => { setConfirmMsg(msg); setConfirmFn(() => fn); setConfirmOpen(true); };
  const [uploadingImg, setUploadingImg]         = useState(false);
  const [imagenPendiente, setImagenPendiente]   = useState<File | null>(null);
  const [imagenHorarioPendiente, setImagenHorarioPendiente] = useState<File | null>(null);
  const [modalError, setModalError]           = useState("");
  const [formData, setFormData]               = useState<FormData>(EMPTY_FORM);
  const [tabActivo, setTabActivo]             = useState(0);
  const [showCuentaModal, setShowCuentaModal] = useState(false);
  const [pendingForm, setPendingForm]         = useState<FormData | null>(null);
  const [userActual, setUserActual]           = useState<any | null>(null);

  const fetchPersonal = async () => {
    setLoading(true); setError("");
    try {
      const res = await api.get("/personal");
      const raw = res.data;
      setPersonal(Array.isArray(raw) ? raw : (raw.data ?? []));
    } catch {
      setError("Error al cargar personal. Verifica tu sesión.");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchPersonal(); fetchLocations(); }, []);

  const personalFiltrado = useMemo(() => {
    setPagina(1);
    return personal.filter(p => {
    const full = `${p.nombre ?? ""} ${p.apellidoPaterno ?? ""} ${p.apellidoMaterno ?? ""}`.toLowerCase();
    const matchQ = !busqueda || [full, p.email ?? "", p.numeroEmpleado ?? "", p.cargo ?? "", p.departamento ?? ""]
      .some(s => s.toLowerCase().includes(busqueda.toLowerCase()));
    return matchQ
      && (!filtroDpto    || p.departamento === filtroDpto)
      && (!filtroEstatus || p.estatus === filtroEstatus);
    });
  }, [personal, busqueda, filtroDpto, filtroEstatus]);

  const personalPagina = useMemo(() => personalFiltrado.slice((pagina-1)*POR_PAGINA, pagina*POR_PAGINA), [personalFiltrado, pagina]);

  const abrirAgregar = () => {
    setModoEdicion(false); setActual(null);
    setFormData(EMPTY_FORM); setModalError(""); setTabActivo(0); setShowModal(true);
  };

  const abrirEditar = async (p: Personal) => {
    setModoEdicion(true);
    setActual(p);
    setUserActual(null);
    let tipoCuenta: "user" | "admin" | "superadmin" | "none" = "none";
    if (p.userId) {
      try {
        const res = await getUserById(p.userId);
        if (res.success) {
          const user = res.data;
          setUserActual(user);
          tipoCuenta = user.rol;
        }
      } catch (err) {
        console.warn("Error fetching user:", err);
      }
    }
    setFormData({
      numeroEmpleado: p.numeroEmpleado, nombre: p.nombre,
      apellidoPaterno: p.apellidoPaterno, apellidoMaterno: p.apellidoMaterno,
      email: p.email, telefono: p.telefono,
      departamento: p.departamento, cargo: p.cargo,
      cubiculo: p.cubiculo || "", planta: p.planta || "",
      fechaIngreso: p.fechaIngreso ? p.fechaIngreso.split("T")[0] : "",
      estatus: p.estatus, rol: p.rol as "admin" | "superadmin",
      tipoCuenta,
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
    setImagenHorarioPendiente(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  /* ── Guardar: al crear abre confirmación; al editar guarda directo ── */
  const guardar = async () => {
    const req: (keyof FormData)[] = ["numeroEmpleado","nombre","apellidoPaterno","apellidoMaterno","email","telefono","departamento","cargo","fechaIngreso"];
    for (const f of req) {
      if (!String(formData[f] ?? "").trim()) { setModalError(`El campo "${f}" es obligatorio.`); return; }
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) { setModalError("El correo electrónico no tiene un formato válido."); return; }
    const telRegex = /^[0-9]{10}$/;
    if (!telRegex.test(formData.telefono.replace(/\s/g,""))) { setModalError("El teléfono debe tener exactamente 10 dígitos."); return; }
    if (!modoEdicion) {
      if (formData.tipoCuenta === "none") {
        // Guardar directo sin crear cuenta
        await ejecutarGuardar({ ...formData }, false);
      } else {
        // Mostrar modal de confirmación de datos con la cuenta a crear
        setPendingForm({ ...formData });
        setShowCuentaModal(true);
      }
      return;
    }
    await ejecutarGuardar(formData, false);
  };

  /* ── Ejecuta el guardado real ── */
  const ejecutarGuardar = async (data: FormData, crearCuenta: boolean) => {
    setSaving(true); setModalError("");
    try {
      if (modoEdicion && actual) {
        const tipoCuentaAnterior = !actual.userId ? "none" : (userActual?.rol || "none");
        const tipoCuentaNuevo = data.tipoCuenta;
        let userId = actual.userId;

        if (tipoCuentaAnterior === "none" && tipoCuentaNuevo !== "none") {
          // Crear cuenta
          try {
            const passwordInicial = data.numeroEmpleado.length >= 6
              ? data.numeroEmpleado
              : `${data.numeroEmpleado}@ITQ`;
            const resUser = await api.post("/auth/register-admin", {
              nombre: `${data.nombre} ${data.apellidoPaterno}`,
              email: data.email,
              password: passwordInicial,
              rol: tipoCuentaNuevo,
            });
            userId = resUser.data?.data?.user?._id
                  || resUser.data?.data?._id
                  || resUser.data?._id
                  || null;
          } catch (authErr: any) {
            console.warn("Error al crear cuenta:", authErr?.response?.data);
            setModalError("Personal actualizado, pero no se pudo crear la cuenta de acceso. Puedes crearla después desde Usuarios.");
          }
        } else if (tipoCuentaAnterior !== "none" && tipoCuentaNuevo === "none") {
          // Eliminar cuenta
          if (actual.userId) {
            try {
              await deleteUser(actual.userId);
              userId = undefined;
            } catch (delErr: any) {
              console.warn("Error al eliminar cuenta:", delErr?.response?.data);
              setModalError("Personal actualizado, pero no se pudo eliminar la cuenta de acceso.");
            }
          }
        } else if (tipoCuentaAnterior !== "none" && tipoCuentaNuevo !== "none" && tipoCuentaAnterior !== tipoCuentaNuevo) {
          // Cambiar rol
          if (actual.userId) {
            try {
              await updateUser(actual.userId, { rol: tipoCuentaNuevo });
            } catch (updErr: any) {
              console.warn("Error al cambiar rol:", updErr?.response?.data);
              setModalError("Personal actualizado, pero no se pudo cambiar el rol de la cuenta.");
            }
          }
        }

        await api.put(`/personal/${actual._id}`, {
          nombre: data.nombre, apellidoPaterno: data.apellidoPaterno,
          apellidoMaterno: data.apellidoMaterno, email: data.email,
          telefono: data.telefono, departamento: data.departamento,
          cargo: data.cargo, cubiculo: data.cubiculo, planta: data.planta,
          fechaIngreso: data.fechaIngreso, estatus: data.estatus, rol: data.rol,
          ...(userId !== undefined ? { userId } : {}),
        });
      } else {
        let userId: string | null = null;

        if (crearCuenta) {
          try {
            // La contraseña inicial es el n° de empleado; se garantizan mínimo 6 chars
            const passwordInicial = data.numeroEmpleado.length >= 6
              ? data.numeroEmpleado
              : `${data.numeroEmpleado}@ITQ`;

            const resUser = await api.post("/auth/register-admin", {
              nombre: `${data.nombre} ${data.apellidoPaterno}`,
              email: data.email,
              password: passwordInicial,
              rol: data.tipoCuenta,            // "user" o "admin"
              requiereCambioPassword: data.tipoCuenta === "admin" || data.tipoCuenta === "superadmin",
            });
            // El backend devuelve: { data: { user: { _id }, token } }
            userId = resUser.data?.data?.user?._id
                  || resUser.data?.data?._id
                  || resUser.data?._id
                  || null;
          } catch (authErr: any) {
            console.warn("Error al crear cuenta:", authErr?.response?.data);
            // Si falla la creación de cuenta, mostramos aviso pero seguimos guardando el personal
            setModalError("Personal guardado, pero no se pudo crear la cuenta de acceso. Puedes crearla después desde Usuarios.");
          }
        }

        const resPersonal = await api.post("/personal", {
          numeroEmpleado: data.numeroEmpleado,
          nombre: data.nombre, apellidoPaterno: data.apellidoPaterno,
          apellidoMaterno: data.apellidoMaterno, email: data.email,
          telefono: data.telefono, departamento: data.departamento,
          cargo: data.cargo, cubiculo: data.cubiculo, planta: data.planta,
          fechaIngreso: data.fechaIngreso, estatus: data.estatus, rol: data.rol,
          ...(userId ? { userId } : {}),
        });
        // Si hay imagen pendiente, subirla al registro recién creado
        const nuevoId = resPersonal.data?.data?._id || resPersonal.data?._id;
        if (nuevoId && imagenPendiente) {
          try {
            const fd = new FormData();
            fd.append("image", imagenPendiente);
            await api.put(`/personal/${nuevoId}/profile-image`, fd, { headers: { "Content-Type": "multipart/form-data" } });
          } catch { /* imagen no crítica, se puede subir después */ }
          setImagenPendiente(null);
        }
        // Si hay imagen de horario pendiente, subirla
        if (nuevoId && imagenHorarioPendiente) {
          try {
            const fd = new FormData();
            fd.append("image", imagenHorarioPendiente);
            await api.put(`/personal/${nuevoId}/schedule-image`, fd, { headers: { "Content-Type": "multipart/form-data" } });
          } catch { /* imagen no crítica, se puede subir después */ }
          setImagenHorarioPendiente(null);
        }
      }
      setShowCuentaModal(false);
      cerrarModal();
      fetchPersonal();
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

  /* ── Imagen de horario de personal ── */
  const subirImagenHorario = async (id: string, file: File) => {
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      await api.put(`/personal/${id}/schedule-image`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      fetchPersonal();
    } catch {
      setModalError("Error al subir la imagen de horario.");
    } finally {
      setUploadingImg(false);
    }
  };

  const eliminarImagenHorario = async (id: string) => {
    setUploadingImg(true);
    try {
      await api.delete(`/personal/${id}/schedule-image`);
      fetchPersonal();
    } catch {
      setModalError("Error al eliminar la imagen de horario.");
    } finally {
      setUploadingImg(false);
    }
  };

  /* ── Imagen de perfil de personal ── */
  const subirImagenPersonal = async (id: string, file: File) => {
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      await api.put(`/personal/${id}/profile-image`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      fetchPersonal();
    } catch {
      setModalError("Error al subir la imagen.");
    } finally {
      setUploadingImg(false);
    }
  };

  const eliminarImagenPersonal = async (id: string) => {
    setUploadingImg(true);
    try {
      await api.delete(`/personal/${id}/profile-image`);
      fetchPersonal();
    } catch {
      setModalError("Error al eliminar la imagen.");
    } finally {
      setUploadingImg(false);
    }
  };

  /* ─── RENDER ─── */
  return (
    <div className="personal-container">
      <NavSpAdmin />

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
              {locations.map((d, i) => <option key={`fdpto-${i}`} value={d}>{d}</option>)}
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
            <button className="btn-agregar-personal" onClick={abrirAgregar}>
              <Plus size={16} /> Agregar Personal
            </button>
            <button
              onClick={() => exportPersonalPDF(personalFiltrado)}
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
                            <td><span className={p.estatus === "activo" ? "estatus-activo" : "estatus-inactivo"}>{p.estatus}</span></td>
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

      {/* ══════════ MODAL PRINCIPAL ══════════ */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-personal">
            <div className="modal-header">
              <h2>{modoEdicion ? "Editar Personal" : "Agregar Personal"}</h2>
              <button onClick={cerrarModal}><X size={18}/></button>
            </div>

            <div className="modal-tabs">
              {TABS.map((t, i) => (
                <button key={`tab-${i}`} className={`modal-tab ${tabActivo === i ? "active" : ""}`} onClick={() => setTabActivo(i)}>{t}</button>
              ))}
            </div>

            <div className="modal-body">

              {/* ── Tab 0: Datos personales ── */}
              {tabActivo === 0 && (
                <div className="form-grid">
                  {/* Foto de perfil */}
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
                    <input name="telefono" placeholder="Ej: 4421234567" value={formData.telefono} onChange={handleChange} autoComplete="off"/>
                  </div>
                  <div className="form-group full">
                    <label>Correo electrónico * (único)</label>
                    <input type="email" name="email" placeholder="correo@uteq.edu.mx" value={formData.email} onChange={handleChange} autoComplete="off"/>
                  </div>
                </div>
              )}

              {/* ── Tab 1: Laboral ── */}
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
                      {locations.map((d, i) => <option key={`fdpto-${i}`} value={d}>{d}</option>)}
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
                  <div className="form-group full">
                    <label>Imagen de horario (opcional)</label>
                    <ImageUploader
                      shape="rect"
                      size={220}
                      currentImage={modoEdicion && actual?.imagenHorario ? actual.imagenHorario : (imagenHorarioPendiente ? URL.createObjectURL(imagenHorarioPendiente) : null)}
                      onUpload={async (file) => {
                        if (modoEdicion && actual) {
                          await subirImagenHorario(actual._id, file);
                        } else {
                          setImagenHorarioPendiente(file);
                        }
                      }}
                      onDelete={async () => {
                        if (modoEdicion && actual) {
                          await eliminarImagenHorario(actual._id);
                        } else {
                          setImagenHorarioPendiente(null);
                        }
                      }}
                      placeholder="Subir imagen de horario"
                    />
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

              {/* ── Tab 2: Acceso al sistema ── */}
              {tabActivo === 2 && (
                <div className="form-grid">
                  <div className="form-group full">
                    <div className="form-info-box">
                      <strong>🔐 Cuenta de acceso al dashboard</strong><br/>
                      Elige el tipo de acceso que tendrá este personal. Si seleccionas "Ninguno", se guardará el registro sin cuenta de acceso.
                    </div>
                  </div>

                  {/* Selector de tipo de cuenta */}
                  <div className="form-group full">
                    <label>Tipo de cuenta</label>
                    <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>

                      {/* Opción: Ninguno */}
                      <label
                        style={{
                          flex: 1, minWidth: 140, display: "flex", alignItems: "center", gap: 12,
                          border: `2px solid ${formData.tipoCuenta === "none" ? "var(--gray-500, #6b7280)" : "var(--gray-200, #e5e7eb)"}`,
                          borderRadius: 10, padding: "12px 14px", cursor: "pointer",
                          background: formData.tipoCuenta === "none" ? "rgba(107,114,128,0.06)" : "transparent",
                          transition: "all 0.15s",
                        }}
                      >
                        <input
                          type="radio" name="tipoCuenta" value="none"
                          checked={formData.tipoCuenta === "none"}
                          onChange={handleChange}
                          style={{ display: "none" }}
                        />
                        <div style={{
                          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                          background: formData.tipoCuenta === "none" ? "rgba(107,114,128,0.12)" : "var(--gray-100, #f3f4f6)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: formData.tipoCuenta === "none" ? "var(--gray-600, #4b5563)" : "var(--gray-400)",
                        }}>
                          <X size={18}/>
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem", color: "var(--gray-800, #1f2937)" }}>Ninguno</p>
                          <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--gray-400)", marginTop: 2 }}>
                            Sin cuenta de acceso al dashboard.
                          </p>
                        </div>
                      </label>

                      {/* Opción: Usuario normal */}
                      <label
                        style={{
                          flex: 1, minWidth: 140, display: "flex", alignItems: "center", gap: 12,
                          border: `2px solid ${formData.tipoCuenta === "user" ? "var(--blue-500, #3b82f6)" : "var(--gray-200, #e5e7eb)"}`,
                          borderRadius: 10, padding: "12px 14px", cursor: "pointer",
                          background: formData.tipoCuenta === "user" ? "rgba(59,130,246,0.06)" : "transparent",
                          transition: "all 0.15s",
                        }}
                      >
                        <input
                          type="radio" name="tipoCuenta" value="user"
                          checked={formData.tipoCuenta === "user"}
                          onChange={handleChange}
                          style={{ display: "none" }}
                        />
                        <div style={{
                          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                          background: formData.tipoCuenta === "user" ? "rgba(59,130,246,0.12)" : "var(--gray-100, #f3f4f6)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: formData.tipoCuenta === "user" ? "var(--blue-500, #3b82f6)" : "var(--gray-400)",
                        }}>
                          <UserCheck size={18}/>
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem", color: "var(--gray-800, #1f2937)" }}>Usuario normal</p>
                          <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--gray-400)", marginTop: 2 }}>
                            Acceso básico. Puede ver eventos y rutas.
                          </p>
                        </div>
                      </label>

                      {/* Opción: Administrador */}
                      <label
                        style={{
                          flex: 1, minWidth: 140, display: "flex", alignItems: "center", gap: 12,
                          border: `2px solid ${formData.tipoCuenta === "admin" ? "#8b5cf6" : "var(--gray-200, #e5e7eb)"}`,
                          borderRadius: 10, padding: "12px 14px", cursor: "pointer",
                          background: formData.tipoCuenta === "admin" ? "rgba(139,92,246,0.06)" : "transparent",
                          transition: "all 0.15s",
                        }}
                      >
                        <input
                          type="radio" name="tipoCuenta" value="admin"
                          checked={formData.tipoCuenta === "admin"}
                          onChange={handleChange}
                          style={{ display: "none" }}
                        />
                        <div style={{
                          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                          background: formData.tipoCuenta === "admin" ? "rgba(139,92,246,0.12)" : "var(--gray-100, #f3f4f6)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: formData.tipoCuenta === "admin" ? "#8b5cf6" : "var(--gray-400)",
                        }}>
                          <ShieldCheck size={18}/>
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem", color: "var(--gray-800, #1f2937)" }}>Administrador</p>
                          <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--gray-400)", marginTop: 2 }}>
                            Gestiona eventos, rutas y ubicaciones.
                          </p>
                        </div>
                      </label>

                      {/* Opción: Super Administrador */}
                      <label
                        style={{
                          flex: 1, minWidth: 140, display: "flex", alignItems: "center", gap: 12,
                          border: `2px solid ${formData.tipoCuenta === "superadmin" ? "#ef4444" : "var(--gray-200, #e5e7eb)"}`,
                          borderRadius: 10, padding: "12px 14px", cursor: "pointer",
                          background: formData.tipoCuenta === "superadmin" ? "rgba(239,68,68,0.06)" : "transparent",
                          transition: "all 0.15s",
                        }}
                      >
                        <input
                          type="radio" name="tipoCuenta" value="superadmin"
                          checked={formData.tipoCuenta === "superadmin"}
                          onChange={handleChange}
                          style={{ display: "none" }}
                        />
                        <div style={{
                          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                          background: formData.tipoCuenta === "superadmin" ? "rgba(239,68,68,0.12)" : "var(--gray-100, #f3f4f6)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: formData.tipoCuenta === "superadmin" ? "#ef4444" : "var(--gray-400)",
                        }}>
                          <Star size={18}/>
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem", color: "var(--gray-800, #1f2937)" }}>Super Administrador</p>
                          <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--gray-400)", marginTop: 2 }}>
                            Control total del sistema.
                          </p>
                        </div>
                      </label>

                    </div>
                  </div>

                  {formData.tipoCuenta !== "none" && (!formData.email || !formData.numeroEmpleado) && (
                    <div className="form-group full">
                      <p style={{ color: "#f59e0b", fontSize: "0.8rem", padding: "8px 12px", background: "rgba(245,158,11,0.08)", borderRadius: 6, margin: 0 }}>
                        ⚠️ Completa el correo y el número de empleado en los tabs anteriores.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {modalError && <p className="form-error">{modalError}</p>}
            </div>

            <div className="modal-footer">
              {tabActivo > 0 && (
                <button className="btn-cancelar" onClick={() => setTabActivo(t => t - 1)} style={{ marginRight: "auto" }}>
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

      {/* ══════════ MODAL CONFIRMACIÓN DE CUENTA ══════════ */}
      {showCuentaModal && pendingForm && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-container" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3>Confirmar registro de personal</h3>
              <button onClick={() => { setShowCuentaModal(false); setSaving(false); }}><X size={18}/></button>
            </div>
            <div className="modal-body" style={{ gap: 14 }}>
              <p style={{ fontSize: "0.9rem", color: "var(--gray-600, #4b5563)", margin: 0 }}>
                Revisa los datos antes de guardar:
              </p>

              {/* Datos del personal */}
              <div style={{
                background: "var(--gray-50, #f9fafb)",
                border: "1px solid var(--gray-200, #e5e7eb)",
                borderRadius: 8, padding: "12px 14px", fontSize: "0.85rem",
                display: "flex", flexDirection: "column", gap: 6,
              }}>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 4, color: "var(--gray-800, #1f2937)" }}>
                  👤 {pendingForm.nombre} {pendingForm.apellidoPaterno} {pendingForm.apellidoMaterno}
                </div>
                <div><strong>N° Empleado:</strong> {pendingForm.numeroEmpleado}</div>
                <div><strong>Correo:</strong> {pendingForm.email}</div>
                <div><strong>Departamento:</strong> {pendingForm.departamento}</div>
                <div><strong>Cargo:</strong> {pendingForm.cargo}</div>
                {pendingForm.planta && <div><strong>Planta / Piso:</strong> {pendingForm.planta}</div>}
                {pendingForm.cubiculo && <div><strong>Cubículo:</strong> {pendingForm.cubiculo}</div>}
              </div>

              {/* Datos de cuenta (solo si tiene cuenta) */}
              <div style={{
                background: pendingForm.tipoCuenta === "admin" ? "rgba(139,92,246,0.06)" : "rgba(59,130,246,0.06)",
                border: `1px solid ${pendingForm.tipoCuenta === "admin" ? "rgba(139,92,246,0.2)" : "rgba(59,130,246,0.2)"}`,
                borderRadius: 8, padding: "12px 14px", fontSize: "0.85rem",
                display: "flex", flexDirection: "column", gap: 5,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  {pendingForm.tipoCuenta === "admin"
                    ? <><ShieldCheck size={15} color="#8b5cf6"/> <strong style={{ color: "#8b5cf6" }}>Cuenta: Administrador</strong></>
                    : <><UserCheck  size={15} color="var(--blue-500, #3b82f6)"/> <strong style={{ color: "var(--blue-500, #3b82f6)" }}>Cuenta: Usuario normal</strong></>
                  }
                </div>
                <div><strong>Usuario (email):</strong> {pendingForm.email}</div>
                <div><strong>Contraseña inicial:</strong> {
                  pendingForm.numeroEmpleado.length >= 6
                    ? pendingForm.numeroEmpleado
                    : `${pendingForm.numeroEmpleado}@ITQ`
                }</div>
                {pendingForm.tipoCuenta === "admin" && (
                  <div style={{ marginTop: 4, fontSize: "0.78rem", color: "#8b5cf6", display: "flex", alignItems: "center", gap: 4 }}>
                    <ShieldCheck size={12}/> Se solicitará cambio de contraseña en el primer inicio de sesión.
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancelar" onClick={() => { setShowCuentaModal(false); setSaving(false); }}>
                Cancelar
              </button>
              <button className="btn-guardar" onClick={() => ejecutarGuardar(pendingForm, true)} disabled={saving}>
                {saving ? "Guardando…" : "✓ Confirmar y guardar"}
              </button>
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
};

export default PersonalSpAdmin;