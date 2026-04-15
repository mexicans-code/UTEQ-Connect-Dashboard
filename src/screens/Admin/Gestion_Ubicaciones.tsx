import React, { useState, useEffect, useMemo, useRef } from "react";
import "../../styles/CardUbicacion.css";
import NavSidebar from "../components/NavSidebar.tsx";
import PageTopbar from "../components/PageTopbar.tsx";
import CardUbicacion from "../components/CardUbicacion.tsx";
import { X, MapPin, Search } from "lucide-react";
import ImageUploader from "../components/ImageUploader.tsx";
import { getLocations, updateLocation, uploadLocationImage, deleteLocationImage } from "../../api/locations.ts";
import ConfirmModal from "../components/ConfirmModal.tsx";
import { exportEdificiosPDF } from "../../utils/pdfExport";
import { notifyLocal } from "../../utils/notify.ts";
import FormField from "../components/ui/FormField.tsx";
import AppModal from "../components/shared/AppModal.tsx";
import { useConfirm } from "../../hooks/useConfirm.ts";
import { FIELD_LIMITS, validateField } from "../../utils/fieldLimits";

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

interface FormErrors {
  nombre?: string;
}

const EMPTY_FORM: FormData = { nombre: "", latitude: "", longitude: "" };
const PLACEHOLDER = "https://via.placeholder.com/400x200?text=Sin+imagen";

