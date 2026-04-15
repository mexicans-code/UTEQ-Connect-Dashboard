import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  total: number;
  porPagina: number;
  paginaActual: number;
  onChange: (p: number) => void;
}

const Paginacion: React.FC<Props> = ({ total, porPagina, paginaActual, onChange }) => {
  const totalPaginas = Math.ceil(total / porPagina);
  if (totalPaginas <= 1) return null;

  const btn: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 32, height: 32, border: "1.5px solid var(--border,#e5e7eb)",
    borderRadius: "var(--radius-sm,6px)", background: "var(--white,#fff)",
    cursor: "pointer", fontSize: "0.82rem", fontFamily: "var(--font-sans,sans-serif)",
    color: "var(--gray-700,#374151)", transition: "all .15s",
  };
  const btnActive: React.CSSProperties = {
    ...btn,
    background: "var(--blue-600,#2563eb)", color: "#fff",
    border: "1.5px solid var(--blue-600,#2563eb)", fontWeight: 700,
  };
  const btnDisabled: React.CSSProperties = {
    ...btn, opacity: 0.35, cursor: "not-allowed",
  };

  // Rango de páginas a mostrar (máximo 5)
  let inicio = Math.max(1, paginaActual - 2);
  let fin    = Math.min(totalPaginas, inicio + 4);
  if (fin - inicio < 4) inicio = Math.max(1, fin - 4);
  const paginas = Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);

  const desde = (paginaActual - 1) * porPagina + 1;
  const hasta  = Math.min(paginaActual * porPagina, total);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginTop: 16, fontFamily: "var(--font-sans,sans-serif)" }}>
      <span style={{ fontSize: "0.8rem", color: "var(--gray-400,#9ca3af)" }}>
        Mostrando {desde}–{hasta} de {total} registros
      </span>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <button
          style={paginaActual === 1 ? btnDisabled : btn}
          disabled={paginaActual === 1}
          onClick={() => onChange(paginaActual - 1)}
          title="Anterior"
        >
          <ChevronLeft size={14} />
        </button>

        {inicio > 1 && (
          <>
            <button style={btn} onClick={() => onChange(1)}>1</button>
            {inicio > 2 && <span style={{ color: "var(--gray-400)", fontSize: "0.8rem" }}>…</span>}
          </>
        )}

        {paginas.map(p => (
          <button
            key={p}
            style={p === paginaActual ? btnActive : btn}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ))}

        {fin < totalPaginas && (
          <>
            {fin < totalPaginas - 1 && <span style={{ color: "var(--gray-400)", fontSize: "0.8rem" }}>…</span>}
            <button style={btn} onClick={() => onChange(totalPaginas)}>{totalPaginas}</button>
          </>
        )}

        <button
          style={paginaActual === totalPaginas ? btnDisabled : btn}
          disabled={paginaActual === totalPaginas}
          onClick={() => onChange(paginaActual + 1)}
          title="Siguiente"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default Paginacion;