import React, { useState, useEffect } from "react";
import "../../styles/Reportes.css";
import NavSpAdmin from "../components/NavSpAdmin";
import { Users, Map, Calendar, UserCheck, FileDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import api from "../../api/axios";
import { exportReportesPDF } from "../../utils/pdfExport";

const COLORS = ["#2563eb", "#16a34a", "#d97706", "#7c3aed"];

const Reportes: React.FC = () => {
  const [totales, setTotales] = useState({ usuarios: 0, edificios: 0, eventos: 0, eventosActivos: 0, eventosInactivos: 0, personal: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true); setError("");
      try {
        const [rUsers, rLoc, rEv, rPersonal] = await Promise.all([
          api.get("/users"),
          api.get("/locations"),
          api.get("/events"),
          api.get("/personal"),
        ]);

        const usuarios  = (rUsers.data?.data    ?? rUsers.data    ?? []).length;
        const edificios = (rLoc.data?.data      ?? rLoc.data      ?? []).length;
        const personal  = (rPersonal.data?.data ?? rPersonal.data ?? []).length;
        const eventos: any[] = rEv.data?.data ?? rEv.data ?? [];
        const eventosActivos   = eventos.filter(e => e.activo).length;
        const eventosInactivos = eventos.filter(e => !e.activo).length;

        setTotales({ usuarios, edificios, eventos: eventos.length, eventosActivos, eventosInactivos, personal });
      } catch { setError("Error al cargar datos del sistema."); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const dataGeneral = [
    { name: "Usuarios",   total: totales.usuarios   },
    { name: "Edificios",  total: totales.edificios  },
    { name: "Eventos",    total: totales.eventos    },
    { name: "Personal",   total: totales.personal   },
  ];

  const dataEventos = [
    { name: "Activos",   value: totales.eventosActivos   },
    { name: "Inactivos", value: totales.eventosInactivos },
  ];

  return (
    <div className="reportes-container">
      <NavSpAdmin />
      <div className="reportes-main">
        <header className="reportes-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1>Monitoreo y Reportes del Sistema</h1>
          {!loading && !error && (
            <button
              onClick={() => exportReportesPDF(totales)}
              title="Descargar PDF"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 14px", borderRadius: "var(--radius-sm)",
                background: "#e53e3e", color: "#fff", border: "none",
                cursor: "pointer", fontSize: "0.85rem", fontWeight: 600,
              }}
            >
              <FileDown size={15} /> Descargar Reporte PDF
            </button>
          )}
        </header>
        <div className="reportes-content">
          {error && <p style={{ color: "var(--red-600)", background: "var(--red-50)", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: "0.875rem" }}>{error}</p>}

          {loading ? (
            <p style={{ color: "var(--gray-400)", padding: 32, textAlign: "center" }}>Cargando reportes…</p>
          ) : (
            <>
              <div className="reportes-cards">
                {[
                  { icon: <Users size={28}/>,     val: totales.usuarios,  label: "Usuarios Registrados"  },
                  { icon: <Map size={28}/>,        val: totales.edificios, label: "Edificios y Rutas"     },
                  { icon: <Calendar size={28}/>,   val: totales.eventos,   label: "Eventos Totales"       },
                  { icon: <UserCheck size={28}/>,  val: totales.personal,  label: "Personal Registrado"   },
                ].map(c => (
                  <div className="reportes-card" key={c.label}>
                    {c.icon}
                    <h3>{c.val}</h3>
                    <p>{c.label}</p>
                  </div>
                ))}
              </div>

              <div className="reportes-graficas">
                <div className="grafica-box">
                  <h3>Resumen General</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={dataGeneral}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#3b82f6" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grafica-box">
                  <h3>Estado de Eventos</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={dataEventos} cx="50%" cy="50%" outerRadius={90} dataKey="value" label>
                        {dataEventos.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reportes;