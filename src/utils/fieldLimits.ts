/**
 * fieldLimits.ts
 * ─────────────────────────────────────────────────────────────
 * Fuente única de verdad para los límites de caracteres de cada
 * campo reutilizable en toda la app.
 *
 * Uso:
 *   import { FIELD_LIMITS } from "@/utils/fieldLimits";
 *   <input maxLength={FIELD_LIMITS.nombre.max} />
 *   validate: value.length >= FIELD_LIMITS.nombre.min
 * ─────────────────────────────────────────────────────────────
 */

export interface FieldLimit {
  min: number;
  max: number;
  /** Mensaje de error por omisión cuando el campo está vacío */
  required?: string;
  /** Mensaje de error por omisión cuando no llega al mínimo */
  tooShort?: (min: number) => string;
  /** Mensaje de error por omisión cuando supera el máximo */
  tooLong?: (max: number) => string;
}

export const FIELD_LIMITS = {
  // ── Nombre de persona ─────────────────────────────────────
  nombre: {
    min: 2,
    max: 30,
    required: "El nombre es obligatorio.",
    tooShort: (min: number) => `Mínimo ${min} caracteres.`,
    tooLong:  (max: number) => `Máximo ${max} caracteres.`,
  },

  // ── Apellidos ─────────────────────────────────────────────
  apellidoPaterno: {
    min: 2,
    max: 30,
    required: "El apellido paterno es obligatorio.",
    tooShort: (min: number) => `Mínimo ${min} caracteres.`,
    tooLong:  (max: number) => `Máximo ${max} caracteres.`,
  },
  apellidoMaterno: {
    min: 2,
    max: 30,
    required: "El apellido materno es obligatorio.",
    tooShort: (min: number) => `Mínimo ${min} caracteres.`,
    tooLong:  (max: number) => `Máximo ${max} caracteres.`,
  },

  // ── Título (eventos, espacios, etc.) ──────────────────────
  titulo: {
    min: 10,
    max: 50,
    required: "El título es obligatorio.",
    tooShort: (min: number) => `El título debe tener al menos ${min} caracteres.`,
    tooLong:  (max: number) => `El título no puede superar los ${max} caracteres.`,
  },

  // ── Descripción ───────────────────────────────────────────
  descripcion: {
    min: 20,
    max: 300,
    required: "La descripción es obligatoria.",
    tooShort: (min: number) => `Debe tener al menos ${min} caracteres.`,
    tooLong:  (max: number) => `No puede superar los ${max} caracteres.`,
  },

  // ── Campos de espacio / lugar ─────────────────────────────
  nombreEspacio: {
    min: 3,
    max: 60,
    required: "El nombre del espacio es obligatorio.",
    tooShort: (min: number) => `El nombre debe tener al menos ${min} caracteres.`,
    tooLong:  (max: number) => `El nombre no puede superar los ${max} caracteres.`,
  },

  // ── Número de empleado ────────────────────────────────────
  numeroEmpleado: {
    min: 3,
    max: 20,
    required: "El número de empleado es obligatorio.",
    tooShort: (min: number) => `Mínimo ${min} caracteres.`,
    tooLong:  (max: number) => `Máximo ${max} caracteres.`,
  },

  cubiculo: {
    min: 3,
    max: 8,
    required: "El cubiculo del empleado es obligatorio.",
    tooShort: (min: number) => `Mínimo ${min} caracteres.`,
    tooLong:  (max: number) => `Máximo ${max} caracteres.`,
  },

} as const satisfies Record<string, FieldLimit>;
  
// ── Helper: valida un campo con su límite ──────────────────────
/**
 * Valida un valor contra un FieldLimit.
 * Devuelve el primer error encontrado, o `undefined` si es válido.
 *
 * @example
 * const err = validateField(formData.nombre, FIELD_LIMITS.nombre, true);
 * // "El nombre es obligatorio." | "Mínimo 2 caracteres." | undefined
 */
export function validateField(
  value: string,
  limits: FieldLimit,
  required = true,
): string | undefined {
  const v = value.trim();

  if (!v) {
    if (required) return limits.required ?? "Campo obligatorio.";
    return undefined;
  }

  if (v.length < limits.min && limits.tooShort) {
    return limits.tooShort(limits.min);
  }

  if (v.length > limits.max && limits.tooLong) {
    return limits.tooLong(limits.max);
  }

  return undefined;
}