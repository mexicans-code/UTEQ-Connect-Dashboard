import React, { useState, useEffect, useMemo } from "react";
import "../../styles/EdificiosRutas.css";
import "../../styles/tabla.css";
import NavSidebar from "../components/NavSidebar";
import PageTopbar from "../components/PageTopbar";
import { Pencil, X, Search, MapPin } from "lucide-react";
import ImageUploader from "../components/ImageUploader.tsx";
import { notifyLocal } from "../../utils/notify.ts";
import { getLocations, updateLocation, uploadLocationImage, deleteLocationImage } from "../../api/locations";
import ConfirmModal from "../components/ConfirmModal.tsx";
import Paginacion from "../components/Paginacion.tsx";
import { exportEdificiosPDF } from "../../utils/pdfExport";
import AppModal from "../components/shared/AppModal";
import { useConfirm } from "../../hooks/useConfirm";
import FormField from "../components/ui/FormField";
import { FIELD_LIMITS, validateField } from "../../utils/fieldLimits";

interface Destino {
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

const EdificiosRutas: React.FC = () => {
  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [busqueda, setBusqueda] = useState("");

  const [showModal, setShowModal]       = useState(false);
  const [actual, setActual]              = useState<Destino | null>(null);
  const [formData, setFormData]          = useState<FormData>(EMPTY_FORM);
  const [modalError, setModalError]      = useState("");
  const [saving, setSaving]              = useState(false);
  const [pagina, setPagina]           = useState(1);
  const POR_PAGINA = 10;
  const [uploadingImg, setUploadingImg] = useState(false);

  // ✅ useConfirm en vez de 4 useState manuales
  const confirm = useConfirm();

  const fetchDestinos = async () => {
    setLoading(true); setError("");
    try {
      // ✅ api (axios compartido) en vez de apiFetch local
      const lista = await getLocations();
      setDestinos(lista.map(l => ({ _id: l._id, nombre: l.nombre, posicion: l.posicion ?? { latitude: 0, longitude: 0 }, image: l.image })) as Destino[]);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || "Error al cargar ubicaciones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDestinos(); }, []);

  const destinosFiltrados = useMemo(() => {
    return destinos.filter(d => !busqueda || d.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  }, [destinos, busqueda]);

  useEffect(() => { setPagina(1); }, [busqueda]);

  const destinosPagina = useMemo(() => destinosFiltrados.slice((pagina-1)*POR_PAGINA, pagina*POR_PAGINA), [destinosFiltrados, pagina]);

  const abrirEditar = (d: Destino) => {
    setActual(d);
    setFormData({ nombre: d.nombre, latitude: String(d.posicion.latitude), longitude: String(d.posicion.longitude) });
    setModalError(""); setShowModal(true);
  };

  const cerrarModal = () => { setShowModal(false); setModalError(""); };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const validar = (): string | null => {
    const err = validateField(formData.nombre, FIELD_LIMITS.nombreEspacio);
    return err ?? null;
  };

  const subirImagenEdificio = async (id: string, file: File) => {
    setUploadingImg(true);
    try {
      await uploadLocationImage(id, file);
      fetchDestinos();
    } catch {
      setModalError("Error al subir la imagen.");
    } finally {
      setUploadingImg(false);
    }
  };

  const eliminarImagenEdificio = async (id: string) => {
    setUploadingImg(true);
    try {
      await deleteLocationImage(id);
      fetchDestinos();
    } catch {
      setModalError("Error al eliminar la imagen.");
    } finally {
      setUploadingImg(false);
    }
  };

  const guardar = async () => {
    const err = validar();
    if (err) { setModalError(err); return; }
    if (!actual) { setModalError("No hay edificio seleccionado para editar."); return; }
    setSaving(true); setModalError("");
    try {
      // ✅ api en vez de apiFetch
      await updateLocation(actual._id, { nombre: formData.nombre.trim() });
      cerrarModal(); fetchDestinos();
      notifyLocal("Edificio actualizado", `"${formData.nombre.trim()}" fue actualizado correctamente.`);
    } catch (e: any) {
      setModalError(e.response?.data?.error || e.message || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="spadmin-container">
      <NavSidebar rol="superadmin" />

      <div className="spadmin-main-content">
        {/* ── Header ── */}
        <PageTopbar
          title="Gestión de Ubicaciones"
          subtitle={`${destinos.length} edificio(s) registrado(s)`}
          onDownloadPDF={() => exportEdificiosPDF(destinos)}
        />

        <div className="spadmin-content-area">

          {/* ── Toolbar ── */}
          <div className="edr-toolbar">
            <div className="edr-search-wrapper">
              <Search size={15} />
              <input
                type="text"
                className="edr-search"
                placeholder="Buscar por nombre…"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
            </div>

            {busqueda && (
              <button className="edr-btn-limpiar" onClick={() => setBusqueda("")}>
                <X size={13} /> Limpiar
              </button>
            )}

            <span className="edr-count">
              {destinosFiltrados.length} de {destinos.length} ubicaciones
            </span>
          </div>

          {/* ── Error ── */}
          {error && <div className="edr-error">{error}</div>}

          {/* ── Tabla ── */}
          {loading ? (
            <p style={{ color: "var(--gray-400)", padding: 24, fontFamily: "var(--font-sans)" }}>
              Cargando ubicaciones...
            </p>
          ) : (
            <div className="ut-table-wrapper">
              <table className="ut-table">
                <thead>
                  <tr>
                    <th style={{ width: 64 }}>Imagen</th>
                    <th>Nombre</th>
                    <th>Latitud</th>
                    <th>Longitud</th>
                    <th style={{ width: 100 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {destinosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="edr-empty">
                          <MapPin size={36} />
                          <p>
                            {destinos.length === 0
                              ? "Sin ubicaciones registradas"
                              : `Sin resultados para "${busqueda}"`}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    destinosPagina.map(d => (
                      <tr key={d._id}>
                        <td>
                          {d.image ? (
                            <img
                              src={d.image}
                              alt={d.nombre}
                              className="edr-img"
                              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <div className="edr-img-placeholder">
                              <MapPin size={18} color="var(--blue-400)" />
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="edr-cell-nombre">
                            <strong>{d.nombre}</strong>
                          </div>
                        </td>
                        <td>
                          <span className="edr-coord">{d.posicion.latitude.toFixed(5)}</span>
                        </td>
                        <td>
                          <span className="edr-coord">{d.posicion.longitude.toFixed(5)}</span>
                        </td>
                        <td>
                          <div className="ut-actions">
                            <button data-action className="ut-btn-icon" onClick={() => abrirEditar(d)} title="Editar">
                              <Pencil size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          <Paginacion total={destinosFiltrados.length} porPagina={POR_PAGINA} paginaActual={pagina} onChange={setPagina} />
        </div>
      </div>

      {/* ✅ AppModal reemplaza el modal-overlay inline */}
      <AppModal
        open={showModal}
        titulo="Editar Ubicación"
        onClose={cerrarModal}
        onSave={guardar}
        saving={saving}
        saveText="Actualizar"
      >
        <FormField label="Nombre *" limits={FIELD_LIMITS.nombreEspacio} value={formData.nombre} error={modalError || undefined}>
          <input name="nombre" placeholder="Ej. Biblioteca UTEQ" value={formData.nombre}
            maxLength={FIELD_LIMITS.nombreEspacio.max} onChange={handleChange} />
        </FormField>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label className="modal-label">Latitud</label>
            <input
              value={formData.latitude}
              readOnly
              disabled
              style={{ background: "var(--gray-100, #f3f4f6)", color: "var(--gray-400)", cursor: "not-allowed" }}
            />
          </div>
          <div>
            <label className="modal-label">Longitud</label>
            <input
              value={formData.longitude}
              readOnly
              disabled
              style={{ background: "var(--gray-100, #f3f4f6)", color: "var(--gray-400)", cursor: "not-allowed" }}
            />
          </div>
        </div>

        {actual && (
          <>
            <p className="modal-hint">
              📍 Las coordenadas no se pueden modificar desde el dashboard.
            </p>
            <div>
              <label className="modal-label">Imagen del edificio</label>
              <div style={{ marginTop: 6 }}>
                <ImageUploader
                  currentImage={actual.image}
                  placeholder={<MapPin size={28} color="var(--blue-400,#60a5fa)" />}
                  onUpload={file => subirImagenEdificio(actual._id, file)}
                  onDelete={() => eliminarImagenEdificio(actual._id)}
                  uploading={uploadingImg}
                  shape="rect"
                  size={120}
                />
              </div>
            </div>
          </>
        )}

        {modalError && <p className="modal-error">{modalError}</p>}
      </AppModal>

      {/* ✅ useConfirm disponible para futura lógica de eliminación */}
      <ConfirmModal
        open={confirm.open}
        mensaje={confirm.mensaje}
        onConfirm={confirm.ejecutar}
        onCancel={confirm.cancelar}
      />
    </div>
  );
};

export default EdificiosRutas;