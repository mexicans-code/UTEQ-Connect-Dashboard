import React, { useState, useEffect } from "react";
import "../../styles/PanelMetricasEventos.css";
import NavAdmin from "../components/NavAdmin";
import { BarChart3, Users, CalendarCheck, TrendingUp, FileDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import api from "../../api/axios";
import { exportMetricasEventosPDF } from "../../utils/pdfExport";

interface Evento {
  _id: string;
  titulo: string;
  cupos: number;
  cuposDisponibles: number;
  activo: boolean;
}

interface Stats {
  eventoId: string;
  titulo: string;
  aceptadas: number;
  asistencias: number;
  noAsistio: number;
  pendientes: number;
  total: number;
}

const PanelMetricasEventos: React.FC = () => {
  const [stats, setStats]     = useState<Stats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const fetchStats = async () => {
    setLoading(true); setError("");
    try {
      const resEv = await api.get("/events");
      const rawEv = resEv.data;
      const eventos: Evento[] = Array.isArray(rawEv) ? rawEv : (rawEv.data ?? []);

      const resultados: Stats[] = await Promise.all(
        eventos.map(async (ev) => {
          try {
            const res = await api.get(`/invitaciones/event/${ev._id}/stats`);
            const s = res.data?.data ?? {};
            return {
              eventoId: ev._id,
              titulo: ev.titulo,
              aceptadas:   s.aceptadas   ?? 0,
              asistencias: s.asistencias ?? 0,
              noAsistio:   s.noAsistio   ?? 0,
              pendientes:  s.pendientes  ?? 0,
              total: (s.aceptadas ?? 0) + (s.enviadas ?? 0) + (s.rechazadas ?? 0),
            };
          } catch {
            return { eventoId: ev._id, titulo: ev.titulo, aceptadas: 0, asistencias: 0, noAsistio: 0, pendientes: 0, total: 0 };
          }
        })
      );
      setStats(resultados);
    } catch { setError("Error al cargar métricas."); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStats(); }, []);

  const totalEventos     = stats.length;
  const totalRegistrados = stats.reduce((a, s) => a + s.aceptadas, 0);
  const totalAsistencias = stats.reduce((a, s) => a + s.asistencias, 0);
  const pctGeneral       = totalRegistrados > 0 ? Math.round((totalAsistencias / totalRegistrados) * 100) : 0;

  const chartData = stats.map(s => ({
    nombre: s.titulo.length > 18 ? s.titulo.slice(0, 18) + "…" : s.titulo,
    Registrados: s.aceptadas,
    Asistieron: s.asistencias,
  }));

  return (
    <div className="met-admin-wrapper">
      <NavAdmin />
      <div className="met-main-panel">
        <header className="met-topbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1>Panel de Métricas y Supervisión</h1>
          <button
            onClick={() => exportMetricasEventosPDF(stats)}
            title="Descargar PDF"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 14px", borderRadius: "var(--radius-sm)",
              background: "#e53e3e", color: "#fff", border: "none",
              cursor: "pointer", fontSize: "0.85rem", fontWeight: 600,
            }}
          >
            <FileDown size={15} /> Descargar PDF
          </button>
        </header>
        <div className="met-content">
          {error && <p style={{ color: "var(--red-600)", background: "var(--red-50)", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: "0.875rem" }}>{error}</p>}

          {loading ? (
            <p style={{ color: "var(--gray-400)", padding: 32, textAlign: "center" }}>Cargando métricas…</p>
          ) : (
            <>
              <div className="met-kpi-grid">
                {[
                  { icon: <BarChart3 size={28}/>, val: totalEventos,     label: "Eventos totales"   },
                  { icon: <Users size={28}/>,     val: totalRegistrados, label: "Total registrados" },
                  { icon: <CalendarCheck size={28}/>, val: totalAsistencias, label: "Total asistencias" },
                  { icon: <TrendingUp size={28}/>, val: `${pctGeneral}%`, label: "% Asistencia gral." },
                ].map(k => (
                  <div className="met-card" key={k.label}>
                    {k.icon}
                    <h3>{k.val}</h3>
                    <p>{k.label}</p>
                  </div>
                ))}
              </div>

              {/* Aviso si todos los eventos tienen cero inscritos */}
              {stats.length > 0 && totalRegistrados === 0 && (
                <div style={{
                  background: "var(--gray-50)", border: "1px solid var(--border)",
                  borderRadius: 10, padding: "18px 20px", margin: "16px 0",
                  display: "flex", alignItems: "center", gap: 10, color: "var(--gray-500)", fontSize: "0.875rem"
                }}>
                  <span style={{ fontSize: "1.2rem" }}>📭</span>
                  <span>Ninguno de los eventos tiene inscritos todavía. Las métricas se mostrarán cuando los usuarios se registren desde la app móvil.</span>
                </div>
              )}

              {/* Gráfica — solo si hay al menos un evento con datos */}
              {chartData.filter(d => d.Registrados > 0 || d.Asistieron > 0).length > 0 && (
                <div className="met-chart-container">
                  <h2>Comparación por Evento</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.filter(d => d.Registrados > 0 || d.Asistieron > 0)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Registrados" fill="#3b82f6" />
                      <Bar dataKey="Asistieron"  fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {stats.length > 0 && (
                <div className="met-table">
                  <div className="met-row met-header">
                    <div>Evento</div><div>Registrados</div><div>Asistieron</div><div>% Asistencia</div>
                  </div>
                  {stats.map(s => {
                    const pct = s.aceptadas > 0 ? Math.round((s.asistencias / s.aceptadas) * 100) : 0;
                    return (
                      <div className="met-row" key={s.eventoId}>
                        <div>{s.titulo}</div>
                        <div style={{ color: s.aceptadas === 0 ? "var(--gray-400)" : "inherit" }}>
                          {s.aceptadas === 0 ? "—" : s.aceptadas}
                        </div>
                        <div style={{ color: s.asistencias === 0 ? "var(--gray-400)" : "inherit" }}>
                          {s.asistencias === 0 ? "—" : s.asistencias}
                        </div>
                        <div>
                          <span className="met-percent" style={{ opacity: s.aceptadas === 0 ? 0.4 : 1 }}>
                            {pct}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PanelMetricasEventos;