import React, { useEffect, useState } from "react";
import "../../styles/EdificiosRutas.css";
import NavSpAdmin from "../components/NavSpAdmin";
import { Pencil, Trash2, Plus, X, Search, LayoutGrid, FileDown } from "lucide-react";
import { API_URL } from "../../api/config";
import { notifyLocal } from "../../utils/notify.ts";
import ConfirmModal from "../../components/ConfirmModal";
import Paginacion from "../../components/Paginacion";
import ImageUploader from "../../components/ImageUploader";
import api from "../../api/axios";
import { exportEspaciosPDF } from "../../utils/pdfExport";

interface Destino { _id: string; nombre: string; }
interface Espacio {
  _id: string;
  nombre: string;
  destino?: Destino | string;
  cupos: number;
  planta: string;
  descripcion?: string;
  ocupado?: boolean;
  image?: string;
}
interface FormData {
  nombre: string;
  destino: string;
  cupos: string;
  planta: string;
  descripcion: string;
}
const EMPTY_FORM: FormData = { nombre: "", destino: "", cupos: "", planta: "", descripcion: "" };

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

const Espacios: React.FC = () => {
  const [espacios, setEspacios]           = useState<Espacio[]>([]);
  const [destinos, setDestinos]           = useState<Destino[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [busqueda, setBusqueda]           = useState("");
  const [filtroDestino, setFiltroDestino] = useState("");

  const [showModal, setShowModal]   = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [form, setForm]             = useState<FormData>(EMPTY_FORM);
  const [modalError, setModalError] = useState("");
  const [saving, setSaving]         = useState(false);
  const [pagina, setPagina]         = useState(1);
  const POR_PAGINA = 10;
  const [uploadingImg, setUploadingImg] = useState(false);
  const [confirmOpen, setConfirmOpen]   = useState(false);
  const [confirmMsg, setConfirmMsg]     = useState("");
  const [confirmFn, setConfirmFn]       = useState<() => void>(() => () => {});
  const confirmar = (msg: string, fn: () => void) => { setConfirmMsg(msg); setConfirmFn(() => fn); setConfirmOpen(true); };

  const fetchEspacios = async () => {
    setLoading(true); setError("");
    try {
      const data = await apiFetch("/espacios");
      setEspacios(Array.isArray(data) ? data : (data.data || []));
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const fetchDestinos = async () => {
    try {
      const data = await apiFetch("/locations");
      setDestinos(Array.isArray(data) ? data : (data.data || []));
    } catch {}
  };

  useEffect(() => { fetchEspacios(); fetchDestinos(); }, []);

  const espaciosFiltrados = React.useMemo(() => {
    setPagina(1);
    return espacios.filter(e => {
      const matchBusq = !busqueda || e.nombre.toLowerCase().includes(busqueda.toLowerCase());
      const matchDest = !filtroDestino || (typeof e.destino === "object" ? e.destino?._id : e.destino) === filtroDestino;
      return matchBusq && matchDest;
    });
  }, [espacios, busqueda, filtroDestino]);

  const espaciosPagina = React.useMemo(() => espaciosFiltrados.slice((pagina-1)*POR_PAGINA, pagina*POR_PAGINA), [espaciosFiltrados, pagina]);

  const abrirAgregar = () => {
    setEditingId(null); setForm(EMPTY_FORM); setModalError(""); setShowModal(true);
  };
  const abrirEditar = (e: Espacio) => {
    setEditingId(e._id);
    setForm({
      nombre: e.nombre,
      destino: typeof e.destino === "object" ? (e.destino?._id || "") : (e.destino || ""),
      cupos: String(e.cupos),
      planta: e.planta,
      descripcion: e.descripcion || "",
    });
    setModalError(""); setShowModal(true);
  };
  const cerrarModal = () => { setShowModal(false); setModalError(""); };

  const guardar = async () => {
    if (!form.nombre || !form.destino || !form.cupos || !form.planta) {
      setModalError("Nombre, destino, cupos y planta son obligatorios."); return;
    }
    setSaving(true); setModalError("");
    const body = JSON.stringify({
      nombre: form.nombre.trim(),
      destino: form.destino,
      cupos: parseInt(form.cupos),
      planta: form.planta,
      descripcion: form.descripcion || undefined,
    });
    try {
      if (editingId) {
        await apiFetch(`/espacios/${editingId}`, { method: "PUT", body });
      } else {
        await apiFetch("/espacios", { method: "POST", body });
      }
      cerrarModal(); fetchEspacios();
      notifyLocal(
        editingId ? "Espacio actualizado" : "Espacio creado",
        editingId ? `"${form.nombre.trim()}" fue actualizado correctamente.` : `"${form.nombre.trim()}" fue creado correctamente.`
      );
    } catch (e: any) { setModalError(e.message || "Error al guardar."); }
    finally { setSaving(false); }
  };

  const eliminar = async (e: Espacio) => {
    confirmar(`¿Eliminar "${e.nombre}"? Esta acción no se puede deshacer.`, async () => {
      try { await apiFetch(`/espacios/${e._id}`, { method: "DELETE" }); fetchEspacios(); notifyLocal("Espacio eliminado", `"${e.nombre}" fue eliminado.`); }
      catch { setError("Error al eliminar."); }
    });
  };

  const toggleOcupado = async (e: Espacio) => {
    try {
      await apiFetch(`/espacios/${e._id}/ocupado`, {
        method: "PATCH", body: JSON.stringify({ ocupado: !e.ocupado })
      });
      fetchEspacios();
      notifyLocal("Espacio actualizado", `"${e.nombre}" fue marcado como ${e.ocupado ? "disponible" : "ocupado"}.`);
    } catch { /* silencioso */ }
  };

  const subirImagenEspacio = async (id: string, file: File) => {
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      await api.post(`/espacios/${id}/image`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      fetchEspacios();
    } catch { setModalError("Error al subir la imagen."); }
    finally { setUploadingImg(false); }
  };

  const eliminarImagenEspacio = async (id: string) => {
    setUploadingImg(true);
    try {
      await api.delete(`/espacios/${id}/image`);
      fetchEspacios();
    } catch { setModalError("Error al eliminar la imagen."); }
    finally { setUploadingImg(false); }
  };

  const getNombreDestino = (destino: Destino | string | undefined) => {
    if (!destino) return "—";
    return typeof destino === "object" ? destino.nombre : "—";
  };

  return (
    <div className="spadmin-container">
      <NavSpAdmin />

      <div className="spadmin-main-content">
        {/* ── Header ── */}
        <header className="spadmin-topbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1>Gestión de Espacios</h1>
            <p>{espacios.length} aula(s) y espacio(s) registrado(s)</p>
          </div>
          <button
            onClick={() => exportEspaciosPDF(espaciosFiltrados)}
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
                placeholder="Buscar espacio o aula…"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
            </div>

            <select
              className="edr-select"
              value={filtroDestino}
              onChange={e => setFiltroDestino(e.target.value)}
            >
              <option value="">Todos los edificios</option>
              {destinos.map(d => (
                <option key={d._id} value={d._id}>{d.nombre}</option>
              ))}
            </select>

            {(busqueda || filtroDestino) && (
              <button className="edr-btn-limpiar" onClick={() => { setBusqueda(""); setFiltroDestino(""); }}>
                <X size={13} /> Limpiar
              </button>
            )}

            <span className="edr-count">
              {espaciosFiltrados.length} de {espacios.length} espacios
            </span>

            <button className="edr-btn-agregar" onClick={abrirAgregar}>
              <Plus size={16} /> Agregar Espacio
            </button>
          </div>

          {/* ── Error ── */}
          {error && <div className="edr-error">{error}</div>}

          {/* ── Tabla ── */}
          {loading ? (
            <p style={{ color: "var(--gray-400)", padding: 24, fontFamily: "var(--font-sans)" }}>
              Cargando espacios...
            </p>
          ) : (
            <div className="edr-table-wrapper">
              <table className="edr-table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>Imagen</th>
                    <th>Nombre</th>
                    <th>Edificio / Destino</th>
                    <th style={{ textAlign: "center" }}>Cupos</th>
                    <th style={{ textAlign: "center" }}>Planta</th>
                    <th style={{ textAlign: "center" }}>Estado</th>
                    <th style={{ width: 100 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {espaciosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="edr-empty">
                          <LayoutGrid size={36} />
                          <p>
                            {espacios.length === 0
                              ? "Sin espacios registrados"
                              : `Sin resultados para "${busqueda}"`}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    espaciosPagina.map(e => (
                      <tr key={e._id}>
                        <td>
                          {e.image ? (
                            <img src={e.image} alt={e.nombre} style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} onError={ev => { (ev.target as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <div style={{ width: 48, height: 36, background: "var(--gray-100)", borderRadius: 6, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <LayoutGrid size={14} color="var(--gray-400)" />
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="edr-cell-nombre">
                            <strong>{e.nombre}</strong>
                            {e.descripcion && <span>{e.descripcion}</span>}
                          </div>
                        </td>
                        <td>
                          <span className="edr-badge-destino">
                            <Search size={10} style={{ opacity: 0 }} />
                            {getNombreDestino(e.destino)}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className="edr-badge-cupos">
                            {e.cupos} personas
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className="edr-badge-planta">{e.planta}</span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            onClick={() => toggleOcupado(e)}
                            className={`edr-estado-btn ${e.ocupado ? "edr-estado-ocupado" : "edr-estado-disponible"}`}
                          >
                            {e.ocupado ? "Ocupado" : "Disponible"}
                          </button>
                        </td>
                        <td>
                          <div className="acciones">
                            <button className="btn-icon" onClick={() => abrirEditar(e)} title="Editar">
                              <Pencil size={15} />
                            </button>
                            <button className="btn-icon delete" onClick={() => eliminar(e)} title="Eliminar">
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
          <Paginacion total={espaciosFiltrados.length} porPagina={POR_PAGINA} paginaActual={pagina} onChange={setPagina} />
        </div>
      </div>

      {/* ══ Modal ══ */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>{editingId ? "Editar Espacio" : "Agregar Espacio"}</h3>
              <button onClick={cerrarModal}><X size={18} /></button>
            </div>
            <div className="modal-body">

              <div>
                <label className="modal-label">Nombre *</label>
                <input
                  placeholder="Ej. Aula 101, Sala de Cómputo"
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="modal-label">Edificio / Destino *</label>
                  <select value={form.destino} onChange={e => setForm({ ...form, destino: e.target.value })}>
                    <option value="">Selecciona un edificio</option>
                    {destinos.map(d => <option key={d._id} value={d._id}>{d.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="modal-label">Planta *</label>
                  <select value={form.planta} onChange={e => setForm({ ...form, planta: e.target.value })}>
                    <option value="">Selecciona planta</option>
                    <option value="Planta baja">Planta baja</option>
                    <option value="Planta alta">Planta alta</option>
                    <option value="Planta única">Planta única</option>
                  </select>
                </div>
                <div>
                  <label className="modal-label">Cupos *</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Capacidad máxima"
                    value={form.cupos}
                    onChange={e => setForm({ ...form, cupos: e.target.value })}
                  />
                </div>
                <div>
                  <label className="modal-label">Descripción <span style={{ fontWeight: 400, textTransform: "none" }}>(opcional)</span></label>
                  <input
                    placeholder="Ej. Equipada con proyector"
                    value={form.descripcion}
                    onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  />
                </div>
              </div>

              {/* Imagen del espacio */}
              {editingId && (
                <div>
                  <label className="modal-label">Imagen del espacio</label>
                  <div style={{ marginTop: 6 }}>
                    <ImageUploader
                      currentImage={espacios.find(e => e._id === editingId)?.image}
                      placeholder={<LayoutGrid size={24} color="var(--gray-400)" />}
                      onUpload={file => subirImagenEspacio(editingId, file)}
                      onDelete={() => eliminarImagenEspacio(editingId)}
                      uploading={uploadingImg}
                      shape="rect"
                      size={120}
                    />
                  </div>
                </div>
              )}

              {modalError && <p className="modal-error">{modalError}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn-cancelar" onClick={cerrarModal}>Cancelar</button>
              <button className="btn-guardar" onClick={guardar} disabled={saving}>
                {saving ? "Guardando..." : editingId ? "Actualizar" : "Guardar"}
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

export default Espacios;