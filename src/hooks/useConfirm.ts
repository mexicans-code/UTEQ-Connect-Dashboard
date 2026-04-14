/**
 * useConfirm.ts
 * ─────────────────────────────────────────────────────────────
 * Hook reutilizable para el patrón de confirmación modal.
 *
 * Reemplaza este bloque que se repite en cada screen:
 *   const [confirmOpen, setConfirmOpen]   = useState(false);
 *   const [confirmMsg,  setConfirmMsg]    = useState("");
 *   const [confirmFn,   setConfirmFn]     = useState<()=>void>(()=>()=>{});
 *   const confirmar = (msg, fn) => { ... };
 *
 * Uso:
 *   const confirm = useConfirm();
 *
 *   // Disparar confirmación
 *   confirm.pedir("¿Eliminar este registro?", () => eliminar(id));
 *
 *   // En el JSX
 *   <ConfirmModal
 *     open={confirm.open}
 *     mensaje={confirm.mensaje}
 *     onConfirm={confirm.ejecutar}
 *     onCancel={confirm.cancelar}
 *   />
 * ─────────────────────────────────────────────────────────────
 */
import { useState, useCallback } from "react";

interface ConfirmState {
  open: boolean;
  mensaje: string;
  fn: () => void;
}

const INITIAL: ConfirmState = { open: false, mensaje: "", fn: () => {} };

export const useConfirm = () => {
  const [state, setState] = useState<ConfirmState>(INITIAL);

  /** Abre el modal con el mensaje y la acción a ejecutar si confirma */
  const pedir = useCallback((mensaje: string, fn: () => void) => {
    setState({ open: true, mensaje, fn });
  }, []);

  /** Ejecuta la acción y cierra */
  const ejecutar = useCallback(() => {
    state.fn();
    setState(INITIAL);
  }, [state]);

  /** Cancela y cierra */
  const cancelar = useCallback(() => {
    setState(INITIAL);
  }, []);

  return {
    open:    state.open,
    mensaje: state.mensaje,
    pedir,
    ejecutar,
    cancelar,
  };
};
