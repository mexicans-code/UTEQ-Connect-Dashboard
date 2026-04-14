import React, { useState, useEffect, useMemo, useRef } from "react";
import "../styles/Usuarios.css";
import "../styles/tabla.css";
import { Pencil, Ban, Plus, X, CheckCircle, Search, FileDown } from "lucide-react";
import {
  getUsuarios, updateUsuario, activateUsuario, deactivateUsuario, registerAdmin,
  type Usuario,
} from "../api/users";
import ConfirmModal from "./components/ConfirmModal";
import Paginacion from "./components/Paginacion";
import { exportUsuariosPDF } from "../utils/pdfExport";
import { notifyLocal } from "../utils/notify";
import NavSidebar from "./components/NavSidebar";
import PageTopbar from "./components/PageTopbar";
import FieldError from "./components/ui/FieldError";
import FormField from "./components/ui/FormField";
import AppModal from "./components/shared/AppModal";
import { useConfirm } from "../hooks/useConfirm";
import { useModal } from "../hooks/useModal";
import { FIELD_LIMITS, validateField } from "../utils/fieldLimits";

interface FormData {
  nombre: string; apellidoPaterno: string; apellidoMaterno: string;
  email: string; password: string; confirmPassword: string; rol: string;
}

interface FormErrors {
  nombre?: string; apellidoPaterno?: string; apellidoMaterno?: string;
  email?: string; password?: string; confirmPassword?: string; rol?: string;
}

const EMPTY_FORM: FormData = {
  nombre: "", apellidoPaterno: "", apellidoMaterno: "",
  email: "", password: "", confirmPassword: "", rol: "user",
};
const EMPTY_ERRORS: FormErrors = {};
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buildNombreCompleto = (f: FormData): string =>
  [f.nombre.trim(), f.apellidoPaterno.trim(), f.apellidoMaterno.trim()].filter(Boolean).join(" ");

const splitNombreCompleto = (nombreCompleto: string) => {
  const partes = nombreCompleto.trim().split(/\s+/);
  if (partes.length === 1) return { nombre: partes[0], apellidoPaterno: "", apellidoMaterno: "" };
  if (partes.length === 2) return { nombre: partes[0], apellidoPaterno: partes[1], apellidoMaterno: "" };
  return { nombre: partes[0], apellidoPaterno: partes[1], apellidoMaterno: partes.slice(2).join(" ") };
};

const ROLES_POR_ROL: Record<string, { value: string; label: string }[]> = {
  superadmin: [
    { value: "user",       label: "Usuario" },
    { value: "admin",      label: "Administrador" },
    { value: "superadmin", label: "Super Admin" },
  ],
  admin: [
    { value: "user",  label: "Usuario" },
    { value: "admin", label: "Administrador" },
  ],
};

