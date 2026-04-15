/**
 * EventFormField.tsx
 * ─────────────────────────────────────────────────────────────
 * Wrapper de campo de formulario que elimina el patrón
 * repetido en Eventos.tsx:
 *
 *   {esSuperAdmin ? (
 *     <div ref={ref} className="form-group">
 *       <label>Título *</label>
 *       {children}
 *     </div>
 *   ) : (
 *     <div ref={ref}>
 *       <label className="ge-form-label">Título *</label>
 *       {children}
 *     </div>
 *   )}
 *
 * Ahora:
 *   <EventFormField label="Título *" variant={variant} containerRef={ref}>
 *     {children}
 *   </EventFormField>
 *
 * ─────────────────────────────────────────────────────────────
 */
import React from "react";
import CharCount from "../../components/ui/CharCount";
import FieldError from "../../components/ui/FieldError";

interface EventFormFieldProps {
  label: string;
  variant: "superadmin" | "admin";
  containerRef?: React.RefObject<HTMLDivElement>;
  /** Texto del contador de caracteres */
  charMin?: number;
  charMax?: number;
  charCurrent?: number;
  /** Mensaje de error */
  error?: string;
  /** Clases extra para el div externo */
  className?: string;
  children: React.ReactNode;
}

const EventFormField: React.FC<EventFormFieldProps> = ({
  label,
  variant,
  containerRef,
  charMin,
  charMax,
  charCurrent,
  error,
  className,
  children,
}) => {
  const isSA = variant === "superadmin";

  const showRange = charMin !== undefined && charMax !== undefined;
  const rangeHint = showRange
    ? <span style={{ fontSize: "0.72rem", color: isSA ? "#9ca3af" : "var(--gray-400)", fontWeight: 400 }}>
        ({charMin}–{charMax} caracteres)
      </span>
    : null;

  if (isSA) {
    return (
      <div ref={containerRef} className={`form-group${className ? ` ${className}` : ""}`}>
        <label>{label} {rangeHint}</label>
        {children}
        {charMax !== undefined && charCurrent !== undefined && (
          <CharCount current={charCurrent} min={charMin ?? 0} max={charMax} />
        )}
        <FieldError msg={error} />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className}>
      <label className="ge-form-label">{label} {rangeHint}</label>
      {children}
      {charMax !== undefined && charCurrent !== undefined && (
        <CharCount current={charCurrent} min={charMin ?? 0} max={charMax} isAdmin />
      )}
      <FieldError msg={error} isAdmin />
    </div>
  );
};

export default EventFormField;
