import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/login.css";
import "../styles/HomeScreen.css";
import fondo from "../assets/FondoLogin.png";
import { API_URL } from "../api/config";
import ThemeToggle from "../components/ThemeToggle";

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

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const { user, token } = data.data;

        // Guardar sesión
        localStorage.setItem("token", token);
        localStorage.setItem("userId", user._id);
        localStorage.setItem("nombre", user.nombre);
        localStorage.setItem("email", user.email);
        localStorage.setItem("rol", user.rol);
        localStorage.setItem("imagenPerfil", user.imagenPerfil || "");

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
    } catch (err) {
      setError("No se pudo conectar al servidor. Intenta de nuevo.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Permitir login con Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };


  return (
    <div
      className="home-container"
      style={{ backgroundImage: `url(${fondo})` }}
    >
      <div className="home-theme-toggle">
        <ThemeToggle showLabel={true} />
      </div>
      <div className="overlay">
        <div className="login-card">
          <h2>Inicio de Sesión</h2>

          <div className="input-group">
            <label>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="correo@ejemplo.com"
              required
            />
          </div>

          <div className="input-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p style={{ color: "#ff6b6b", fontSize: "0.85rem", marginBottom: "8px" }}>
              {error}
            </p>
          )}

          <button
            className="login-button"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </button>


        </div>
      </div>
    </div>
  );
};

export default LoginScreen;