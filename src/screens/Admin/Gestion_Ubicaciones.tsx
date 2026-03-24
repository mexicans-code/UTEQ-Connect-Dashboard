import React, { useState, useEffect, useMemo } from "react";
import "../../styles/InicioAdmin.css";
import "../../styles/CardUbicacion.css";
import NavAdmin from "../components/NavAdmin";
import CardUbicacion from "../components/CardUbicacion";
import { Plus, X, MapPin, Search } from "lucide-react";
import ImageUploader from "../../components/ImageUploader";
import api from "../../api/axios";
import ConfirmModal from "../../components/ConfirmModal";

interface Ubicacion {
  _id: string;
  nombre: string;
  posicion: { latitude: number; longitude: number };
  image?: string;
}

interface FormData {
  nombre: string;
  latitude: string;
  longitude: string;
}

const EMPTY_FORM: FormData = { nombre: "", latitude: "", longitude: "" };

/* Imagen placeholder cuando la ubicación no tiene foto */
const PLACEHOLDER = "https://via.placeholder.com/400x200?text=Sin+imagen";

const Gestion_Ubicaciones: React.FC = () => {
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [activeId, setActiveId]       = useState<string | null>(null);

  const [showModal, setShowModal]   = useState(false);
  const [isEditing, setIsEditing]   = useState(false);
  const [actual, setActual]         = useState<Ubicacion | null>(null);
  const [formData, setFormData]     = useState<FormData>(EMPTY_FORM);
  const [modalError, setModalError] = useState("");
  const [saving, setSaving]         = useState(false);
  const [confirmOpen, setConfirmOpen]   = useState(false);
  const [confirmMsg, setConfirmMsg]     = useState("");
  const [confirmFn, setConfirmFn]       = useState<() => void>(() => () => {});
  const confirmar = (msg: string, fn: () => void) => { setConfirmMsg(msg); setConfirmFn(() => fn); setConfirmOpen(true); };
  const [uploadingImg, setUploadingImg] = useState(false);
  const [busqueda, setBusqueda]         = useState("");
  const [ubicEnMapa, setUbicEnMapa]     = useState<Ubicacion | null>(null);

  /* ── Fetch del servidor ── */
  const fetchUbicaciones = async () => {
    setLoading(true); setError("");
    try {
      const res = await api.get("/locations");
      const raw = res.data;
      setUbicaciones(Array.isArray(raw) ? raw : (raw.data ?? []));
    } catch { setError("Error al cargar ubicaciones."); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUbicaciones(); }, []);

  const ubicacionesFiltradas = useMemo(() =>
    ubicaciones.filter(u => !busqueda || u.nombre.toLowerCase().includes(busqueda.toLowerCase())),
    [ubicaciones, busqueda]
  );

  const mapaUrl = ubicEnMapa
    ? `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d1000!2d${ubicEnMapa.posicion.longitude}!3d${ubicEnMapa.posicion.latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1ses!2smx!4v1`
    : `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d29870.07649894674!2d-100.43341862501377!3d20.63865497852324!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85d35a486363880d%3A0xd927286fe3c75218!2sUTEQ!5e0!3m2!1ses!2smx!4v1`;

  /* ── Modal ── */
  const abrirAgregar = () => {
    setIsEditing(false); setActual(null);
    setFormData(EMPTY_FORM); setModalError(""); setShowModal(true);
  };

  const abrirEditar = (u: Ubicacion) => {
    setIsEditing(true); setActual(u);
    setFormData({
      nombre: u.nombre,
      latitude: String(u.posicion.latitude),
      longitude: String(u.posicion.longitude),
    });
    setModalError(""); setShowModal(true);
  };

  const cerrarModal = () => { setShowModal(false); setModalError(""); };

  const validar = (): string | null => {
    if (!formData.nombre.trim()) return "El nombre es obligatorio.";
    if (!isEditing) {
      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);
      if (isNaN(lat) || lat < -90  || lat > 90)  return "Latitud inválida (−90 a 90).";
      if (isNaN(lng) || lng < -180 || lng > 180) return "Longitud inválida (−180 a 180).";
    }
    return null;
  };

  const guardar = async () => {
    const err = validar();
    if (err) { setModalError(err); return; }
    setSaving(true); setModalError("");
    const body = isEditing
      ? { nombre: formData.nombre.trim() }
      : {
          nombre: formData.nombre.trim(),
          posicion: {
            latitude:  parseFloat(formData.latitude),
            longitude: parseFloat(formData.longitude),
          },
        };
    try {
      if (isEditing && actual) {
        await api.put(`/locations/${actual._id}`, body);
      } else {
        await api.post("/locations", body);
      }
      cerrarModal(); fetchUbicaciones();
    } catch (e: any) {
      setModalError(e.response?.data?.error || "Error al guardar.");
    } finally { setSaving(false); }
  };

  const eliminar = async (u: Ubicacion) => {
    confirmar(`¿Eliminar "${u.nombre}"? Esta acción no se puede deshacer.`, async () => {
      try {
        await api.delete(`/locations/${u._id}`);
        if (activeId === u._id) setActiveId(null);
        fetchUbicaciones();
      } catch { setModalError("Error al eliminar ubicación."); }
    });
  };

  /* ── Card click: seleccionar / abrir edición ── */
  const handleCardClick = (u: Ubicacion) => {
    setActiveId(prev => (prev === u._id ? null : u._id));
    setUbicEnMapa(u);
  };

  const subirImagenUbicacion = async (id: string, file: File) => {
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      await api.post(`/locations/${id}/image`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      fetchUbicaciones();
    } catch { setModalError("Error al subir la imagen."); }
    finally { setUploadingImg(false); }
  };

  const eliminarImagenUbicacion = async (id: string) => {
    setUploadingImg(true);
    try {
      await api.delete(`/locations/${id}/image`);
      fetchUbicaciones();
    } catch { setModalError("Error al eliminar la imagen."); }
    finally { setUploadingImg(false); }
  };

  return (
    <div className="admin-container">
      <NavAdmin />

      <div className="main-content">
        {/* ── Header ── */}
        <header className="topbar" style={{
          background: "linear-gradient(135deg, var(--blue-700) 0%, var(--blue-800) 100%)",
          padding: "18px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0,0,0,.12)",
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>Gestión de Ubicaciones</h1>
            <p style={{ margin: "3px 0 0", color: "rgba(255,255,255,.55)", fontSize: "0.8rem", fontWeight: 400 }}>
              {ubicaciones.length} ubicación(es) registrada(s)
            </p>
          </div>
          <button
            onClick={abrirAgregar}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,.15)", color: "#fff",
              border: "1.5px solid rgba(255,255,255,.3)",
              padding: "9px 18px", borderRadius: "var(--radius-md)",
              fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
              fontFamily: "var(--font-sans)", transition: "all .2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.25)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.15)")}
          >
            <Plus size={16} /> Agregar Ubicación
          </button>
        </header>

        <div className="content-area" style={{ overflowY: "auto" }}>

          {/* ── Mapa ── */}
          <div style={{ margin: "16px 20px 0", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,.1)", height: 220 }}>
            <iframe
              key={ubicEnMapa?._id ?? "default"}
              title="Mapa Ubicaciones UTEQ"
              src={mapaUrl}
              style={{ width: "100%", height: "100%", border: "none", display: "block" }}
              allowFullScreen
              loading="lazy"
            />
          </div>

          {ubicEnMapa && (
            <p style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--gray-400)", margin: "6px 0 0", fontFamily: "var(--font-sans)" }}>
              <MapPin size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
              Mostrando: <strong>{ubicEnMapa.nombre}</strong> — haz clic en una tarjeta para centrar el mapa
            </p>
          )}

          {/* ── Buscador ── */}
          <div style={{ margin: "14px 20px 0", display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 380 }}>
              <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", pointerEvents: "none" }} />
              <input
                type="text"
                placeholder="Buscar ubicación…"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ width: "100%", padding: "9px 12px 9px 34px", boxSizing: "border-box", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", fontFamily: "var(--font-sans)", color: "var(--gray-800)", background: "var(--white)", outline: "none" }}
                onFocus={e => { e.target.style.borderColor = "var(--blue-400)"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,.1)"; }}
                onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
            {busqueda && (
              <button onClick={() => setBusqueda("")} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "1.5px solid var(--border)", color: "var(--gray-500)", padding: "7px 12px", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "0.82rem", fontFamily: "var(--font-sans)" }}>
                <X size={13} /> Limpiar
              </button>
            )}
            <span style={{ color: "var(--gray-400)", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
              {ubicacionesFiltradas.length} de {ubicaciones.length}
            </span>
          </div>

          {/* ── Error ── */}
          {error && (
            <div style={{
              margin: "14px 20px 0",
              color: "var(--red-600)", background: "var(--red-50)",
              border: "1px solid rgba(220,38,38,.15)",
              padding: "10px 14px", borderRadius: "var(--radius-md)", fontSize: "0.875rem",
            }}>
              {error}
            </div>
          )}

          {/* ── Loading ── */}
          {loading && (
            <p style={{ color: "var(--gray-400)", padding: 32, fontFamily: "var(--font-sans)", textAlign: "center" }}>
              Cargando ubicaciones…
            </p>
          )}

          {/* ── Empty ── */}
          {!loading && ubicaciones.length === 0 && !error && (
            <div style={{ textAlign: "center", padding: "56px 24px", color: "var(--gray-400)", fontFamily: "var(--font-sans)" }}>
              <MapPin size={40} style={{ margin: "0 auto 14px", display: "block", opacity: .3 }} />
              <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--gray-500)", margin: "0 0 6px" }}>Sin ubicaciones registradas</p>
              <p style={{ fontSize: "0.84rem", margin: 0 }}>Pulsa «Agregar Ubicación» para crear la primera.</p>
            </div>
          )}

          {/* ── Grid de cards ── */}
          {!loading && ubicaciones.length > 0 && (
            <div className="cards-grid">
              {ubicacionesFiltradas.map(u => (
                <div key={u._id} style={{ position: "relative" }}>
                  <CardUbicacion
                    titulo={u.nombre}
                    descripcion={`${u.posicion.latitude.toFixed(5)}, ${u.posicion.longitude.toFixed(5)}`}
                    img={u.image || PLACEHOLDER}
                    active={activeId === u._id}
                    onClick={() => handleCardClick(u)}
                  />

                  {/* Botones de acción que aparecen al seleccionar */}
                  {activeId === u._id && (
                    <div style={{
                      position: "absolute", bottom: 0, left: 0, right: 0,
                      background: "linear-gradient(to top, rgba(15,23,42,.85) 0%, transparent 100%)",
                      borderBottomLeftRadius: "var(--radius-lg)",
                      borderBottomRightRadius: "var(--radius-lg)",
                      padding: "20px 14px 14px",
                      display: "flex", gap: 8, justifyContent: "flex-end",
                      animation: "fadeIn .15s ease",
                    }}>
                      <button
                        onClick={e => { e.stopPropagation(); abrirEditar(u); }}
                        style={{
                          background: "rgba(255,255,255,.9)", color: "var(--blue-700)",
                          border: "none", borderRadius: "var(--radius-sm)",
                          padding: "6px 14px", fontSize: "0.78rem", fontWeight: 700,
                          cursor: "pointer", fontFamily: "var(--font-sans)",
                          transition: "all .15s",
                        }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); eliminar(u); }}
                        style={{
                          background: "rgba(239,68,68,.85)", color: "#fff",
                          border: "none", borderRadius: "var(--radius-sm)",
                          padding: "6px 14px", fontSize: "0.78rem", fontWeight: 700,
                          cursor: "pointer", fontFamily: "var(--font-sans)",
                          transition: "all .15s",
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══ Modal ══ */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(15,23,42,.5)", backdropFilter: "blur(4px)",
          display: "flex", justifyContent: "center", alignItems: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "var(--white)", width: 440, maxWidth: "95vw",
            borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xl)",
            overflow: "hidden",
          }}>
            {/* Header modal */}
            <div style={{
              background: "linear-gradient(135deg, var(--blue-700), var(--blue-800))",
              padding: "18px 24px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <h2 style={{ color: "#fff", margin: 0, fontSize: "1rem", fontWeight: 700 }}>
                {isEditing ? "Editar Ubicación" : "Agregar Ubicación"}
              </h2>
              <button
                onClick={cerrarModal}
                style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: "var(--radius-sm)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={17} />
              </button>
            </div>

            {/* Body modal */}
            <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--gray-600)", textTransform: "uppercase", letterSpacing: ".4px", display: "block", marginBottom: 5 }}>
                  Nombre *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Biblioteca UTEQ"
                  value={formData.nombre}
                  onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.9rem", fontFamily: "var(--font-sans)", color: "var(--gray-800)", background: "var(--white)", outline: "none", boxSizing: "border-box" }}
                  onFocus={e => { e.target.style.borderColor = "var(--blue-400)"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,.12)"; }}
                  onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                />
              </div>

              {!isEditing && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--gray-600)", textTransform: "uppercase", letterSpacing: ".4px", display: "block", marginBottom: 5 }}>
                      Latitud *
                    </label>
                    <input
                      type="number" step="any"
                      placeholder="Ej. 20.65485"
                      value={formData.latitude}
                      onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                      style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.9rem", fontFamily: "var(--font-sans)", color: "var(--gray-800)", background: "var(--white)", outline: "none", boxSizing: "border-box" }}
                      onFocus={e => { e.target.style.borderColor = "var(--blue-400)"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,.12)"; }}
                      onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--gray-600)", textTransform: "uppercase", letterSpacing: ".4px", display: "block", marginBottom: 5 }}>
                      Longitud *
                    </label>
                    <input
                      type="number" step="any"
                      placeholder="Ej. -100.40379"
                      value={formData.longitude}
                      onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                      style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.9rem", fontFamily: "var(--font-sans)", color: "var(--gray-800)", background: "var(--white)", outline: "none", boxSizing: "border-box" }}
                      onFocus={e => { e.target.style.borderColor = "var(--blue-400)"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,.12)"; }}
                      onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                    />
                  </div>
                </div>
              )}

              {isEditing && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--gray-600)", textTransform: "uppercase", letterSpacing: ".4px", display: "block", marginBottom: 5 }}>Latitud</label>
                    <input value={formData.latitude} readOnly disabled style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.9rem", fontFamily: "var(--font-sans)", color: "var(--gray-400)", background: "var(--gray-100)", outline: "none", boxSizing: "border-box", cursor: "not-allowed" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--gray-600)", textTransform: "uppercase", letterSpacing: ".4px", display: "block", marginBottom: 5 }}>Longitud</label>
                    <input value={formData.longitude} readOnly disabled style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.9rem", fontFamily: "var(--font-sans)", color: "var(--gray-400)", background: "var(--gray-100)", outline: "none", boxSizing: "border-box", cursor: "not-allowed" }} />
                  </div>
                </div>
              )}

              {isEditing && actual && (
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--gray-600)", textTransform: "uppercase", letterSpacing: ".4px", display: "block", marginBottom: 5 }}>Imagen</label>
                  <ImageUploader
                    currentImage={actual.image}
                    placeholder={<MapPin size={28} color="var(--blue-400)" />}
                    onUpload={file => subirImagenUbicacion(actual._id, file)}
                    onDelete={() => eliminarImagenUbicacion(actual._id)}
                    uploading={uploadingImg}
                    shape="rect"
                    size={120}
                  />
                </div>
              )}

              {isEditing && (
                <p style={{ fontSize: "0.76rem", color: "var(--gray-400)", background: "var(--gray-50)", border: "1px solid var(--gray-200)", padding: "8px 12px", borderRadius: "var(--radius-sm)", margin: 0 }}>
                  📍 Las coordenadas no se pueden modificar desde el dashboard.
                </p>
              )}

              {modalError && (
                <p style={{ color: "var(--red-600)", fontSize: "0.84rem", margin: 0, padding: "8px 12px", background: "var(--red-50)", border: "1px solid rgba(220,38,38,.15)", borderRadius: "var(--radius-sm)" }}>
                  {modalError}
                </p>
              )}
            </div>

            {/* Footer modal */}
            <div style={{ padding: "14px 24px 18px", display: "flex", justifyContent: "flex-end", gap: 10, background: "var(--gray-50)", borderTop: "1px solid var(--border)" }}>
              <button
                onClick={cerrarModal}
                style={{ background: "var(--gray-100)", color: "var(--gray-700)", border: "1.5px solid var(--border)", padding: "9px 18px", borderRadius: "var(--radius-sm)", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-sans)" }}
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={saving}
                style={{ background: "var(--blue-600)", color: "#fff", border: "none", padding: "9px 22px", borderRadius: "var(--radius-sm)", fontSize: "0.875rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "var(--font-sans)", opacity: saving ? .55 : 1 }}
              >
                {saving ? "Guardando…" : isEditing ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      <ConfirmModal
        open={confirmOpen}
        mensaje={confirmMsg}
        onConfirm={() => { setConfirmOpen(false); confirmFn(); }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};

export default Gestion_Ubicaciones;