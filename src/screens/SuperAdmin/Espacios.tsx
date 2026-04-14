import React, { useEffect, useRef, useState, useMemo } from "react";
import "../../styles/EdificiosRutas.css";
import "../../styles/tabla.css";
import NavSidebar from "../components/NavSidebar";
import PageTopbar from "../components/PageTopbar.tsx";
import { Pencil, Plus, X, Search, LayoutGrid } from "lucide-react";
import { notifyLocal } from "../../utils/notify.ts";
import Paginacion from "../components/Paginacion.tsx";
import { getEspacios, createEspacio, updateEspacio, toggleOcupadoEspacio, type Espacio, type EspacioDestino } from "../../api/espacios";
type Destino = EspacioDestino;
import { getLocations } from "../../api/locations";
import { exportEspaciosPDF } from "../../utils/pdfExport";
import FormField from "../components/ui/FormField";
import AppModal from "../components/shared/AppModal";
import { useConfirm } from "../../hooks/useConfirm";
import { FIELD_LIMITS, validateField } from "../../utils/fieldLimits";

interface FormData {
  nombre: string;
  destino: string;
  cupos: string;
  planta: string;
  descripcion: string;
}
interface FormErrors {
  nombre?: string;
  destino?: string;
  planta?: string;
  cupos?: string;
  descripcion?: string;
}

const EMPTY_FORM: FormData = { nombre: "", destino: "", cupos: "", planta: "", descripcion: "" };

