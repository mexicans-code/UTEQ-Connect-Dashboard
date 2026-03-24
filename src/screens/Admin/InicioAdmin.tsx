import React, { useState, useEffect } from "react";
import "../../styles/InicioAdmin.css";
import NavAdmin from "../components/NavAdmin";
import { Calendar, UserCheck, Activity, Users } from "lucide-react";
import api from "../../api/axios";

const InicioAdmin: React.FC = () => {
  const nombre = localStorage.getItem("nombre") || "Admin";
  const [datos, setDatos]     = useState({ eventos: 0, eventosActivos: 0, personal: 0, usuarios: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [rE, rP, rU] = await Promise.all([
          api.get("/events"),
          api.get("/personal"),
          api.get("/users"),
        ]);
        const eventos: any[] = rE.data?.data ?? rE.data ?? [];
        setDatos({
          eventos:        eventos.length,
          eventosActivos: eventos.filter(e => e.activo).length,
          personal:       (rP.data?.data ?? rP.data ?? []).length,
          usuarios:       (rU.data?.data ?? rU.data ?? []).length,
        });
      } catch { /* silencioso */ }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const cards = [
    { icon: <Calendar size={22}/>,  label: "Eventos totales",  val: datos.eventos,        color: "#d97706", bg: "#fef9c3" },
    { icon: <Activity size={22}/>,  label: "Eventos activos",  val: datos.eventosActivos, color: "#16a34a", bg: "#dcfce7" },
    { icon: <UserCheck size={22}/>, label: "Personal",         val: datos.personal,       color: "#0891b2", bg: "#cffafe" },
    { icon: <Users size={22}/>,     label: "Usuarios",         val: datos.usuarios,       color: "#3b82f6", bg: "#dbeafe" },
  ];

  return (
    <div className="admin-container">
      <NavAdmin />
      <div className="main-content">
        <header className="topbar">
          <div>
            <h1>Bienvenido, {nombre}</h1>
            <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,.6)", fontSize: "0.85rem" }}>
              Panel de Administrador
            </p>
          </div>
        </header>

        <div className="content-area">
          {loading ? (
            <p style={{ color: "var(--gray-400)", padding: 32, textAlign: "center" }}>Cargando datos…</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, padding: "24px 32px" }}>
              {cards.map(c => (
                <div key={c.label} style={{
                  background: "var(--white)", border: "1px solid var(--border)",
                  borderRadius: 12, padding: "20px 18px",
                  boxShadow: "0 1px 4px rgba(0,0,0,.06)",
                  display: "flex", flexDirection: "column", gap: 10,
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", color: c.color }}>
                    {c.icon}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: "1.7rem", fontWeight: 700, color: "var(--gray-800)", lineHeight: 1 }}>{c.val}</p>
                    <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--gray-500)" }}>{c.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InicioAdmin;