const Gestion_Ubicaciones: React.FC = () => {
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [activeId, setActiveId]       = useState<string | null>(null);

  const [showModal, setShowModal]   = useState(false);
  const [actual, setActual]         = useState<Ubicacion | null>(null);
  const [formData, setFormData]     = useState<FormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [modalError, setModalError] = useState("");
  const [saving, setSaving]         = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [busqueda, setBusqueda]         = useState("");
  const [ubicEnMapa, setUbicEnMapa]     = useState<Ubicacion | null>(null);

  const confirm = useConfirm();

  const refNombre    = useRef<HTMLDivElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  const fetchUbicaciones = async () => {
    setLoading(true); setError("");
    try {
      const raw = await getLocations();
      setUbicaciones(raw.map(l => ({ _id: l._id, nombre: l.nombre, posicion: l.posicion ?? { latitude: 0, longitude: 0 }, image: l.image })) as Ubicacion[]);
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

  const abrirEditar = (u: Ubicacion) => {
    setActual(u);
    setFormData({ nombre: u.nombre, latitude: String(u.posicion.latitude), longitude: String(u.posicion.longitude) });
    setFormErrors({}); setModalError(""); setShowModal(true);
  };

  const cerrarModal = () => { setShowModal(false); setFormErrors({}); setModalError(""); };

  const validar = (): boolean => {
    const errors: FormErrors = {};
    const errNombre = validateField(formData.nombre, FIELD_LIMITS.nombreEspacio);
    if (errNombre) errors.nombre = errNombre;
    setFormErrors(errors);
    if (errors.nombre) {
      setTimeout(() => {
        refNombre.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        (refNombre.current?.querySelector("input") as HTMLElement | null)?.focus();
      }, 50);
      return false;
    }
    return true;
  };

  const guardar = async () => {
    if (!validar()) return;
    if (!actual) { setModalError("Selecciona una ubicación antes de guardar."); return; }
    setSaving(true); setModalError("");
    const body = { nombre: formData.nombre.trim() };
    try {
      await updateLocation(actual._id, body);
      cerrarModal(); fetchUbicaciones();
      notifyLocal("Ubicación actualizada", `"${body.nombre}" fue actualizada correctamente.`);
    } catch (e: any) {
      setModalError(e.response?.data?.error || "Error al guardar.");
    } finally { setSaving(false); }
  };

  const handleCardClick = (u: Ubicacion) => {
    setActiveId(prev => (prev === u._id ? null : u._id));
    setUbicEnMapa(u);
  };

  const subirImagenUbicacion = async (id: string, file: File) => {
    setUploadingImg(true);
    try {
      await uploadLocationImage(id, file);
      fetchUbicaciones();
    } catch { setModalError("Error al subir la imagen."); }
    finally { setUploadingImg(false); }
  };

  const eliminarImagenUbicacion = async (id: string) => {
    setUploadingImg(true);
    try {
      await deleteLocationImage(id);
      fetchUbicaciones();
    } catch { setModalError("Error al eliminar la imagen."); }
    finally { setUploadingImg(false); }
  };

  return (
    <div className="admin-container">
      <NavSidebar rol="admin" />

      <div className="main-content">
        <PageTopbar
          title="Gestión de Ubicaciones"
          subtitle={`${ubicaciones.length} ubicación(es) registrada(s)`}
          onDownloadPDF={() => exportEdificiosPDF(ubicaciones)}
        />

        <div className="content-area" style={{ overflowY: "auto" }}>

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

          <div style={{ margin: "14px 20px 0", display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 380 }}>
              <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", pointerEvents: "none" }} />
              {/* ✅ background: var(--white) → var(--bg-input) | color: var(--gray-800) → var(--text-primary) */}
              <input
                type="text"
                placeholder="Buscar ubicación…"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ width: "100%", padding: "9px 12px 9px 34px", boxSizing: "border-box", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", fontFamily: "var(--font-sans)", color: "var(--text-primary)", background: "var(--bg-input)", outline: "none" }}
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

          {loading && (
            <p style={{ color: "var(--gray-400)", padding: 32, fontFamily: "var(--font-sans)", textAlign: "center" }}>
              Cargando ubicaciones…
            </p>
          )}

          {!loading && ubicaciones.length === 0 && !error && (
            <div style={{ textAlign: "center", padding: "56px 24px", color: "var(--gray-400)", fontFamily: "var(--font-sans)" }}>
              <MapPin size={40} style={{ margin: "0 auto 14px", display: "block", opacity: .3 }} />
              <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--gray-500)", margin: "0 0 6px" }}>Sin ubicaciones registradas</p>
            </div>
          )}

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
                      {/* ✅ rgba(255,255,255,.9) → var(--bg-card) */}
                      <button data-action
                        onClick={e => { e.stopPropagation(); abrirEditar(u); }}
                        style={{ background: "var(--bg-card)", color: "var(--blue-700)", border: "none", borderRadius: "var(--radius-sm)", padding: "6px 14px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", transition: "all .15s" }}
                      >
                        Editar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AppModal
        open={showModal}
        titulo="Editar Ubicación"
        onClose={cerrarModal}
        onSave={guardar}
        saving={saving}
        saveText="Actualizar"
        bodyRef={modalBodyRef}
      >
        <FormField
          label="Nombre *"
          limits={FIELD_LIMITS.nombreEspacio}
          value={formData.nombre}
          error={formErrors.nombre}
          containerRef={refNombre}
          isAdmin
        >
          {/* ✅ #f87171 → var(--red-600) | var(--white) → var(--bg-input) | var(--gray-800) → var(--text-primary) */}
          <input
            type="text"
            placeholder="Ej. Biblioteca UTEQ"
            value={formData.nombre}
            maxLength={FIELD_LIMITS.nombreEspacio.max}
            onChange={e => {
              setFormData({ ...formData, nombre: e.target.value });
              if (formErrors.nombre) setFormErrors({});
            }}
            style={{
              width: "100%", padding: "10px 14px", boxSizing: "border-box",
              border: `1.5px solid ${formErrors.nombre ? "var(--red-600)" : "var(--border)"}`,
              borderRadius: "var(--radius-sm)", fontSize: "0.9rem",
              fontFamily: "var(--font-sans)", color: "var(--text-primary)",
              background: "var(--bg-input)", outline: "none",
            }}
          />
        </FormField>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--gray-600)", display: "block", marginBottom: 5 }}>Latitud</label>
            <input value={formData.latitude} readOnly disabled style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.9rem", color: "var(--gray-400)", background: "var(--gray-100)", outline: "none", boxSizing: "border-box", cursor: "not-allowed" }} />
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--gray-600)", display: "block", marginBottom: 5 }}>Longitud</label>
            <input value={formData.longitude} readOnly disabled style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.9rem", color: "var(--gray-400)", background: "var(--gray-100)", outline: "none", boxSizing: "border-box", cursor: "not-allowed" }} />
          </div>
        </div>

        {actual && (
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--gray-600)", display: "block", marginBottom: 5 }}>Imagen</label>
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

        <p style={{ fontSize: "0.76rem", color: "var(--gray-400)", background: "var(--gray-50)", border: "1px solid var(--gray-200)", padding: "8px 12px", borderRadius: "var(--radius-sm)", margin: 0 }}>
          📍 Las coordenadas no se pueden modificar desde el dashboard.
        </p>

        {modalError && (
          <p style={{ color: "var(--red-600)", fontSize: "0.84rem", margin: 0, padding: "8px 12px", background: "var(--red-50)", border: "1px solid rgba(220,38,38,.15)", borderRadius: "var(--radius-sm)" }}>
            {modalError}
          </p>
        )}
      </AppModal>

      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>

      <ConfirmModal
        open={confirm.open}
        mensaje={confirm.mensaje}
        onConfirm={confirm.ejecutar}
        onCancel={confirm.cancelar}
      />
    </div>
  );
};

export default Gestion_Ubicaciones;