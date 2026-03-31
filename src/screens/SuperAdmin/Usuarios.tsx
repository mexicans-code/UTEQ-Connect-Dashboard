import React, { useState, useEffect, useMemo } from "react";
import "../../styles/Usuarios.css";
import NavSpAdmin from "../components/NavSpAdmin";
import { Pencil, Ban, Trash2, Plus, X, CheckCircle, Search, FileDown } from "lucide-react";
import api from "../../api/axios";
import { exportUsuariosPDF } from "../../utils/pdfExport";
import { notifyLocal } from "../../utils/notify.ts";

interface Usuario {
  _id: string;
  nombre: string;
  email: string;
  rol: string;
  estatus: string;
  fechaCreacion?: string;
  ultimoLogin?: string;
}

interface FormData {
  nombre: string;
  email: string;
  password: string;
  rol: string;
  estatus: string;
}

const EMPTY_FORM: FormData = { nombre: "", email: "", password: "", rol: "user", estatus: "activo" };

// Roles disponibles según quien está logueado
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
  // Leer el rol en cada render — nunca como constante de módulo
  const ROL_ACTUAL = (localStorage.getItem("rol") ?? "superadmin") as "admin" | "superadmin";

  const [usuarios, setUsuarios]       = useState<Usuario[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [busqueda, setBusqueda]       = useState("");
  const [filtroRol, setFiltroRol]     = useState("");
  const [filtroEstatus, setFiltroEstatus] = useState("");
  const [showModal, setShowModal]     = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);
  const [saving, setSaving]           = useState(false);
  const [formData, setFormData]       = useState<FormData>(EMPTY_FORM);

  const fetchUsuarios = async () => {
    setLoading(true); setError("");
    try {
      const res  = await api.get("/users");
      const data = res.data.data || res.data;
      setUsuarios(Array.isArray(data) ? data : []);
    } catch { setError("Error al cargar usuarios. Verifica tu sesión."); }
    finally   { setLoading(false); }
  };

  useEffect(() => { fetchUsuarios(); }, []);

  const usuariosFiltrados = useMemo(() => usuarios.filter(u => {
    const txt = busqueda.toLowerCase();
    const matchTxt    = !busqueda || u.nombre.toLowerCase().includes(txt) || u.email.toLowerCase().includes(txt);
    const matchRol    = !filtroRol     || u.rol     === filtroRol;
    const matchEstatus = !filtroEstatus || u.estatus === filtroEstatus;
    return matchTxt && matchRol && matchEstatus;
  }), [usuarios, busqueda, filtroRol, filtroEstatus]);

  const abrirAgregar = () => {
    setModoEdicion(false); setUsuarioActual(null); setFormData(EMPTY_FORM); setError(""); setShowModal(true);
  };

  const abrirEditar = (u: Usuario) => {
    if (ROL_ACTUAL === "admin" && u.rol === "superadmin") {
      alert("No tienes permisos para editar a un Super Admin."); return;
    }
    setModoEdicion(true); setUsuarioActual(u);
    setFormData({ nombre: u.nombre, email: u.email, password: "", rol: u.rol, estatus: u.estatus });
    setError(""); setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setError("");
    setFormData(EMPTY_FORM);
    setModoEdicion(false);
    setUsuarioActual(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const guardarUsuario = async () => {
    if (!formData.nombre || !formData.email) { setError("Nombre y correo son obligatorios."); return; }
    if (!modoEdicion && !formData.password)   { setError("La contraseña es obligatoria al crear un usuario."); return; }
    if (ROL_ACTUAL === "admin" && formData.rol === "superadmin") {
      setError("No tienes permisos para asignar el rol Super Admin."); return;
    }
    setSaving(true); setError("");
    try {
      if (modoEdicion && usuarioActual) {
        const body: any = { nombre: formData.nombre, email: formData.email, rol: formData.rol, estatus: formData.estatus };
        if (formData.password) body.password = formData.password;
        await api.put(`/users/${usuarioActual._id}`, body);
      } else {
        await api.post("/auth/register-admin", {
          nombre: formData.nombre,
          email: formData.email,
          password: formData.password,
          rol: formData.rol,
          requiereCambioPassword: formData.rol === "admin" || formData.rol === "superadmin",
        });
      }
      cerrarModal(); fetchUsuarios();
      notifyLocal(
        modoEdicion ? "Usuario actualizado" : "Usuario creado",
        modoEdicion ? `${formData.nombre} fue actualizado.` : `${formData.nombre} fue creado correctamente.`
      );
    } catch (err: any) { setError(err.response?.data?.error || "Error al guardar usuario."); }
    finally { setSaving(false); }
  };

  const eliminarUsuario = async (u: Usuario) => {
    if (ROL_ACTUAL === "admin" && u.rol === "superadmin") { alert("Sin permisos para eliminar Super Admins."); return; }
    if (!confirm(`¿Eliminar permanentemente a ${u.nombre}?`)) return;
    try { await api.delete(`/users/${u._id}`); fetchUsuarios(); notifyLocal("Usuario eliminado", `${u.nombre} fue eliminado.`); }
    catch { alert("Error al eliminar usuario."); }
  };

  const toggleEstatus = async (u: Usuario) => {
    if (ROL_ACTUAL === "admin" && u.rol === "superadmin") { alert("Sin permisos para cambiar estatus de Super Admins."); return; }
    const accion = u.estatus === "activo" ? "deactivate" : "activate";
    try { await api.patch(`/users/${u._id}/${accion}`); fetchUsuarios(); notifyLocal("Estatus actualizado", `${u.nombre} fue ${accion === 'deactivate' ? 'desactivado' : 'activado'}.`); }
    catch { alert("Error al cambiar estatus."); }
  };

  const rolBadge = (rol: string) => {
    const map: Record<string, string> = { superadmin: "badge-red", admin: "badge-blue", user: "badge-gray" };
    return <span className={`badge ${map[rol] || "badge-gray"}`}>{rol}</span>;
  };

  const rolesDisponibles = ROLES_POR_ROL[ROL_ACTUAL ?? "admin"] ?? ROLES_POR_ROL.admin;
  const hayFiltros = busqueda || filtroRol || filtroEstatus;

  // ── Estilos inline reutilizables ──
  const selectStyle: React.CSSProperties = {
  padding: "9px 12px", boxSizing: "border-box" as const,
  background: "var(--white)",
  border: "1.5px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--gray-800)",
  fontSize: "0.875rem",
  outline: "none",
  fontFamily: "var(--font-sans)",
  };

  return (
    <div className="usuarios-container">
      <NavSpAdmin />

      <div className="usuarios-main">
        <header className="usuarios-header">
          <h1>Gestión de usuarios</h1>
          <p>
            {usuariosFiltrados.length} de {usuarios.length} usuarios
            {ROL_ACTUAL === "admin" && (
              <span style={{ marginLeft: 8, color: "var(--gray-400)", fontSize: "0.78rem" }}>
                · Vista Admin
              </span>
            )}
          </p>
        </header>

        <div className="usuarios-content">

          {/* ── Barra de búsqueda y filtros ── */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>

            {/* Búsqueda */}
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", pointerEvents: "none" }} />
              <input
                type="text"
                placeholder="Buscar por nombre o correo..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ ...selectStyle, width: "100%", paddingLeft: 32, boxSizing: "border-box" }}
              />
            </div>

            {/* Filtro rol */}
            <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)} style={selectStyle}>
              <option value="">Todos los roles</option>
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
              {ROL_ACTUAL === "superadmin" && <option value="superadmin">Super Admin</option>}
            </select>

            {/* Filtro estatus */}
            <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)} style={selectStyle}>
              <option value="">Todos los estatus</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>

            {/* Limpiar filtros */}
            {hayFiltros && (
              <button
                onClick={() => { setBusqueda(""); setFiltroRol(""); setFiltroEstatus(""); }}
                style={{ ...selectStyle, background: "transparent", cursor: "pointer", color: "var(--gray-400)" }}
              >
                <X size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
                Limpiar
              </button>
            )}

            <button className="btn-agregarS" onClick={abrirAgregar} style={{ marginLeft: "auto" }}>
              <Plus size={16} /> Agregar Usuario
            </button>
            <button
              onClick={() => exportUsuariosPDF(usuariosFiltrados, "superadmin")}
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

          {/* Error global */}
          {error && !showModal && (
            <p style={{ color: "var(--red-600)", background: "var(--red-50)", padding: "10px 14px", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", marginBottom: 12 }}>
              {error}
            </p>
          )}

          {/* Tabla */}
          {loading ? (
            <p style={{ color: "var(--gray-400)", padding: "24px" }}>Cargando usuarios...</p>
          ) : (
            <table className="usuarios-table">
              <thead>
                <tr>
                  <th>Nombre completo</th>
                  <th>Correo Electrónico</th>
                  <th>Rol</th>
                  <th>Estatus</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "var(--gray-400)" }}>
                      {usuarios.length === 0 ? "Sin usuarios registrados" : "Sin resultados para los filtros aplicados"}
                    </td>
                  </tr>
                ) : (
                  usuariosFiltrados.map(u => {
                    const bloqueado = ROL_ACTUAL === "admin" && u.rol === "superadmin";
                    return (
                      <tr key={u._id} style={{ opacity: bloqueado ? 0.45 : 1 }}>
                        <td>{u.nombre}</td>
                        <td>{u.email}</td>
                        <td>{rolBadge(u.rol)}</td>
                        <td>
                          <span className={u.estatus === "activo" ? "estatus-activo" : "estatus-inactivo"}>
                            {u.estatus}
                          </span>
                        </td>
                        <td>
                          <div className="acciones">
                            <button className="btn-icon" onClick={() => abrirEditar(u)} title={bloqueado ? "Sin permisos" : "Editar"} disabled={bloqueado}>
                              <Pencil size={16} />
                            </button>
                            <button
                              className={`btn-icon ${u.estatus === "activo" ? "toggle" : "success"}`}
                              onClick={() => toggleEstatus(u)}
                              title={bloqueado ? "Sin permisos" : u.estatus === "activo" ? "Desactivar" : "Activar"}
                              disabled={bloqueado}
                            >
                              {u.estatus === "activo" ? <Ban size={16} /> : <CheckCircle size={16} />}
                            </button>
                            <button className="btn-icon delete" onClick={() => eliminarUsuario(u)} title={bloqueado ? "Sin permisos" : "Eliminar"} disabled={bloqueado}>
                              <Trash2 size={16} />
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
        </div>
      </div>

      {/* ══ Modal ══ */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>{modoEdicion ? "Editar Usuario" : "Agregar Usuario"}</h2>
              <button onClick={cerrarModal}><X size={18} /></button>
            </div>

            <div className="modal-body">
              <input type="text"     name="nombre"   placeholder="Nombre completo" autoComplete="off"                                                        value={formData.nombre}   onChange={handleChange} />
              <input type="email"    name="email"    placeholder="Correo electrónico" autoComplete="off"                                                      value={formData.email}    onChange={handleChange} />
              <input type="password" name="password" placeholder={modoEdicion ? "Nueva contraseña (vacío = sin cambio)" : "Contraseña *"} autoComplete="new-password" value={formData.password} onChange={handleChange} />

              {/* Roles disponibles según tipo de admin */}
              <select name="rol" value={formData.rol} onChange={handleChange}>
                {rolesDisponibles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>

              <select name="estatus" value={formData.estatus} onChange={handleChange}>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>

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
            </div>

            <div className="modal-footer">
              <button className="btn-cancelar" onClick={cerrarModal}>Cancelar</button>
              <button className="btn-guardar" onClick={guardarUsuario} disabled={saving}>
                {saving ? "Guardando..." : modoEdicion ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Usuarios;