import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../styles/NavAdmin.css";
import profile from "../../assets/Perfil.png";
import ThemeToggle from "../ThemeToggle";
import {
  MapPin, Calendar,
  BarChart3, LogOut, ChevronLeft, ChevronRight,
  Pencil, Users, UserCog,
} from "lucide-react";

const NavAdmin: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [fotoSrc, setFotoSrc]     = useState<string>(localStorage.getItem("imagenPerfil") || "");
  const [nombreSrc, setNombreSrc]   = useState<string>(localStorage.getItem("nombre") || "Administrador");
  const navigate  = useNavigate();
  const location  = useLocation();
  const isActive  = (path: string) => location.pathname === path;

  useEffect(() => {
    const sync = () => {
      setFotoSrc(localStorage.getItem("imagenPerfil") || "");
      setNombreSrc(localStorage.getItem("nombre") || "Administrador");
    };
    window.addEventListener("storage", sync);
    sync();
    return () => window.removeEventListener("storage", sync);
  }, []);

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>

      <div className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </div>

      <div className="profile-section">
        <div className="profile-wrapper">
           <img src={fotoSrc || profile} alt="Perfil" className="profile-img" />
          <button className="edit-profile-btn" onClick={() => navigate("/admin/perfil")} title="Ver mi perfil">
            <Pencil className="edit-icon" />
          </button>
        </div>
        {!collapsed && (
          <>
            <p className="profile-name">{nombreSrc}</p>
            <p className="profile-role">Panel Admin</p>
          </>
        )}
      </div>

      <nav className="menu">
        {!collapsed && <div className="menu-label">Navegación</div>}

        <button className={isActive("/admin/usuarios") ? "active" : ""} onClick={() => navigate("/admin/usuarios")}>
          <Users size={18} />
          {!collapsed && <span>Gestión de Usuarios</span>}
        </button>

        <button className={isActive("/admin/ubicaciones") ? "active" : ""} onClick={() => navigate("/admin/ubicaciones")}>
          <MapPin size={18} />
          {!collapsed && <span>Gestión de Ubicaciones</span>}
        </button>

        <button className={isActive("/admin/eventos") ? "active" : ""} onClick={() => navigate("/admin/eventos")}>
          <Calendar size={18} />
          {!collapsed && <span>Gestión de Eventos</span>}
        </button>

        <button className={isActive("/admin/personal") ? "active" : ""} onClick={() => navigate("/admin/personal")}>
          <UserCog size={18} />
          {!collapsed && <span>Personal</span>}
        </button>


        <button className={isActive("/admin/metricas") ? "active" : ""} onClick={() => navigate("/admin/metricas")}>
          <BarChart3 size={18} />
          {!collapsed && <span>Supervisión y Métricas</span>}
        </button>
      </nav>

      <div className="logout">
        <div className="nav-theme-toggle">
          <ThemeToggle showLabel={!collapsed} />
        </div>
        <button className="logout-btn" onClick={() => { localStorage.clear(); navigate("/login"); }}>
          <LogOut size={16} />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
};

export default NavAdmin;