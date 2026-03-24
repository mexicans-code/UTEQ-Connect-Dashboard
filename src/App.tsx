import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import HomeScreen from "./screens/homescreen";
import LoginScreen from "./screens/Login";
import InicioAdmin from "./screens/Admin/InicioAdmin";
import InicioSpAdmin from "./screens/SuperAdmin/InicioSpAdmin";
import Gestion_Ubicaciones from "./screens/Admin/Gestion_Ubicaciones";
import GestionEventos from "./screens/Admin/GestionEventos";
import PanelMetricasEventos from "./screens/Admin/PanelMetricasEventos";
import Usuarios from "./screens/SuperAdmin/Usuarios";
import UsuarioA from "./screens/Admin/Usuarios";
import EdificiosRutas from "./screens/SuperAdmin/EdificiosRutas";
import Eventos from "./screens/SuperAdmin/Eventos";
import Logs from "./screens/SuperAdmin/Logs";
import Reportes from "./screens/SuperAdmin/Reportes";
import PersonalAdmin   from "./screens/Admin/PersonalAdmin";
import PersonalSpAdmin from "./screens/SuperAdmin/PersonalSpAdmin";
import Espacios from "./screens/SuperAdmin/Espacios";
import Perfil from "./screens/Perfil";
import CambioPassword from "./screens/CambioPassword";

/* ── Guard: verifica token y rol antes de mostrar la ruta ── */
const RequireAuth = ({ rol, children }: { rol?: string; children: React.ReactElement }) => {
  const token  = localStorage.getItem("token");
  const rolActual = localStorage.getItem("rol");
  if (!token) return <Navigate to="/login" replace />;
  if (rol && rolActual !== rol) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <Routes>
      {/* ── Públicas ── */}
      <Route path="/" element={<HomeScreen />} />
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/cambio-password" element={<RequireAuth><CambioPassword /></RequireAuth>} />

      {/* ── Admin ── */}
      <Route path="/admin"             element={<RequireAuth rol="admin"><InicioAdmin /></RequireAuth>} />
      <Route path="/admin/ubicaciones" element={<RequireAuth rol="admin"><Gestion_Ubicaciones /></RequireAuth>} />
      <Route path="/admin/eventos"     element={<RequireAuth rol="admin"><GestionEventos /></RequireAuth>} />
      <Route path="/admin/metricas"    element={<RequireAuth rol="admin"><PanelMetricasEventos /></RequireAuth>} />
      <Route path="/admin/usuarios"    element={<RequireAuth rol="admin"><UsuarioA /></RequireAuth>} />
      <Route path="/admin/personal"    element={<RequireAuth rol="admin"><PersonalAdmin /></RequireAuth>} />
      <Route path="/admin/perfil"      element={<RequireAuth rol="admin"><Perfil /></RequireAuth>} />

      {/* ── SuperAdmin ── */}
      <Route path="/admin-sp"                element={<RequireAuth rol="superadmin"><InicioSpAdmin /></RequireAuth>} />
      <Route path="/admin-sp/usuarios"       element={<RequireAuth rol="superadmin"><Usuarios /></RequireAuth>} />
      <Route path="/admin-sp/edificios-rutas" element={<RequireAuth rol="superadmin"><EdificiosRutas /></RequireAuth>} />
      <Route path="/admin-sp/eventos"        element={<RequireAuth rol="superadmin"><Eventos /></RequireAuth>} />
      <Route path="/admin-sp/logs"           element={<RequireAuth rol="superadmin"><Logs /></RequireAuth>} />
      <Route path="/admin-sp/espacios"       element={<RequireAuth rol="superadmin"><Espacios /></RequireAuth>} />
      <Route path="/admin-sp/reportes"       element={<RequireAuth rol="superadmin"><Reportes /></RequireAuth>} />
      <Route path="/admin-sp/personal"       element={<RequireAuth rol="superadmin"><PersonalSpAdmin /></RequireAuth>} />
      <Route path="/admin-sp/perfil"         element={<RequireAuth rol="superadmin"><Perfil /></RequireAuth>} />


      {/* ── Fallback ── */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;