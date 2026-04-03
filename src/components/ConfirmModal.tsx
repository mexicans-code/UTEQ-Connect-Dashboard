import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface Props {
  open: boolean;
  titulo?: string;
  mensaje: string;
  labelConfirm?: string;
  labelCancel?: string;
  variante?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<Props> = ({
  open, titulo = "Confirmar acción", mensaje,
  labelConfirm = "Confirmar", labelCancel = "Cancelar",
  variante = "danger", onConfirm, onCancel,
}) => {
  if (!open) return null;

  const colores = {
    danger:  { bg: "#fee2e2", icon: "#dc2626", btn: "#dc2626", hover: "#b91c1c" },
    warning: { bg: "#fef9c3", icon: "#d97706", btn: "#d97706", hover: "#b45309" },
    info:    { bg: "#dbeafe", icon: "#2563eb", btn: "#2563eb", hover: "#1d4ed8" },
  }[variante];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1200,
      background: "rgba(15,23,42,.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 14, width: "100%", maxWidth: 400,
        boxShadow: "0 20px 60px rgba(0,0,0,.25)", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          background: colores.bg, padding: "18px 20px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: "1px solid rgba(0,0,0,.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertTriangle size={20} color={colores.icon} />
            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1f2937" }}>{titulo}</span>
          </div>
          <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex" }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 22px" }}>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#374151", lineHeight: 1.55 }}>{mensaje}</p>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 22px 18px", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db",
              padding: "8px 18px", borderRadius: 8, fontSize: "0.875rem",
              fontWeight: 500, cursor: "pointer",
            }}
          >
            {labelCancel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: colores.btn, color: "#fff", border: "none",
              padding: "8px 18px", borderRadius: 8, fontSize: "0.875rem",
              fontWeight: 600, cursor: "pointer",
            }}
            onMouseOver={e => (e.currentTarget.style.background = colores.hover)}
            onMouseOut={e => (e.currentTarget.style.background = colores.btn)}
          >
            {labelConfirm}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;