const Espacios: React.FC = () => {
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroDestino, setFiltroDestino] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [modalError, setModalError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 10;

  const confirm = useConfirm();

  const refNombre = useRef<HTMLDivElement>(null);
  const refDestino = useRef<HTMLDivElement>(null);
  const refPlanta = useRef<HTMLDivElement>(null);
  const refCupos = useRef<HTMLDivElement>(null);
  const refDescripcion = useRef<HTMLDivElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  const fetchEspacios = async () => {
    setLoading(true); setError("");
    try {
      const data = await getEspacios();
      setEspacios(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const fetchDestinos = async () => {
    try {
      const data = await getLocations();
      setDestinos(data.map(l => ({ _id: l._id, nombre: l.nombre })));
    } catch { }
  };

  useEffect(() => { fetchEspacios(); fetchDestinos(); }, []);

  const espaciosFiltrados = useMemo(() => {
    return espacios.filter(e => {
      const matchBusq = !busqueda || e.nombre.toLowerCase().includes(busqueda.toLowerCase());
      const matchDest = !filtroDestino || (typeof e.destino === "object" ? e.destino?._id : e.destino) === filtroDestino;
      return matchBusq && matchDest;
    });
  }, [espacios, busqueda, filtroDestino]);

  useEffect(() => { setPagina(1); }, [busqueda, filtroDestino]);

  const espaciosPagina = useMemo(
    () => espaciosFiltrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
    [espaciosFiltrados, pagina]
  );

  const abrirAgregar = () => {
    setEditingId(null); setForm(EMPTY_FORM); setFormErrors({}); setModalError(""); setShowModal(true);
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
    setFormErrors({}); setModalError(""); setShowModal(true);
  };

  const cerrarModal = () => { setShowModal(false); setFormErrors({}); setModalError(""); };

  const scrollToRef = (ref: React.RefObject<HTMLDivElement>) => {
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      const el = ref.current?.querySelector("input, select") as HTMLElement | null;
      el?.focus();
    }, 50);
  };

  const validarForm = (): { ok: boolean; firstRef: React.RefObject<HTMLDivElement> | null } => {
    const errors: FormErrors = {};
    let firstRef: React.RefObject<HTMLDivElement> | null = null;

    const errNombre = validateField(form.nombre, FIELD_LIMITS.nombreEspacio);
    if (errNombre) { errors.nombre = errNombre; if (!firstRef) firstRef = refNombre; }

    if (!form.destino) { errors.destino = "Debes seleccionar un edificio."; if (!firstRef) firstRef = refDestino; }

    if (!form.planta) { errors.planta = "Debes seleccionar una planta."; if (!firstRef) firstRef = refPlanta; }

    const cuposNum = parseInt(form.cupos, 10);
    if (!form.cupos || isNaN(cuposNum) || cuposNum < 1) {
      errors.cupos = "Los cupos deben ser un número entero mayor a 0.";
      if (!firstRef) firstRef = refCupos;
    }

    const errDesc = validateField(form.descripcion, FIELD_LIMITS.descripcion);
    if (errDesc) { errors.descripcion = errDesc; if (!firstRef) firstRef = refDescripcion; }

    setFormErrors(errors);
    return { ok: Object.keys(errors).length === 0, firstRef };
  };

  const guardar = async () => {
    const { ok, firstRef } = validarForm();
    if (!ok) { if (firstRef) scrollToRef(firstRef); return; }

    setSaving(true); setModalError("");
    try {
      const body = {
        nombre: form.nombre.trim(),
        destino: form.destino,
        cupos: parseInt(form.cupos, 10),
        planta: form.planta,
        descripcion: form.descripcion.trim(),
      };
      if (editingId) {
        await updateEspacio(editingId, body);
      } else {
        await createEspacio(body);
      }
      cerrarModal(); fetchEspacios();
      notifyLocal(
        editingId ? "Espacio actualizado" : "Espacio creado",
        editingId
          ? `"${form.nombre.trim()}" fue actualizado correctamente.`
          : `"${form.nombre.trim()}" fue creado correctamente.`
      );
    } catch (e: any) { setModalError(e.response?.data?.error || e.message || "Error al guardar."); }
    finally { setSaving(false); }
  };

  const toggleOcupado = async (e: Espacio) => {
    try {
      await toggleOcupadoEspacio(e._id, !e.ocupado);
      fetchEspacios();
      notifyLocal("Espacio actualizado", `"${e.nombre}" fue marcado como ${e.ocupado ? "disponible" : "ocupado"}.`);
    } catch { }
  };

  const getNombreDestino = (destino: Destino | string | undefined) => {
    if (!destino) return "—";
    return typeof destino === "object" ? destino.nombre : "—";
  };

  const errStyle = (hasErr: boolean): React.CSSProperties =>
    hasErr ? { border: "1.5px solid #f87171", outline: "none" } : {};

  const clearErr = (field: keyof FormErrors) => {
    if (formErrors[field]) setFormErrors(prev => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="spadmin-container">
      <NavSidebar rol="superadmin" />

      <div className="spadmin-main-content">
        <PageTopbar
          title="Gestión de Espacios"
          subtitle={`${espacios.length} aula(s) y espacio(s) registrado(s)`}
          onDownloadPDF={() => exportEspaciosPDF(espaciosFiltrados)}
        />

        <div className="spadmin-content-area">

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

            <select className="edr-select" value={filtroDestino} onChange={e => setFiltroDestino(e.target.value)}>
              <option value="">Todos los edificios</option>
              {destinos.map(d => <option key={d._id} value={d._id}>{d.nombre}</option>)}
            </select>

            {(busqueda || filtroDestino) && (
              <button className="edr-btn-limpiar" onClick={() => { setBusqueda(""); setFiltroDestino(""); }}>
                <X size={13} /> Limpiar
              </button>
            )}

            <span className="edr-count">{espaciosFiltrados.length} de {espacios.length} espacios</span>

            <button data-action className="ut-btn-detail" onClick={abrirAgregar}>
              <Plus size={16} /> Agregar Espacio
            </button>
          </div>

          {error && <div className="edr-error">{error}</div>}

          {loading ? (
            <p style={{ color: "var(--gray-400)", padding: 24, fontFamily: "var(--font-sans)" }}>Cargando espacios...</p>
          ) : (
            <div className="ut-table-wrapper">
              <table className="ut-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Edificio / Destino</th>
                    <th className="ut-col-num">Cupos</th>
                    <th className="ut-col-text" style={{ textAlign: "center" }}>Planta</th>
                    <th className="ut-col-text" style={{ textAlign: "center" }}>Estado</th>
                    <th className="ut-col-actions" style={{ width: 100 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {espaciosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="ut-empty">
                          <LayoutGrid size={36} />
                          <h3>
                            {espacios.length === 0 ? "Sin espacios registrados" : "Sin resultados"}
                          </h3>
                          <p>
                            {espacios.length === 0
                              ? "Aún no has creado espacios."
                              : `No hay coincidencias para "${busqueda}"`}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    espaciosPagina.map(e => (
                      <tr key={e._id}>
                        <td>
                          <div className="edr-cell-nombre">
                            <strong>{e.nombre}</strong>
                            {e.descripcion && <span>{e.descripcion}</span>}
                          </div>
                        </td>
                        <td>
                          <span className="edr-badge-destino">{getNombreDestino(e.destino)}</span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className="edr-badge-cupos">{e.cupos} personas</span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className="edr-badge-planta">{e.planta}</span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button data-action
                            onClick={() => toggleOcupado(e)}
                            className={`edr-estado-btn ${e.ocupado ? "edr-estado-ocupado" : "edr-estado-disponible"}`}
                          >
                            {e.ocupado ? "Ocupado" : "Disponible"}
                          </button>
                        </td>
                        <td>
                          <div className="acciones">
                            <button data-action className="btn-icon" onClick={() => abrirEditar(e)} title="Editar">
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
          <Paginacion total={espaciosFiltrados.length} porPagina={POR_PAGINA} paginaActual={pagina} onChange={setPagina} />
        </div>
      </div>

      <AppModal
        open={showModal}
        titulo={editingId ? "Editar Espacio" : "Agregar Espacio"}
        onClose={cerrarModal}
        onSave={guardar}
        saving={saving}
        saveText={editingId ? "Actualizar" : "Guardar"}
        bodyRef={modalBodyRef}
      >
        <FormField
          label="Nombre *"
          limits={FIELD_LIMITS.nombreEspacio}
          value={form.nombre}
          error={formErrors.nombre}
          containerRef={refNombre}
        >
          <input
            placeholder="Ej. Aula 101, Sala de Cómputo"
            value={form.nombre}
            maxLength={FIELD_LIMITS.nombreEspacio.max}
            style={errStyle(!!formErrors.nombre)}
            onChange={e => { setForm({ ...form, nombre: e.target.value }); clearErr("nombre"); }}
          />
        </FormField>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

          <FormField label="Edificio / Destino *" error={formErrors.destino} containerRef={refDestino}>
            <select
              value={form.destino}
              style={errStyle(!!formErrors.destino)}
              onChange={e => { setForm({ ...form, destino: e.target.value }); clearErr("destino"); }}
            >
              <option value="">Selecciona un edificio</option>
              {destinos.map(d => <option key={d._id} value={d._id}>{d.nombre}</option>)}
            </select>
          </FormField>

          <FormField label="Planta *" error={formErrors.planta} containerRef={refPlanta}>
            <select
              value={form.planta}
              style={errStyle(!!formErrors.planta)}
              onChange={e => { setForm({ ...form, planta: e.target.value }); clearErr("planta"); }}
            >
              <option value="">Selecciona planta</option>
              <option value="Planta baja">Planta baja</option>
              <option value="Planta alta">Planta alta</option>
              <option value="Planta única">Planta única</option>
            </select>
          </FormField>

          <FormField label="Cupos *" error={formErrors.cupos} containerRef={refCupos}>
            <input
              type="number"
              min="1"
              placeholder="Capacidad máxima"
              value={form.cupos}
              style={errStyle(!!formErrors.cupos)}
              onKeyDown={e => { if ([".", ",", "e", "E", "+", "-"].includes(e.key)) e.preventDefault(); }}
              onChange={e => { setForm({ ...form, cupos: e.target.value }); clearErr("cupos"); }}
            />
          </FormField>

          <div style={{ gridColumn: "1 / -1" }}>
            <FormField
              label="Descripción *"
              limits={FIELD_LIMITS.descripcion}
              value={form.descripcion}
              error={formErrors.descripcion}
              containerRef={refDescripcion}
            >
              <input
                placeholder="Ej. Equipada con proyector y aire acondicionado"
                value={form.descripcion}
                maxLength={FIELD_LIMITS.descripcion.max}
                style={errStyle(!!formErrors.descripcion)}
                onChange={e => { setForm({ ...form, descripcion: e.target.value }); clearErr("descripcion"); }}
              />
            </FormField>
          </div>

        </div>

        {modalError && <p className="modal-error">{modalError}</p>}
      </AppModal>
    </div>
  );
};

export default Espacios;