import React, { useState, useEffect } from "react";
import "../../styles/InicioSpAdmin.css";
import NavSpAdmin from "../components/NavSpAdmin";
import { Users, MapPin, Calendar, UserCheck, Activity } from "lucide-react";
import api from "../../api/axios";

const InicioSpAdmin: React.FC = () => {
  const nombre = localStorage.getItem("nombre") || "Super Admin";
  const [datos, setDatos]     = useState({ usuarios: 0, edificios: 0, eventos: 0, personal: 0, eventosActivos: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [rU, rL, rE, rP] = await Promise.all([
          api.get("/users"),
          api.get("/locations"),
          api.get("/events"),
          api.get("/personal"),
        ]);
        const eventos: any[] = rE.data?.data ?? rE.data ?? [];
        setDatos({
          usuarios:       (rU.data?.data ?? rU.data ?? []).length,
          edificios:      (rL.data?.data ?? rL.data ?? []).length,
          eventos:        eventos.length,
          eventosActivos: eventos.filter(e => e.activo).length,
          personal:       (rP.data?.data ?? rP.data ?? []).length,
        });
      } catch { /* silencioso */ }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const cards = [
    { icon: <Users size={22}/>,     label: "Usuarios",         val: datos.usuarios,       color: "#3b82f6", bg: "#dbeafe" },
    { icon: <MapPin size={22}/>,    label: "Edificios",        val: datos.edificios,      color: "#7c3aed", bg: "#ede9fe" },
    { icon: <Calendar size={22}/>,  label: "Eventos totales",  val: datos.eventos,        color: "#d97706", bg: "#fef9c3" },
    { icon: <Activity size={22}/>,  label: "Eventos activos",  val: datos.eventosActivos, color: "#16a34a", bg: "#dcfce7" },
    { icon: <UserCheck size={22}/>, label: "Personal",         val: datos.personal,       color: "#0891b2", bg: "#cffafe" },
  ];

  return (
    <div className="spadmin-container">
      <NavSpAdmin />
      <div className="spadmin-main-content">
        <header className="spadmin-topbar">
          <div>
            <h1>Bienvenido, {nombre}</h1>
            <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,.6)", fontSize: "0.85rem" }}>
              Panel de Super Administrador — resumen del sistema
            </p>
          </div>
        </header>

        <div className="spadmin-content-area">
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

export default InicioSpAdmin;