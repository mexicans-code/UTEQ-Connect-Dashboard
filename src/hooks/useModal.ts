/**
 * useModal.ts
 * ─────────────────────────────────────────────────────────────
 * Hook genérico para el estado de modales CRUD.
 *
 * Reemplaza este bloque que se repite en Eventos, GestionPersonal,
 * Usuarios, InscritosEvento, etc.:
 *   const [showModal,    setShowModal]    = useState(false);
 *   const [modoEdicion,  setModoEdicion]  = useState(false);
 *   const [actual,       setActual]       = useState<T|null>(null);
 *   const [saving,       setSaving]       = useState(false);
 *   const [modalError,   setModalError]   = useState("");
 *   const [formData,     setFormData]     = useState<F>(EMPTY_FORM);
 *
 * Uso:
 *   const modal = useModal<Evento, FormData>(EMPTY_FORM);
 *
 *   modal.abrirAgregar();
 *   modal.abrirEditar(evento, { titulo: evento.titulo, ... });
 *   modal.cerrar();
 *   modal.setSaving(true);
 *   modal.setError("Algo salió mal");
 *
 *   // En el JSX
 *   {modal.abierto && (
 *     <div className="modal-overlay">
 *       ...
 *       <input value={modal.form.titulo} onChange={...} />
 *       {modal.error && <p>{modal.error}</p>}
 *       <button disabled={modal.guardando} onClick={guardar}>
 *         {modal.guardando ? "Guardando…" : modal.esEdicion ? "Actualizar" : "Guardar"}
 *       </button>
 *     </div>
 *   )}
 * ─────────────────────────────────────────────────────────────
 */
import { useState, useCallback } from "react";

export const useModal = <TItem, TForm>(emptyForm: TForm) => {
  const [abierto,   setAbierto]   = useState(false);
  const [esEdicion, setEsEdicion] = useState(false);
  const [actual,    setActual]    = useState<TItem | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState("");
  const [form,      setForm]      = useState<TForm>(emptyForm);

  /** Abre en modo creación */
  const abrirAgregar = useCallback(() => {
    setEsEdicion(false);
    setActual(null);
    setForm(emptyForm);
    setError("");
    setAbierto(true);
  }, [emptyForm]);

  /**
   * Abre en modo edición.
   * @param item  El objeto original (para referencias en guardar/eliminar)
   * @param data  Los valores iniciales del formulario
   */
  const abrirEditar = useCallback((item: TItem, data: TForm) => {
    setEsEdicion(true);
    setActual(item);
    setForm(data);
    setError("");
    setAbierto(true);
  }, []);

  /** Cierra y limpia todo */
  const cerrar = useCallback(() => {
    setAbierto(false);
    setError("");
    setForm(emptyForm);
    setEsEdicion(false);
    setActual(null);
    setGuardando(false);
  }, [emptyForm]);

  /** Actualiza un campo del formulario por nombre */
  const setField = useCallback(<K extends keyof TForm>(key: K, value: TForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  /** Handler genérico para inputs/selects/textareas */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      setForm(prev => ({
        ...prev,
        [name]: type === "number" ? Number(value) : value,
      }));
    },
    []
  );

  return {
    // Estado
    abierto,
    esEdicion,
    actual,
    guardando,
    error,
    form,
    // Setters directos (para casos complejos)
    setForm,
    setError,
    setSaving: setGuardando,
    // Acciones
    abrirAgregar,
    abrirEditar,
    cerrar,
    setField,
    handleChange,
  };
};
