/**
 * CharCount.tsx
 * ─────────────────────────────────────────────────────────────
 * Contador de caracteres con colores semafóricos.
 *
 * Uso básico:
 *   <CharCount value={formData.nombre} limits={FIELD_LIMITS.nombre} />
 *
 * Modo legado (min/max explícitos, para no romper código existente):
 *   <CharCount current={formData.nombre.length} min={2} max={50} />
 * ─────────────────────────────────────────────────────────────
 */
import React from "react";
import type { FieldLimit } from "../../../utils/fieldLimits";

// ── Dos variantes de props para flexibilidad ──────────────────
type PropsViaLimits = {
  /** Valor del input (se calcula .length internamente) */
  value: string;
  /** Objeto de FIELD_LIMITS */
  limits: FieldLimit;
  current?: never;
  min?: never;
  max?: never;
};

type PropsManual = {
  current: number;
  min?: number;
  max: number;
  value?: never;
  limits?: never;
};

type CharCountProps = (PropsViaLimits | PropsManual) & {
  /** true = usa variables CSS del tema admin */
  isAdmin?: boolean;
};

const CharCount: React.FC<CharCountProps> = (props) => {
  const { isAdmin } = props;

  // Normaliza las dos variantes
  const current = props.value !== undefined
    ? props.value.length
    : (props.current ?? 0);
  const min = props.limits !== undefined
    ? props.limits.min
    : (props.min ?? 0);
  const max = props.limits !== undefined
    ? props.limits.max
    : props.max!;

  const near = current >= max * 0.85;
  const over  = current > max;

  const color = over
    ? (isAdmin ? "var(--red-600, #dc2626)"   : "#dc2626")
    : current >= min && min > 0
    ? (isAdmin ? "var(--green-600, #16a34a)" : "#16a34a")
    : near
    ? "#d97706"
    : (isAdmin ? "var(--gray-400)"           : "#9ca3af");

  return (
    <span
      style={{
        fontSize: "0.72rem",
        color,
        marginLeft: "auto",
        display: "block",
        textAlign: "right",
        marginTop: 2,
      }}
    >
      {current}/{max}
      {min > 0 && current < min ? ` (mín. ${min})` : ""}
    </span>
  );
};

export default CharCount;