/**
 * TableWrapper.tsx
 * ─────────────────────────────────────────────────────────────
 * Envuelve cualquier tabla con los estados: loading, error, vacío y datos.
 *
 * Antes, en cada screen se repetía:
 *   {loading ? (
 *     <p>Cargando...</p>
 *   ) : error ? (
 *     <p>{error}</p>
 *   ) : datos.length === 0 ? (
 *     <div className="empty-state">...</div>
 *   ) : (
 *     <table>...</table>
 *   )}
 *
 * Ahora:
 *   <TableWrapper loading={loading} error={error} empty={datos.length === 0}
 *     emptyIcon={<Calendar size={38} />} emptyMsg="Sin eventos registrados">
 *     <table>...</table>
 *   </TableWrapper>
 * ─────────────────────────────────────────────────────────────
 */
import React from "react";

interface TableWrapperProps {
  loading: boolean;
  error?: string;
  empty: boolean;
  emptyIcon?: React.ReactNode;
  emptyMsg: string;
  emptyAction?: React.ReactNode;
  /** Estilos del tema (superadmin usa grises directos, admin usa variables) */
  variant?: "superadmin" | "admin";
  children: React.ReactNode;
}

const TableWrapper: React.FC<TableWrapperProps> = ({
  loading,
  error,
  empty,
  emptyIcon,
  emptyMsg,
  emptyAction,
  variant = "admin",
  children,
}) => {
  const isSA = variant === "superadmin";

  if (loading) {
    return (
      <p style={{
        color: isSA ? "#9ca3af" : "var(--gray-400)",
        padding: "24px",
        fontFamily: isSA ? undefined : "var(--font-sans)",
      }}>
        Cargando…
      </p>
    );
  }

  if (error) {
    return (
      <div style={{
        background: isSA ? "rgba(220,38,38,.08)" : "var(--red-50)",
        border: "1px solid rgba(220,38,38,.15)",
        color: isSA ? "#dc2626" : "var(--red-600)",
        padding: "10px 14px",
        borderRadius: isSA ? 8 : "var(--radius-md)",
        fontSize: "0.875rem",
        marginBottom: 16,
      }}>
        {error}
      </div>
    );
  }

  if (empty) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        gap: 12,
        color: isSA ? "#9ca3af" : "var(--gray-400)",
        textAlign: "center",
      }}>
        {emptyIcon && (
          <div style={{ opacity: 0.5 }}>{emptyIcon}</div>
        )}
        <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 500 }}>
          {emptyMsg}
        </p>
        {emptyAction}
      </div>
    );
  }

  return <>{children}</>;
};

export default TableWrapper;
