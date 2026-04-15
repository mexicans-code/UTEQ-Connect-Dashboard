/**
 * FormField.tsx
 * ─────────────────────────────────────────────────────────────
 * Wrapper reutilizable para cualquier campo de formulario.
 * Combina: label + hint de rango + input/children + CharCount + FieldError
 *
 * Uso básico (input de texto):
 *   <FormField
 *     label="Nombre(s)"
 *     limits={FIELD_LIMITS.nombre}
 *     value={formData.nombre}
 *     error={formErrors.nombre}
 *     isAdmin
 *   >
 *     <input
 *       name="nombre"
 *       value={formData.nombre}
 *       onChange={handleChange}
 *     />
 *   </FormField>
 *
 * Uso sin límites (select, date, etc.):
 *   <FormField label="Fecha" error={formErrors.fecha}>
 *     <input type="date" ... />
 *   </FormField>
 *
 * Uso con límites manuales (cuando no usas FIELD_LIMITS):
 *   <FormField label="Código" value={val} min={3} max={10} error={err}>
 *     <input ... />
 *   </FormField>
 * ─────────────────────────────────────────────────────────────
 */
import React from "react";
import CharCount from "./CharCount";
import FieldError from "./FieldError";
import type { FieldLimit } from "../../../utils/fieldLimits";

interface FormFieldProps {
  /** Texto del label */
  label: string;
  /** Muestra "(opcional)" junto al label */
  optional?: boolean;
  /** Muestra indicador de rango y CharCount */
  limits?: FieldLimit;
  /** Alternativa a limits: solo max */
  max?: number;
  /** Alternativa a limits: solo min */
  min?: number;
  /** Valor actual del input (necesario para CharCount) */
  value?: string;
  /** Mensaje de error de validación */
  error?: string;
  /** Usa variables CSS del tema admin */
  isAdmin?: boolean;
  /** Ref para scroll-to-error */
  containerRef?: React.RefObject<HTMLDivElement>;
  children: React.ReactNode;
  className?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  optional,
  limits,
  max,
  min,
  value,
  error,
  isAdmin,
  containerRef,
  children,
  className
}) => {
  // Resuelve los límites efectivos
  const effectiveMax = limits?.max ?? max;
  const effectiveMin = limits?.min ?? min ?? 0;

  // ¿Mostramos el rango en el label?
  const showRange = effectiveMax !== undefined && effectiveMin > 0;

  // ¿Mostramos el contador?
  const showCounter = effectiveMax !== undefined && value !== undefined;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ display: "flex", flexDirection: "column", gap: 0 }}
    >
      {/* Label + contador lado a lado */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 4,
        }}
      >
        <label
          style={{
            fontSize: "0.8rem",
            color: isAdmin ? "var(--gray-600, #4b5563)" : "#4b5563",
            fontWeight: 500,
          }}
        >
          {label}

          {/* Indicador de rango "  (mín–máx car.)" */}
          {showRange && (
            <span
              style={{
                fontWeight: 400,
                color: isAdmin ? "var(--gray-400, #9ca3af)" : "#9ca3af",
                fontSize: "0.7rem",
                marginLeft: 4,
              }}
            >
              ({effectiveMin}–{effectiveMax} car.)
            </span>
          )}

          {/* Indicador de solo máximo "  (máx. N car.)" */}
          {!showRange && effectiveMax !== undefined && (
            <span
              style={{
                fontWeight: 400,
                color: isAdmin ? "var(--gray-400, #9ca3af)" : "#9ca3af",
                fontSize: "0.7rem",
                marginLeft: 4,
              }}
            >
              (máx. {effectiveMax} car.)
            </span>
          )}

          {/* "(opcional)" */}
          {optional && (
            <span
              style={{
                fontWeight: 400,
                color: isAdmin ? "var(--gray-400, #9ca3af)" : "#9ca3af",
                marginLeft: 4,
              }}
            >
              (opcional)
            </span>
          )}
        </label>

        {/* Contador flotante a la derecha del label */}
        {showCounter && (
          <CharCount
            current={value!.length}
            min={effectiveMin}
            max={effectiveMax!}
            isAdmin={isAdmin}
          />
        )}
      </div>

      {/* El input u otro control */}
      {children}

      {/* Error de validación */}
      <FieldError msg={error} isAdmin={isAdmin} />
    </div>
  );
};

export default FormField;