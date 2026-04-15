/**
 * AppModal.tsx
 * ─────────────────────────────────────────────────────────────
 * Componente reutilizable para TODOS los modales del sistema.
 *
 * Antes, cada screen tenía su propio bloque JSX de modal:
 *   <div className="modal-overlay">
 *     <div className="modal-container">
 *       <div className="modal-header"> ... </div>
 *       <div className="modal-body"> ... </div>
 *       <div className="modal-footer"> ... </div>
 *     </div>
 *   </div>
 *
 * Ahora:
 *   <AppModal
 *     open={modal.abierto}
 *     titulo={modal.esEdicion ? "Editar Usuario" : "Agregar Usuario"}
 *     subtitulo="Completa los datos del formulario"
 *     onClose={modal.cerrar}
 *     onSave={guardarUsuario}
 *     saving={modal.guardando}
 *     savingText="Guardando..."
 *     saveText={modal.esEdicion ? "Actualizar" : "Guardar"}
 *   >
 *     {campos del formulario}
 *   </AppModal>
 * ─────────────────────────────────────────────────────────────
 */
import React, { useRef } from "react";
import { X } from "lucide-react";
import "../../../styles/Modal.css";

interface AppModalProps {
  /** Controla visibilidad */
  open: boolean;

  /** Título en el header del modal */
  titulo: string;

  /** Subtítulo opcional bajo el título */
  subtitulo?: string;

  /**
   * Nodo extra DEBAJO del header (ej. tabs de Personal/Usuarios).
   * Se renderiza en el modal-tabs-wrapper (fondo gris claro).
   */
  headerExtra?: React.ReactNode;

  /**
   * Nodo extra DENTRO del header azul (ej. paso-indicador de Eventos).
   * Se renderiza sobre el fondo azul, bajo el título.
   */
  headerInside?: React.ReactNode;

  /** Callback para cerrar el modal */
  onClose: () => void;

  /** Callback del botón guardar/actualizar */
  onSave?: () => void;

  /** Texto del botón guardar (default: "Guardar") */
  saveText?: string;

  /** Texto mientras se guarda (default: "Guardando...") */
  savingText?: string;

  /** Si está guardando — deshabilita el botón y muestra savingText */
  saving?: boolean;

  /** Deshabilita el botón guardar por lógica externa */
  saveDisabled?: boolean;

  /** Oculta el footer completo (útil si el footer es custom) */
  hideFooter?: boolean;

  /** Nodo de footer completamente personalizado */
  customFooter?: React.ReactNode;

  /** Ancho grande (560px) para modales más complejos */
  large?: boolean;

  /** Ref al modal-body para scroll programático */
  bodyRef?: React.RefObject<HTMLDivElement>;

  children: React.ReactNode;
}

const AppModal: React.FC<AppModalProps> = ({
  open,
  titulo,
  subtitulo,
  headerExtra,
  headerInside,
  onClose,
  onSave,
  saveText     = "Guardar",
  savingText   = "Guardando...",
  saving       = false,
  saveDisabled = false,
  hideFooter   = false,
  customFooter,
  large        = false,
  bodyRef,
  children,
}) => {
  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className={`modal-container${large ? " modal-lg" : ""}`}>

        {/* ── Header ── */}
        <div className="modal-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2>{titulo}</h2>
            {subtitulo && <p>{subtitulo}</p>}
            {headerInside && (
              <div className="modal-header-extra">
                {headerInside}
              </div>
            )}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={17} />
          </button>
        </div>

        {/* ── Tabs (fuera del header — fondo gris, ej. Personal/Usuarios) ── */}
        {headerExtra && (
          <div className="modal-tabs-wrapper">
            {headerExtra}
          </div>
        )}
        <div className="modal-body" ref={bodyRef}>
          {children}
        </div>

        {/* ── Footer ── */}
        {!hideFooter && (
          <div className="modal-footer">
            {customFooter ?? (
              <>
                <button className="btn-cancelar" onClick={onClose}>
                  Cancelar
                </button>
                {onSave && (
                  <button
                    className="btn-guardar"
                    onClick={onSave}
                    disabled={saving || saveDisabled}
                  >
                    {saving ? savingText : saveText}
                  </button>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default AppModal;