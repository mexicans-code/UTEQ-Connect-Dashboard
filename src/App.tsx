import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import OfflineBanner from "./screens/components/OfflineBanner";
import HomeScreen from "./screens/homescreen";
import LoginScreen from "./screens/Login";
import Inicio from "./screens/Inicio";
import Gestion_Ubicaciones from "./screens/Admin/Gestion_Ubicaciones";
import Usuarios from "./screens/Usuarios";
import EdificiosRutas from "./screens/SuperAdmin/EdificiosRutas";
import Eventos from "./screens/Eventos";
import Logs from "./screens/SuperAdmin/Logs";
import GestionPersonal from "./screens/GestionPersonal";
import Espacios from "./screens/SuperAdmin/Espacios";
import Perfil from "./screens/Perfil";
import CambioPassword from "./screens/CambioPassword";
import InscritosEvento from "./screens/InscritosEvento";

/* ── Guard: verifica token y rol antes de mostrar la ruta ── */
const RequireAuth = ({
  rol,
  allowedRoles,
  children,
}: {
  rol?          : string;
  allowedRoles? : string[];
  children      : React.ReactElement;
}) => {
  const token     = localStorage.getItem("token");
  const rolActual = localStorage.getItem("rol") ?? "";
  if (!token) return <Navigate to="/login" replace />;
  if (rol          && rolActual !== rol)                  return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(rolActual)) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <>
      <OfflineBanner />
      <Routes>
        {/* ── Públicas ── */}
        <Route path="/" element={<HomeScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/cambio-password" element={<RequireAuth allowedRoles={["admin", "superadmin"]}><CambioPassword /></RequireAuth>} />

        {/* ── Admin ── */}
        {/* /admin ahora muestra Inicio que incluye métricas de eventos */}
        <Route path="/admin"               element={<RequireAuth rol="admin"><Inicio /></RequireAuth>} />
        <Route path="/admin/ubicaciones"   element={<RequireAuth rol="admin"><Gestion_Ubicaciones /></RequireAuth>} />
        <Route path="/admin/inscritos/:id" element={<RequireAuth rol="admin"><InscritosEvento /></RequireAuth>} />
        <Route path="/admin/usuarios"      element={<RequireAuth rol="admin"><Usuarios /></RequireAuth>} />
        <Route path="/admin/personal"      element={<RequireAuth rol="admin"><GestionPersonal rol="admin" /></RequireAuth>} />
        <Route path="/admin/perfil"        element={<RequireAuth rol="admin"><Perfil /></RequireAuth>} />
        <Route path="/admin/eventos"       element={<RequireAuth rol="admin"><Eventos /></RequireAuth>} />
        {/* Ruta de métricas eliminada — integrada en /admin */}
        <Route path="/admin/metricas"      element={<Navigate to="/admin" replace />} />

        {/* ── SuperAdmin ── */}
        {/* /admin-sp ahora muestra Inicio que incluye reportes del sistema */}
        <Route path="/admin-sp"                 element={<RequireAuth rol="superadmin"><Inicio /></RequireAuth>} />
        <Route path="/admin-sp/usuarios"        element={<RequireAuth rol="superadmin"><Usuarios /></RequireAuth>} />
        <Route path="/admin-sp/edificios-rutas" element={<RequireAuth rol="superadmin"><EdificiosRutas /></RequireAuth>} />
        <Route path="/admin-sp/eventos"         element={<RequireAuth rol="superadmin"><Eventos /></RequireAuth>} />
        <Route path="/admin-sp/inscritos/:id"   element={<RequireAuth rol="superadmin"><InscritosEvento /></RequireAuth>} />
        <Route path="/admin-sp/logs"            element={<RequireAuth rol="superadmin"><Logs /></RequireAuth>} />
        <Route path="/admin-sp/espacios"        element={<RequireAuth rol="superadmin"><Espacios /></RequireAuth>} />
        <Route path="/admin-sp/personal"        element={<RequireAuth rol="superadmin"><GestionPersonal rol="superadmin" /></RequireAuth>} />
        <Route path="/admin-sp/perfil"          element={<RequireAuth rol="superadmin"><Perfil /></RequireAuth>} />
        {/* Ruta de reportes eliminada — integrada en /admin-sp */}
        <Route path="/admin-sp/reportes"        element={<Navigate to="/admin-sp" replace />} />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default App;