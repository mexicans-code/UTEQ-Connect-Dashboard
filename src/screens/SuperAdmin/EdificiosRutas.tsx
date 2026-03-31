import React, { useState, useEffect, useMemo } from "react";
import "../../styles/EdificiosRutas.css";
import NavSpAdmin from "../components/NavSpAdmin";
import { Pencil, Trash2, X, Search, MapPin, FileDown } from "lucide-react";
import ImageUploader from "../../components/ImageUploader";
import { API_URL } from "../../api/config";
import api from "../../api/axios";
import ConfirmModal from "../../components/ConfirmModal";
import Paginacion from "../../components/Paginacion";
import { exportEdificiosPDF } from "../../utils/pdfExport";

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

const apiFetch = async (path: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) { localStorage.clear(); window.location.href = "/"; }
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Error en la petición");
  return data;
};

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
  const [confirmOpen, setConfirmOpen]   = useState(false);
  const [confirmMsg, setConfirmMsg]     = useState("");
  const [confirmFn, setConfirmFn]       = useState<() => void>(() => () => {});
  const confirmar = (msg: string, fn: () => void) => { setConfirmMsg(msg); setConfirmFn(() => fn); setConfirmOpen(true); };
  const [uploadingImg, setUploadingImg] = useState(false);

  const fetchDestinos = async () => {
    setLoading(true); setError("");
    try {
      const data = await apiFetch("/locations");
      const lista: Destino[] = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
      setDestinos(lista);
    } catch (e: any) {
      setError(e.message || "Error al cargar ubicaciones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDestinos(); }, []);

  const destinosFiltrados = useMemo(() => {
    setPagina(1);
    return destinos.filter(d => !busqueda || d.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  }, [destinos, busqueda]);

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
    if (!formData.nombre.trim()) return "El nombre es obligatorio.";
    return null;
  };

  const subirImagenEdificio = async (id: string, file: File) => {
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      await api.post(`/locations/${id}/image`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
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
      await api.delete(`/locations/${id}/image`);
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
    const body = JSON.stringify({ nombre: formData.nombre.trim() });
    try {
      await apiFetch(`/locations/${actual._id}`, { method: "PUT", body });
      cerrarModal(); fetchDestinos();
    } catch (e: any) {
      setModalError(e.message || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (d: Destino) => {
    confirmar(`¿Eliminar "${d.nombre}"? Esta acción no se puede deshacer.`, async () => {
      try {
        await apiFetch(`/locations/${d._id}`, { method: "DELETE" });
        fetchDestinos();
      } catch {
        setModalError("Error al eliminar la ubicación.");
      }
    });
  };

  return (
    <div className="spadmin-container">
      <NavSpAdmin />

      <div className="spadmin-main-content">
        {/* ── Header ── */}
        <header className="spadmin-topbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1>Gestión de Ubicaciones</h1>
            <p>{destinos.length} edificio(s) registrado(s)</p>
          </div>
          <button
            onClick={() => exportEdificiosPDF(destinos)}
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
        </header>

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
            <div className="edr-table-wrapper">
              <table className="edr-table">
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
                          <div className="acciones">
                            <button className="btn-icon" onClick={() => abrirEditar(d)} title="Editar">
                              <Pencil size={15} />
                            </button>
                            <button className="btn-icon delete" onClick={() => eliminar(d)} title="Eliminar">
                              <Trash2 size={15} />
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

      {/* ══ Modal ══ */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Editar Ubicación</h3>
              <button onClick={cerrarModal}><X size={18} /></button>
            </div>
            <div className="modal-body">

              <div>
                <label className="modal-label">Nombre *</label>
                <input name="nombre" placeholder="Ej. Biblioteca UTEQ" value={formData.nombre} onChange={handleChange} />
              </div>

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
            </div>
            <div className="modal-footer">
              <button className="btn-cancelar" onClick={cerrarModal}>Cancelar</button>
              <button className="btn-guardar" onClick={guardar} disabled={saving}>
                {saving ? "Guardando..." : "Actualizar"}
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

export default EdificiosRutas;