const Usuarios: React.FC = () => {
  const ROL_ACTUAL = (localStorage.getItem("rol") ?? "admin") as "admin" | "superadmin";

  const confirm = useConfirm();
  const modal   = useModal<Usuario, FormData>(EMPTY_FORM);

  const [usuarios,      setUsuarios]      = useState<Usuario[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [busqueda,      setBusqueda]      = useState("");
  const [filtroRol,     setFiltroRol]     = useState("");
  const [filtroEstatus, setFiltroEstatus] = useState("");
  const [formErrors,    setFormErrors]    = useState<FormErrors>(EMPTY_ERRORS);
  const [pagina,        setPagina]        = useState(1);
  const POR_PAGINA = 10;

  const formData      = modal.form;
  const modoEdicion   = modal.esEdicion;
  const usuarioActual = modal.actual;
  const saving        = modal.guardando;

  const refNombre          = useRef<HTMLDivElement>(null);
  const refApellidoPaterno = useRef<HTMLDivElement>(null);
  const refApellidoMaterno = useRef<HTMLDivElement>(null);
  const refEmail           = useRef<HTMLDivElement>(null);
  const refPassword        = useRef<HTMLDivElement>(null);
  const refConfirmPassword = useRef<HTMLDivElement>(null);
  const refRol             = useRef<HTMLDivElement>(null);

  /* ── Fetch ── */
  const fetchUsuarios = async () => {
    setLoading(true); setError("");
    try {
      const data = await getUsuarios();
      setUsuarios(data);
    } catch { setError("Error al cargar usuarios. Verifica tu sesión."); }
    finally   { setLoading(false); }
  };

  useEffect(() => { fetchUsuarios(); }, []);

  /* ── Filtros ── */
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter(u => {
      const txt      = busqueda.toLowerCase();
      const matchTxt = !busqueda      || u.nombre.toLowerCase().includes(txt) || u.email.toLowerCase().includes(txt);
      const matchRol = !filtroRol     || u.rol     === filtroRol;
      const matchEst = !filtroEstatus || u.estatus === filtroEstatus;
      return matchTxt && matchRol && matchEst;
    });
  }, [usuarios, busqueda, filtroRol, filtroEstatus]);

  useEffect(() => { setPagina(1); }, [busqueda, filtroRol, filtroEstatus]);

  const usuariosPagina = useMemo(
    () => usuariosFiltrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
    [usuariosFiltrados, pagina]
  );

  /* ── Modal handlers ── */
  const abrirAgregar = () => { modal.abrirAgregar(); setFormErrors(EMPTY_ERRORS); setError(""); };

  const abrirEditar = (u: Usuario) => {
    if (ROL_ACTUAL === "admin" && u.rol === "superadmin") {
      setError("No tienes permisos para editar a un Super Admin."); return;
    }
    const partes = splitNombreCompleto(u.nombre);
    modal.abrirEditar(u, {
      nombre: partes.nombre, apellidoPaterno: partes.apellidoPaterno,
      apellidoMaterno: partes.apellidoMaterno, email: u.email,
      password: "", confirmPassword: "", rol: u.rol,
    });
    setFormErrors(EMPTY_ERRORS); setError("");
  };

  const cerrarModal = () => { modal.cerrar(); setFormErrors(EMPTY_ERRORS); setError(""); };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const maxLen: Partial<Record<keyof FormData, number>> = {
      nombre: FIELD_LIMITS.nombre.max, apellidoPaterno: FIELD_LIMITS.apellidoPaterno.max,
      apellidoMaterno: FIELD_LIMITS.apellidoMaterno.max, email: 80, password: 50, confirmPassword: 50,
    };
    if (maxLen[name as keyof FormData] !== undefined && value.length > maxLen[name as keyof FormData]!) return;
    modal.setForm(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof FormErrors]) setFormErrors(prev => ({ ...prev, [name]: undefined }));
  };

  /* ── Validación ── */
  const validar = (): { errors: FormErrors; firstRef: React.RefObject<HTMLDivElement> | null } => {
    const errors: FormErrors = {};
    let firstRef: React.RefObject<HTMLDivElement> | null = null;

    const errNombre = validateField(formData.nombre, FIELD_LIMITS.nombre);
    if (errNombre) { errors.nombre = errNombre; if (!firstRef) firstRef = refNombre; }

    const errApPaterno = validateField(formData.apellidoPaterno, FIELD_LIMITS.apellidoPaterno);
    if (errApPaterno) { errors.apellidoPaterno = errApPaterno; if (!firstRef) firstRef = refApellidoPaterno; }

    const errApMaterno = validateField(formData.apellidoMaterno, FIELD_LIMITS.apellidoMaterno);
    if (errApMaterno) { errors.apellidoMaterno = errApMaterno; if (!firstRef) firstRef = refApellidoMaterno; }

    if (!formData.email.trim()) { errors.email = "El correo electrónico es obligatorio."; if (!firstRef) firstRef = refEmail; }
    else if (!EMAIL_REGEX.test(formData.email.trim())) { errors.email = "Ingresa un correo electrónico válido (ej. usuario@dominio.com)."; if (!firstRef) firstRef = refEmail; }

    if (!modoEdicion) {
      if (!formData.password) { errors.password = "La contraseña es obligatoria al crear un usuario."; if (!firstRef) firstRef = refPassword; }
      else if (formData.password.length < 8) { errors.password = "La contraseña debe tener al menos 8 caracteres."; if (!firstRef) firstRef = refPassword; }
      else if (!formData.confirmPassword) { errors.confirmPassword = "Debes confirmar la contraseña."; if (!firstRef) firstRef = refConfirmPassword; }
      else if (formData.password !== formData.confirmPassword) { errors.confirmPassword = "Las contraseñas no coinciden."; if (!firstRef) firstRef = refConfirmPassword; }
    }

    if (ROL_ACTUAL === "admin" && formData.rol === "superadmin") {
      errors.rol = "No tienes permisos para asignar el rol Super Admin."; if (!firstRef) firstRef = refRol;
    }

    return { errors, firstRef };
  };

  /* ── Guardar ── */
  const guardarUsuario = async () => {
    const { errors, firstRef } = validar();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setTimeout(() => {
        firstRef?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        (firstRef?.current?.querySelector("input, select") as HTMLElement | null)?.focus();
      }, 50);
      return;
    }

    const nombreCompleto = buildNombreCompleto(formData);
    modal.setSaving(true); setError("");
    try {
      if (modoEdicion && usuarioActual) {
        await updateUsuario(usuarioActual._id, {
          nombre: nombreCompleto, email: formData.email,
          rol: formData.rol, estatus: usuarioActual.estatus,
        });
      } else {
        await registerAdmin({
          nombre: nombreCompleto, email: formData.email,
          password: formData.password, rol: formData.rol, estatus: "activo",
          requiereCambioPassword: formData.rol === "admin" || formData.rol === "superadmin",
        });
      }
      cerrarModal(); fetchUsuarios();
      notifyLocal(
        modoEdicion ? "Usuario actualizado" : "Usuario creado",
        modoEdicion ? `${nombreCompleto} fue actualizado.` : `${nombreCompleto} fue creado correctamente.`
      );
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al guardar usuario.");
    } finally { modal.setSaving(false); }
  };

  /* ── Acciones ── */
  const toggleEstatus = async (u: Usuario) => {
    if (ROL_ACTUAL === "admin" && u.rol === "superadmin") {
      setError("Sin permisos para cambiar estatus de Super Admins."); return;
    }
    try {
      if (u.estatus === "activo") await deactivateUsuario(u._id);
      else await activateUsuario(u._id);
      fetchUsuarios();
      notifyLocal("Estatus actualizado", `${u.nombre} fue ${u.estatus === "activo" ? "desactivado" : "activado"}.`);
    } catch {}
  };

  const rolBadge = (rol: string) => {
    const map: Record<string, string> = { superadmin: "badge-red", admin: "badge-blue", user: "badge-gray" };
    return <span className={`badge ${map[rol] || "badge-gray"}`}>{rol}</span>;
  };

  const rolesDisponibles = ROLES_POR_ROL[ROL_ACTUAL ?? "admin"] ?? ROLES_POR_ROL.admin;
  const hayFiltros = busqueda || filtroRol || filtroEstatus;

  const selectStyle: React.CSSProperties = {
    padding: "9px 12px", boxSizing: "border-box" as const,
    background: "var(--white)", border: "1.5px solid var(--border)",
    borderRadius: "var(--radius-sm)", color: "var(--gray-800)",
    fontSize: "0.875rem", outline: "none", fontFamily: "var(--font-sans)",
  };

  const inputErrorStyle: React.CSSProperties = { border: "1.5px solid var(--red-400, #f87171)", outline: "none" };

  return (
    <div className="usuarios-container">
      <NavSidebar rol={ROL_ACTUAL as "admin" | "superadmin"} />

      <div className="usuarios-main">
        <PageTopbar
          title="Gestión de Usuarios"
          subtitle={`${usuariosFiltrados.length} de ${usuarios.length} usuarios${ROL_ACTUAL === "admin" ? " · Vista Admin" : ""}`}
          showDownload={false}
        />

        <div className="usuarios-content">
          {/* ── Filtros ── */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", pointerEvents: "none" }} />
              <input type="text" placeholder="Buscar por nombre o correo..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)}
                style={{ ...selectStyle, width: "100%", paddingLeft: 32, boxSizing: "border-box" }} />
            </div>

            <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)} style={selectStyle}>
              <option value="">Todos los roles</option>
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
              {ROL_ACTUAL === "superadmin" && <option value="superadmin">Super Admin</option>}
            </select>

            <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)} style={selectStyle}>
              <option value="">Todos los estatus</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>

            {hayFiltros && (
              <button onClick={() => { setBusqueda(""); setFiltroRol(""); setFiltroEstatus(""); }}
                style={{ ...selectStyle, background: "transparent", cursor: "pointer", color: "var(--gray-400)" }}>
                <X size={13} style={{ verticalAlign: "middle", marginRight: 4 }} /> Limpiar
              </button>
            )}

            <button data-action className="btn-agregarS" onClick={abrirAgregar} style={{ marginLeft: "auto" }}>
              <Plus size={16} /> Agregar Usuario
            </button>
            <button data-action onClick={() => exportUsuariosPDF(usuariosFiltrados, ROL_ACTUAL)} title="Descargar PDF"
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: "var(--radius-sm)", background: "#e53e3e", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
              <FileDown size={15} /> Descargar PDF
            </button>
          </div>

          {error && !modal.abierto && (
            <p style={{ color: "var(--red-600)", background: "var(--red-50)", padding: "10px 14px", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", marginBottom: 12 }}>
              {error}
            </p>
          )}

          {/* ── Tabla ── */}
          {loading ? (
            <p style={{ color: "var(--gray-400)", padding: "24px" }}>Cargando usuarios...</p>
          ) : (
            <table className="ut-table">
              <thead>
                <tr>
                  <th>Nombre completo</th><th>Correo Electrónico</th>
                  <th>Rol</th><th>Estatus</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "var(--gray-400)" }}>
                    {usuarios.length === 0 ? "Sin usuarios registrados" : "Sin resultados para los filtros aplicados"}
                  </td></tr>
                ) : (
                  usuariosPagina.map(u => {
                    const bloqueado = ROL_ACTUAL === "admin" && u.rol === "superadmin";
                    return (
                      <tr key={u._id} style={{ opacity: bloqueado ? 0.45 : 1 }}>
                        <td>{u.nombre}</td>
                        <td>{u.email}</td>
                        <td>{rolBadge(u.rol)}</td>
                        <td><span className={u.estatus === "activo" ? "estatus-activo" : "estatus-inactivo"}>{u.estatus}</span></td>
                        <td>
                          <div className="ut-actions">
                            <button data-action className="ut-btn-icon" onClick={() => abrirEditar(u)} title={bloqueado ? "Sin permisos" : "Editar"} disabled={bloqueado}><Pencil size={16} /></button>
                            <button data-action className={`btn-icon ${u.estatus === "activo" ? "toggle" : "success"}`} onClick={() => toggleEstatus(u)} title={bloqueado ? "Sin permisos" : u.estatus === "activo" ? "Desactivar" : "Activar"} disabled={bloqueado}>
                              {u.estatus === "activo" ? <Ban size={16} /> : <CheckCircle size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
          <Paginacion total={usuariosFiltrados.length} porPagina={POR_PAGINA} paginaActual={pagina} onChange={setPagina} />
        </div>
      </div>

      {/* ── Modal ── */}
      <AppModal
        open={modal.abierto}
        titulo={modoEdicion ? "Editar Usuario" : "Agregar Usuario"}
        onClose={cerrarModal}
        onSave={guardarUsuario}
        saving={saving}
        saveText={modoEdicion ? "Actualizar" : "Guardar"}
      >
        <FormField label="Nombre(s)" limits={FIELD_LIMITS.nombre} value={formData.nombre} error={formErrors.nombre} containerRef={refNombre} isAdmin>
          <input type="text" name="nombre" placeholder="Ej. María Fernanda" autoComplete="given-name"
            value={formData.nombre} onChange={handleChange} style={formErrors.nombre ? inputErrorStyle : undefined} />
        </FormField>

        <FormField label="Apellido paterno" limits={FIELD_LIMITS.apellidoPaterno} value={formData.apellidoPaterno} error={formErrors.apellidoPaterno} containerRef={refApellidoPaterno} isAdmin>
          <input type="text" name="apellidoPaterno" placeholder="Ej. García" autoComplete="family-name"
            value={formData.apellidoPaterno} onChange={handleChange} style={formErrors.apellidoPaterno ? inputErrorStyle : undefined} />
        </FormField>

        <FormField label="Apellido materno *" limits={FIELD_LIMITS.apellidoMaterno} value={formData.apellidoMaterno} error={formErrors.apellidoMaterno} containerRef={refApellidoMaterno} isAdmin>
          <input type="text" name="apellidoMaterno" placeholder="Ej. López" autoComplete="additional-name"
            value={formData.apellidoMaterno} onChange={handleChange} style={formErrors.apellidoMaterno ? inputErrorStyle : undefined} />
        </FormField>

        {(formData.nombre.trim() || formData.apellidoPaterno.trim()) && (
          <p style={{ fontSize: "0.78rem", color: "var(--gray-500, #6b7280)", background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.12)", borderRadius: 6, padding: "6px 10px", margin: "-4px 0 2px" }}>
            Nombre completo: <strong>{buildNombreCompleto(formData) || "—"}</strong>
          </p>
        )}

        <FormField label="Correo electrónico" error={formErrors.email} containerRef={refEmail} isAdmin>
          <input type="email" name="email" placeholder="Ej. usuario@dominio.com" autoComplete="off"
            value={formData.email} onChange={handleChange} style={formErrors.email ? inputErrorStyle : undefined} />
        </FormField>

        {!modoEdicion && (
          <FormField label="Contraseña" error={formErrors.password} containerRef={refPassword} isAdmin>
            <input type="password" name="password" placeholder="Mínimo 8 caracteres" autoComplete="new-password"
              value={formData.password} onChange={handleChange} style={formErrors.password ? inputErrorStyle : undefined} />
          </FormField>
        )}

        {!modoEdicion && (
          <FormField label="Confirmar contraseña" error={formErrors.confirmPassword} containerRef={refConfirmPassword} isAdmin>
            <input type="password" name="confirmPassword" placeholder="Repite la contraseña" autoComplete="new-password"
              value={formData.confirmPassword} onChange={handleChange} style={formErrors.confirmPassword ? inputErrorStyle : undefined} />
          </FormField>
        )}

        <FormField label="Rol" error={formErrors.rol} containerRef={refRol} isAdmin>
          <select name="rol" value={formData.rol} onChange={handleChange} style={formErrors.rol ? inputErrorStyle : undefined}>
            {rolesDisponibles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </FormField>

        {ROL_ACTUAL === "admin" && (
          <p style={{ fontSize: "0.78rem", color: "var(--gray-400)", margin: "4px 0 0", padding: "8px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 6 }}>
            ℹ️ Como Administrador puedes crear usuarios y administradores, pero no Super Admins.
          </p>
        )}

        {error && (
          <p style={{ color: "var(--red-600)", fontSize: "0.84rem", margin: 0, padding: "8px 12px", background: "var(--red-50)", borderRadius: "var(--radius-sm)" }}>
            {error}
          </p>
        )}
      </AppModal>

      <ConfirmModal open={confirm.open} mensaje={confirm.mensaje} onConfirm={confirm.ejecutar} onCancel={confirm.cancelar} />
    </div>
  );
};

export default Usuarios;