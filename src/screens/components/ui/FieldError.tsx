/**
 * FieldError.tsx
 * ─────────────────────────────────────────────────────────────
 * Mensaje de error de validación bajo un campo de formulario.
 * No renderiza nada si `msg` está vacío/undefined.
 * ─────────────────────────────────────────────────────────────
 */
import React from "react";

interface FieldErrorProps {
  msg?: string;
  /** true = usa variables CSS del tema admin */
  isAdmin?: boolean;
}

const FieldError: React.FC<FieldErrorProps> = ({ msg, isAdmin }) => {
  if (!msg) return null;

  return (
    <p
      style={{
        color: isAdmin ? "var(--red-600, #dc2626)" : "#dc2626",
        fontSize: "0.78rem",
        margin: "3px 0 0 2px",
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <span style={{ fontSize: "0.7rem" }}>⚠</span> {msg}
    </p>
  );
};

export default FieldError;