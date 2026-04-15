import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Eye, EyeOff, Lock } from "lucide-react";
import { changePassword } from "../api/users";

const CambioPassword: React.FC = () => {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError]                     = useState("");
  const [loading, setLoading]                 = useState(false);
  const [showCurrent, setShowCurrent]         = useState(false);
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);

  const nombre = localStorage.getItem("nombre") || "Administrador";
  const rol    = localStorage.getItem("rol") || "admin";

  const handleSubmit = async () => {
    setError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Todos los campos son obligatorios.");
      return;
    }
    if (newPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("La nueva contraseña debe ser diferente a la actual.");
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      // Cambio exitoso — redirigir
      if (rol === "superadmin") {
        navigate("/admin-sp");
      } else {
        navigate("/admin");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "No se pudo conectar al servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 40px 10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: "0.92rem",
    outline: "none",
    background: "#fff",
    boxSizing: "border-box",
  };

  const eyeBtn: React.CSSProperties = {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#9ca3af",
    padding: 0,
    display: "flex",
    alignItems: "center",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', sans-serif",
      padding: 16,
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 16,
        padding: "36px 32px",
        width: "100%",
        maxWidth: 420,
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        {/* Icono */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "rgba(139,92,246,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 12px",
          }}>
            <ShieldCheck size={32} color="#8b5cf6" />
          </div>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#1f2937" }}>
            Cambio de contraseña
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: "0.88rem", color: "#6b7280" }}>
            Hola, <strong>{nombre}</strong>. Por seguridad, debes establecer una nueva contraseña antes de continuar.
          </p>
        </div>

        {/* Aviso */}
        <div style={{
          background: "rgba(139,92,246,0.07)",
          border: "1px solid rgba(139,92,246,0.2)",
          borderRadius: 8, padding: "10px 14px",
          fontSize: "0.82rem", color: "#6d28d9",
          marginBottom: 20, display: "flex", gap: 8, alignItems: "flex-start",
        }}>
          <Lock size={14} style={{ marginTop: 2, flexShrink: 0 }} />
          <span>Tu contraseña actual es temporal. Este paso solo se realiza una vez.</span>
        </div>

        {/* Campo contraseña actual */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: 5 }}>
            Contraseña actual (temporal)
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={e => { setCurrentPassword(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              style={inputStyle}
            />
            <button style={eyeBtn} onClick={() => setShowCurrent(v => !v)}>
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Nueva contraseña */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: 5 }}>
            Nueva contraseña
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="Mínimo 8 caracteres"
              style={inputStyle}
            />
            <button style={eyeBtn} onClick={() => setShowNew(v => !v)}>
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Confirmar */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: 5 }}>
            Confirmar nueva contraseña
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="Repite la nueva contraseña"
              style={inputStyle}
            />
            <button style={eyeBtn} onClick={() => setShowConfirm(v => !v)}>
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p style={{
            color: "#ef4444", fontSize: "0.83rem",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 6, padding: "8px 12px", margin: "0 0 16px",
          }}>
            {error}
          </p>
        )}

        {/* Botón */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            background: loading ? "#c4b5fd" : "#8b5cf6",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}
        >
          {loading ? "Guardando…" : "Establecer nueva contraseña"}
        </button>
      </div>
    </div>
  );
};

export default CambioPassword;