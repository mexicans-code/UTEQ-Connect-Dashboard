import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ChevronLeft, ChevronRight,
  Users, Map, Calendar, Shield, BarChart3, LogOut, Pencil, UserCog,
} from "lucide-react";
import "../../styles/NavSpAdmin.css";
import profile from "../../assets/Perfil.png";
import ThemeToggle from "../ThemeToggle";

const NavSpAdmin: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [fotoSrc, setFotoSrc]     = useState<string>(localStorage.getItem("imagenPerfil") || "");
  const [nombreSrc, setNombreSrc]   = useState<string>(localStorage.getItem("nombre") || "Super Admin");
  const navigate  = useNavigate();
  const location  = useLocation();
  const isActive  = (path: string) => location.pathname === path;
  
  useEffect(() => {
    const sync = () => {
      setFotoSrc(localStorage.getItem("imagenPerfil") || "");
      setNombreSrc(localStorage.getItem("nombre") || "Super Admin");
    };
    window.addEventListener("storage", sync);
    sync();
    return () => window.removeEventListener("storage", sync);
  }, []);
  
  return (
    <aside className={`spadmin-sidebar ${collapsed ? "collapsed" : ""}`}>

      <div className="spadmin-collapse-btn" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </div>

      <div className="spadmin-profile-section">
        <div className="spadmin-profile-wrapper">
          <img src={fotoSrc || profile} alt="Perfil" className="spadmin-profile-img" />
          <button className="spadmin-edit-profile-btn" onClick={() => navigate("/admin-sp/perfil")} title="Ver mi perfil">
            <Pencil className="spadmin-edit-icon" />
          </button>
        </div>
        {!collapsed && (
          <>
            <p className="profile-name" style={{ color:"rgba(255,255,255,.85)", fontSize:"0.82rem", fontWeight:600, marginTop:8 }}>
              {nombreSrc}
            </p>
            <p className="profile-role" style={{ color:"var(--blue-300)", fontSize:"0.72rem" }}>
              Panel SuperAdmin
            </p>
          </>
        )}
      </div>

      <nav className="spadmin-menu">

        <button className={isActive("/admin-sp/usuarios") ? "active" : ""} onClick={() => navigate("/admin-sp/usuarios")}>
          <Users size={18} />
          {!collapsed && <span>Gestión de Usuarios</span>}
        </button>

        {/* ── NUEVO: Personal ── */}
        <button className={isActive("/admin-sp/personal") ? "active" : ""} onClick={() => navigate("/admin-sp/personal")}>
          <UserCog size={18} />
          {!collapsed && <span>Gestión de Personal</span>}
        </button>

        <button className={isActive("/admin-sp/edificios-rutas") ? "active" : ""} onClick={() => navigate("/admin-sp/edificios-rutas")}>
          <Map size={18} />
          {!collapsed && <span>Edificios y Rutas</span>}
        </button>

        <button className={isActive("/admin-sp/espacios") ? "active" : ""} onClick={() => navigate("/admin-sp/espacios")}>
          <Shield size={18} />
          {!collapsed && <span>Aulas Existentes</span>}
        </button>

        <button className={isActive("/admin-sp/eventos") ? "active" : ""} onClick={() => navigate("/admin-sp/eventos")}>
          <Calendar size={18} />
          {!collapsed && <span>Gestión de Eventos</span>}
        </button>

        <button className={isActive("/admin-sp/logs") ? "active" : ""} onClick={() => navigate("/admin-sp/logs")}>
          <Shield size={18} />
          {!collapsed && <span>Seguridad del Sistema</span>}
        </button>

        <button className={isActive("/admin-sp/reportes") ? "active" : ""} onClick={() => navigate("/admin-sp/reportes")}>
          <BarChart3 size={18} />
          {!collapsed && <span>Monitoreo y Reportes</span>}
        </button>

      </nav>

      <div className="spadmin-logout">
        <div className="nav-theme-toggle">
          <ThemeToggle showLabel={!collapsed} />
        </div>
        <button className="spadmin-logout-btn" onClick={() => { localStorage.clear(); navigate("/login"); }}>
          <LogOut size={16} />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
};

export default NavSpAdmin;