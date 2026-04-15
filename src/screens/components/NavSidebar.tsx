import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../styles/NavSidebar.css";
import profile from "../../assets/Perfil.png";
import ThemeToggle from "./dark/ThemeToggle";
import {
  MapPin, Calendar, LogOut,
  Pencil, Users, UserCog, Map, Shield, LayoutDashboard, LayoutGrid,
} from "lucide-react";

interface NavSidebarProps {
  rol: "admin" | "superadmin";
}

const MIN_WIDTH = 60;
const MAX_WIDTH = 320;
const COLLAPSED_WIDTH = 60;
const DEFAULT_WIDTH = 220;
const SNAP_THRESHOLD = 100; // si arrastras por debajo de este ancho, colapsa

const NavSidebar: React.FC<NavSidebarProps> = ({ rol }) => {
  const [width, setWidth]         = useState<number>(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const [dragging, setDragging]   = useState(false);
  const [fotoSrc, setFotoSrc]     = useState<string>(localStorage.getItem("imagenPerfil") || "");
  const [nombreSrc, setNombreSrc] = useState<string>(
    localStorage.getItem("nombre") || (rol === "superadmin" ? "Super Admin" : "Administrador")
  );
  const startX   = useRef(0);
  const startW   = useRef(DEFAULT_WIDTH);
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const base     = rol === "superadmin" ? "/admin-sp" : "/admin";

  useEffect(() => {
    const sync = () => {
      setFotoSrc(localStorage.getItem("imagenPerfil") || "");
      setNombreSrc(
        localStorage.getItem("nombre") ||
        (rol === "superadmin" ? "Super Admin" : "Administrador")
      );
    };
    window.addEventListener("storage", sync);
    sync();
    return () => window.removeEventListener("storage", sync);
  }, [rol]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startX.current = e.clientX;
    startW.current = collapsed ? COLLAPSED_WIDTH : width;
    setDragging(true);
  }, [collapsed, width]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const newW = startW.current + (e.clientX - startX.current);
      if (newW < SNAP_THRESHOLD) {
        setCollapsed(true);
        setWidth(COLLAPSED_WIDTH);
      } else {
        setCollapsed(false);
        setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH + 40, newW)));
      }
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  const sidebarStyle = {
    width:    collapsed ? COLLAPSED_WIDTH : width,
    minWidth: collapsed ? COLLAPSED_WIDTH : width,
  };

  return (
    <aside
      className={`sidebar ${collapsed ? "collapsed" : ""} ${dragging ? "dragging" : ""}`}
      style={sidebarStyle}
    >
      {/* ── Drag handle ── */}
      <div className="sidebar-resize-handle" onMouseDown={onMouseDown} title="Arrastra para redimensionar">
        <div className="sidebar-resize-line" />
      </div>

      <div className="profile-section">
        <div className="profile-wrapper">
          <img src={fotoSrc || profile} alt="Perfil" className="profile-img" />
          <button
            className="edit-profile-btn"
            onClick={() => navigate(`${base}/perfil`)}
            title="Ver mi perfil"
          >
            <Pencil className="edit-icon" />
          </button>
        </div>
        {!collapsed && (
          <>
            <p className="profile-name">{nombreSrc}</p>
            <p className="profile-role">
              {rol === "superadmin" ? "Panel SuperAdmin" : "Panel Admin"}
            </p>
          </>
        )}
      </div>

      <nav className="menu">
        {!collapsed && <div className="menu-label">Navegación</div>}

        {/* Inicio — ahora incluye métricas/reportes */}
        <button
          className={isActive(base) ? "active" : ""}
          onClick={() => navigate(base)}
        >
          <LayoutDashboard size={18} />
          {!collapsed && <span>Inicio</span>}
        </button>

        <button
          className={isActive(`${base}/usuarios`) ? "active" : ""}
          onClick={() => navigate(`${base}/usuarios`)}
        >
          <Users size={18} />
          {!collapsed && <span>Gestión de Usuarios</span>}
        </button>

        <button
          className={isActive(`${base}/personal`) ? "active" : ""}
          onClick={() => navigate(`${base}/personal`)}
        >
          <UserCog size={18} />
          {!collapsed && <span>{rol === "superadmin" ? "Gestión de Personal" : "Personal"}</span>}
        </button>

        {rol === "admin" && (
          <button
            className={isActive("/admin/ubicaciones") ? "active" : ""}
            onClick={() => navigate("/admin/ubicaciones")}
          >
            <MapPin size={18} />
            {!collapsed && <span>Gestión de Ubicaciones</span>}
          </button>
        )}

        <button
          className={isActive(`${base}/eventos`) ? "active" : ""}
          onClick={() => navigate(`${base}/eventos`)}
        >
          <Calendar size={18} />
          {!collapsed && <span>Gestión de Eventos</span>}
        </button>

        {/* ── Items exclusivos SuperAdmin ── */}
        {rol === "superadmin" && (
          <>
            <button
              className={isActive("/admin-sp/edificios-rutas") ? "active" : ""}
              onClick={() => navigate("/admin-sp/edificios-rutas")}
            >
              <Map size={18} />
              {!collapsed && <span>Edificios y Rutas</span>}
            </button>

            <button
              className={isActive("/admin-sp/espacios") ? "active" : ""}
              onClick={() => navigate("/admin-sp/espacios")}
            >
              <LayoutGrid size={18} />
              {!collapsed && <span>Aulas Existentes</span>}
            </button>

            <button
              className={isActive("/admin-sp/logs") ? "active" : ""}
              onClick={() => navigate("/admin-sp/logs")}
            >
              <Shield size={18} />
              {!collapsed && <span>Seguridad del Sistema</span>}
            </button>
          </>
        )}

        {/* ── "Supervisión y Métricas" y "Monitoreo y Reportes"
             han sido eliminados — ahora están integrados en Inicio ── */}
      </nav>

      <div className="logout">
        <div className="nav-theme-toggle">
          <ThemeToggle showLabel={!collapsed} />
        </div>
        <button
          className="logout-btn"
          onClick={() => { localStorage.clear(); navigate("/login"); }}
        >
          <LogOut size={16} />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
};

export default NavSidebar;