import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/login.css";
import "../styles/HomeScreen.css";
import fondo from "../assets/FondoLogin.png";
import api from "../api/axios";
import ThemeToggle from "./components/dark/ThemeToggle";
import { suscribirPush } from "../utils/notify";

const LoginScreen: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    // ── Sin conexión: intentar con sesión guardada ──
    if (!navigator.onLine) {
      const token = localStorage.getItem("token");
      const rol   = localStorage.getItem("rol");
      if (token && rol) {
        if (rol === "superadmin") navigate("/admin-sp");
        else navigate("/admin");
      } else {
        setError("Sin conexión a internet. Inicia sesión en línea al menos una vez para poder acceder sin conexión.");
      }
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      const data = res.data;

      if (data.success) {
        const { user, token } = data.data;

        // Guardar sesión
        localStorage.setItem("token", token);
        localStorage.setItem("userId", user._id);
        localStorage.setItem("nombre", user.nombre);
        localStorage.setItem("email", user.email);
        localStorage.setItem("rol", user.rol);
        localStorage.setItem("imagenPerfil", user.imagenPerfil || "");

        // Pedir permiso de notificaciones y suscribir push tras login exitoso
        if ('Notification' in window && Notification.permission !== 'denied') {
          Notification.requestPermission().then(permiso => {
            if (permiso === 'granted') suscribirPush();
          });
        }

        // Si debe cambiar contraseña, redirigir primero
        if (user.requiereCambioPassword) {
          navigate("/cambio-password");
          return;
        }

        // Redirigir según rol
        if (user.rol === "superadmin") {
          navigate("/admin-sp");
        } else if (user.rol === "admin") {
          navigate("/admin");
        } else {
          setError("No tienes permisos para acceder al dashboard.");
          localStorage.clear();
        }
      } else {
        setError(data.error || "Credenciales incorrectas.");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "No se pudo conectar al servidor. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // Permitir login con Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) handleLogin();
  };


  return (
    <div
      className="home-container"
      style={{ backgroundImage: `url(${fondo})` }}
    >
      <div className="home-theme-toggle">
        <ThemeToggle showLabel={true} />
      </div>

      <button
        className="back-button"
        onClick={() => navigate("/")}
        disabled={loading}
        type="button"
      >
        ← Volver
      </button>
      <div className="overlay">
        <div className="login-card">
          <h2>Acceso al Sistema</h2>
          <p className="login-subtitle">Ingresa tus credenciales para continuar</p>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <div className="input-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="tu.correo@ejemplo.com"
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <button
            className="login-button"
            onClick={handleLogin}
            disabled={loading}
            type="button"
          >
            {loading ? (
              <>
                <span style={{ marginRight: "8px" }}>⏳</span>
                Iniciando sesión...
              </>
            ) : (
              "Iniciar Sesión"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;