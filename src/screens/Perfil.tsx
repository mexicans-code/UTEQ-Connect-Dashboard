import React, { useState, useEffect } from "react";
import "../styles/Perfil.css";
import { useNavigate } from "react-router-dom";
import {
  User, Mail, Shield, Calendar, Clock,
  KeyRound, Check, AlertCircle, Save,
} from "lucide-react";
import { getProfile, updateUsuario, changePassword, uploadProfileImage, deleteProfileImage } from "../api/users";

/* ── Importa el nav correcto según el rol ── */
import ImageUploader from "./components/ImageUploader";
import NavSidebar from "./components/NavSidebar";
import PageTopbar from "./components/PageTopbar";

/* ════════════════════════════════════
   Interfaces
════════════════════════════════════ */
interface UsuarioPerfil {
  _id: string;
  nombre: string;
  email: string;
  rol: string;
  estatus: string;
  imagenPerfil?: string;
  fechaCreacion?: string;
  ultimoLogin?: string;
}

type ToastState = { tipo: "success" | "error"; msg: string } | null;

/* ════════════════════════════════════
   Helpers
════════════════════════════════════ */
const formatFecha = (iso?: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit", month: "long", year: "numeric",
  });
};

const formatFechaHora = (iso?: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const iniciales = (nombre: string) =>
  nombre.split(" ").slice(0, 2).map(n => n[0]?.toUpperCase()).join("");

const rolLabel: Record<string, string> = {
  superadmin: "Super Admin",
  admin:      "Administrador",
  user:       "Usuario",
};

/* ════════════════════════════════════
   Componente
════════════════════════════════════ */
const Perfil: React.FC = () => {
  const navigate  = useNavigate();
  const rolActual = (localStorage.getItem("rol") || "admin") as string;
  const esSuperAdmin = rolActual === "superadmin";

  /* ── Estado del perfil ── */
  const [usuario, setUsuario]       = useState<UsuarioPerfil | null>(null);
  const [loading, setLoading]       = useState(true);

  /* ── Edición de datos personales ── */
  const [nombre, setNombre]         = useState("");
  const [savingNombre, setSavingNombre] = useState(false);
  const [toastNombre, setToastNombre]   = useState<ToastState>(null);

  /* ── Imagen de perfil ── */
  const [uploadingImg, setUploadingImg] = useState(false);

  /* ── Cambio de contraseña ── */
  const [passActual, setPassActual]     = useState("");
  const [passNueva, setPassNueva]       = useState("");
  const [passConfirm, setPassConfirm]   = useState("");
  const [savingPass, setSavingPass]     = useState(false);
  const [toastPass, setToastPass]       = useState<ToastState>(null);

  /* ── Mostrar toast con auto-dismiss ── */
  const showToast = (setter: React.Dispatch<React.SetStateAction<ToastState>>, toast: ToastState) => {
    setter(toast);
    setTimeout(() => setter(null), 3500);
  };

  /* ── Fetch perfil ── */
  const fetchPerfil = async () => {
    setLoading(true);
    try {
      const data: UsuarioPerfil = await getProfile();
      setUsuario(data);
      setNombre(data.nombre);
      // Sincronizar imagenPerfil en localStorage para que los navs la muestren
      localStorage.setItem("imagenPerfil", data.imagenPerfil || "");
      // Disparar evento storage para que navs en la misma pestaña también actualicen
      window.dispatchEvent(new Event("storage"));
    } catch {
      // Si falla, intenta con datos del localStorage
      const nombre = localStorage.getItem("nombre") || "";
      const email  = localStorage.getItem("email")  || "";
      const rol    = localStorage.getItem("rol")    || "admin";
      const id     = localStorage.getItem("userId") || "";
      setUsuario({ _id: id, nombre, email, rol, estatus: "activo" });
      setNombre(nombre);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPerfil(); }, []);

  /* ── Guardar nombre ── */
  const guardarNombre = async () => {
    if (!nombre.trim()) {
      showToast(setToastNombre, { tipo: "error", msg: "El nombre no puede estar vacío." });
      return;
    }
    if (nombre.trim() === usuario?.nombre) {
      showToast(setToastNombre, { tipo: "error", msg: "No realizaste ningún cambio." });
      return;
    }
    setSavingNombre(true);
    try {
      if (!usuario?._id) throw new Error("Sin ID de usuario");
      await updateUsuario(usuario._id, { nombre: nombre.trim() });
      localStorage.setItem("nombre", nombre.trim());
      setUsuario(prev => prev ? { ...prev, nombre: nombre.trim() } : prev);
      showToast(setToastNombre, { tipo: "success", msg: "Nombre actualizado correctamente." });
    } catch (err: any) {
      showToast(setToastNombre, { tipo: "error", msg: err.response?.data?.error || "Error al actualizar nombre." });
    } finally {
      setSavingNombre(false);
    }
  };

  /* ── Cambiar contraseña ── */
  const cambiarPassword = async () => {
    if (!passActual || !passNueva || !passConfirm) {
      showToast(setToastPass, { tipo: "error", msg: "Completa todos los campos." }); return;
    }
    if (passNueva.length < 8) {
      showToast(setToastPass, { tipo: "error", msg: "La nueva contraseña debe tener mínimo 8 caracteres." }); return;
    }
    if (passNueva !== passConfirm) {
      showToast(setToastPass, { tipo: "error", msg: "Las contraseñas nuevas no coinciden." }); return;
    }
    setSavingPass(true);
    try {
      await changePassword(passActual, passNueva);
      setPassActual(""); setPassNueva(""); setPassConfirm("");
      showToast(setToastPass, { tipo: "success", msg: "Contraseña actualizada. Usa la nueva en tu próximo inicio de sesión." });
    } catch (err: any) {
      showToast(setToastPass, { tipo: "error", msg: err.response?.data?.error || "Error al cambiar contraseña." });
    } finally {
      setSavingPass(false);
    }
  };

  /* ── Subir imagen de perfil ── */
  const subirImagen = async (file: File) => {
    setUploadingImg(true);
    try {
      await uploadProfileImage(file);
      await fetchPerfil();
      showToast(setToastNombre, { tipo: "success", msg: "Foto de perfil actualizada." });
    } catch {
      showToast(setToastNombre, { tipo: "error", msg: "Error al subir la imagen." });
    } finally {
      setUploadingImg(false);
    }
  };

  const eliminarImagen = async () => {
    setUploadingImg(true);
    try {
      await deleteProfileImage();
      await fetchPerfil();
      showToast(setToastNombre, { tipo: "success", msg: "Foto eliminada." });
    } catch {
      showToast(setToastNombre, { tipo: "error", msg: "Error al eliminar la imagen." });
    } finally {
      setUploadingImg(false);
    }
  };

  /* ════════════════ RENDER ════════════════ */
  return (
    <div className="perfil-container">
      <NavSidebar rol={rolActual as "admin" | "superadmin"} />
      <div className="perfil-main">

        {/* ── Header ── */}
        <PageTopbar
          title="Mi Perfil"
          showDownload={false}
        />

        <div className="perfil-content">
          {loading ? (
            <p style={{ color: "var(--gray-400)", fontFamily: "var(--font-sans)", padding: 24 }}>Cargando perfil…</p>
          ) : (
            <div className="perfil-grid">

              {/* ══ Columna izquierda: avatar + info ══ */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Avatar card */}
                <div className="perfil-card perfil-avatar-card">
                  <div className="perfil-avatar-ring">
                    <ImageUploader
                      currentImage={usuario?.imagenPerfil}
                      placeholder={
                        <div className="perfil-avatar-placeholder" style={{ width: "100%", height: "100%", border: "none" }}>
                          {usuario ? iniciales(usuario.nombre) : "?"}
                        </div>
                      }
                      onUpload={subirImagen}
                      onDelete={eliminarImagen}
                      uploading={uploadingImg}
                      shape="circle"
                      size={96}
                    />
                  </div>
                  <p className="perfil-nombre">{usuario?.nombre}</p>
                  <p className="perfil-email">{usuario?.email}</p>
                  <span className={`perfil-rol-badge ${esSuperAdmin ? "perfil-rol-superadmin" : "perfil-rol-admin"}`}>
                    {rolLabel[usuario?.rol || "admin"] || usuario?.rol}
                  </span>
                </div>

                {/* Info card */}
                <div className="perfil-card">
                  <div className="perfil-info-list">
                    <div className="perfil-info-item">
                      <div className="perfil-info-icon"><Shield size={15} /></div>
                      <div>
                        <span className="perfil-info-label">Estatus</span>
                        <span className={`perfil-estatus ${usuario?.estatus === "activo" ? "perfil-estatus-activo" : ""}`}>
                          {usuario?.estatus === "activo" ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </div>
                    <div className="perfil-info-item">
                      <div className="perfil-info-icon"><Calendar size={15} /></div>
                      <div>
                        <span className="perfil-info-label">Miembro desde</span>
                        <span className="perfil-info-value">{formatFecha(usuario?.fechaCreacion)}</span>
                      </div>
                    </div>
                    <div className="perfil-info-item">
                      <div className="perfil-info-icon"><Clock size={15} /></div>
                      <div>
                        <span className="perfil-info-label">Último acceso</span>
                        <span className="perfil-info-value">{formatFechaHora(usuario?.ultimoLogin)}</span>
                      </div>
                    </div>
                    <div className="perfil-info-item">
                      <div className="perfil-info-icon"><Mail size={15} /></div>
                      <div>
                        <span className="perfil-info-label">Correo</span>
                        <span className="perfil-info-value" style={{ fontSize: "0.82rem", wordBreak: "break-word" }}>{usuario?.email}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ══ Columna derecha: formularios ══ */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* ── Datos personales ── */}
                <div className="perfil-card">
                  <div className="perfil-section-title">
                    <User size={16} />
                    <h2>Datos personales</h2>
                  </div>

                  <div className="perfil-form">
                    <div className="perfil-field">
                      <label>Nombre completo</label>
                      <input
                        className="perfil-input"
                        type="text"
                        value={nombre}
                        onChange={e => setNombre(e.target.value)}
                        placeholder="Tu nombre completo"
                      />
                    </div>
                    <div className="perfil-field">
                      <label>Correo electrónico <span>(no editable)</span></label>
                      <input
                        className="perfil-input"
                        type="email"
                        value={usuario?.email || ""}
                        readOnly
                      />
                    </div>
                    <div className="perfil-field">
                      <label>Rol <span>(asignado por el sistema)</span></label>
                      <input
                        className="perfil-input"
                        type="text"
                        value={rolLabel[usuario?.rol || ""] || usuario?.rol || ""}
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="perfil-form-footer">
                    {toastNombre && (
                      <div className={`perfil-toast perfil-toast-${toastNombre.tipo}`}>
                        {toastNombre.tipo === "success"
                          ? <Check size={14} />
                          : <AlertCircle size={14} />}
                        {toastNombre.msg}
                      </div>
                    )}
                    {!toastNombre && <span />}
                    <button
                      className="perfil-btn-guardar"
                      onClick={guardarNombre}
                      disabled={savingNombre || nombre.trim() === usuario?.nombre}
                    >
                      <Save size={14} />
                      {savingNombre ? "Guardando…" : "Guardar cambios"}
                    </button>
                  </div>
                </div>

                {/* ── Cambiar contraseña ── */}
                <div className="perfil-card">
                  <div className="perfil-section-title">
                    <KeyRound size={16} />
                    <h2>Cambiar contraseña</h2>
                  </div>

                  <div className="perfil-form">
                    <div className="perfil-field">
                      <label>Contraseña actual *</label>
                      <input
                        className="perfil-input"
                        type="password"
                        value={passActual}
                        onChange={e => setPassActual(e.target.value)}
                        placeholder="Tu contraseña actual"
                        autoComplete="current-password"
                      />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div className="perfil-field">
                        <label>Nueva contraseña *</label>
                        <input
                          className="perfil-input"
                          type="password"
                          value={passNueva}
                          onChange={e => setPassNueva(e.target.value)}
                          placeholder="Mínimo 8 caracteres"
                          autoComplete="new-password"
                        />
                      </div>
                      <div className="perfil-field">
                        <label>Confirmar contraseña *</label>
                        <input
                          className="perfil-input"
                          type="password"
                          value={passConfirm}
                          onChange={e => setPassConfirm(e.target.value)}
                          placeholder="Repite la nueva contraseña"
                          autoComplete="new-password"
                        />
                      </div>
                    </div>

                    {/* Indicador de fortaleza */}
                    {passNueva && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {[1, 2, 3, 4].map(n => (
                          <div key={n} style={{
                            flex: 1, height: 4, borderRadius: 4,
                            background: passNueva.length >= n * 2
                              ? (passNueva.length >= 10 ? "var(--green-500)"
                                : passNueva.length >= 8 ? "var(--yellow-500)"
                                : "var(--red-500)")
                              : "var(--gray-200)",
                            transition: "background .3s",
                          }} />
                        ))}
                        <span style={{ fontSize: "0.72rem", color: "var(--gray-400)", whiteSpace: "nowrap" }}>
                          {passNueva.length < 8 ? "Muy corta"
                            : passNueva.length < 10 ? "Aceptable"
                            : "Fuerte"}
                        </span>
                      </div>
                    )}

                    {/* Coincidencia */}
                    {passConfirm && (
                      <p style={{ fontSize: "0.78rem", margin: 0, display: "flex", alignItems: "center", gap: 5,
                        color: passNueva === passConfirm ? "var(--green-600)" : "var(--red-600)" }}>
                        {passNueva === passConfirm
                          ? <><Check size={13} /> Las contraseñas coinciden</>
                          : <><AlertCircle size={13} /> Las contraseñas no coinciden</>
                        }
                      </p>
                    )}
                  </div>

                  <div className="perfil-form-footer">
                    {toastPass && (
                      <div className={`perfil-toast perfil-toast-${toastPass.tipo}`}>
                        {toastPass.tipo === "success"
                          ? <Check size={14} />
                          : <AlertCircle size={14} />}
                        {toastPass.msg}
                      </div>
                    )}
                    {!toastPass && <span />}
                    <button
                      className="perfil-btn-guardar"
                      onClick={cambiarPassword}
                      disabled={savingPass}
                    >
                      <KeyRound size={14} />
                      {savingPass ? "Actualizando…" : "Cambiar contraseña"}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Perfil;