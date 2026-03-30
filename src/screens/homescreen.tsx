import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/HomeScreen.css";
import fondo from "../assets/FondoInicio.png";
import logo from "../assets/Logo.png";
import ThemeToggle from "../components/ThemeToggle";

const HomeScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      className="home-container"
      style={{ backgroundImage: `url(${fondo})` }}
    >
      <div className="home-theme-toggle">
        <ThemeToggle showLabel={true} />
      </div>
      <div className="overlay">
        <div className="logo-container">
          <img src={logo} alt="Logo UTEQ Connect" className="logo" />
        </div>

        <div className="buttons-container">
          <button
            className="btn-primary"
            onClick={() => navigate("/login")}
            type="button"
          >
            Acceder al Sistema
          </button>
        </div>
      </div>
      
      <footer className="footer">
        <div className="footer-content">

          {/* LOGOS */}
          <div className="footer-section logos">
            <img 
              src="https://www.uteq.edu.mx/assets/img/logos/uteq/logo_halcon_blanco.png" 
              alt="UTEQ" 
              className="footer-logo"
            />
            <img 
              src={logo} 
              alt="UTEQ Connect" 
              className="footer-logo small"
            />
          </div>

          {/* Contacto */}
          <div className="footer-section">
            <h4>Contacto</h4>
            <p>Teléfono: (442) 209 61 00</p>
            <p>Email: soporte@uteq.edu.mx</p>
          </div>

          {/* Enlaces */}
          <div className="footer-section links">
            <h4>Enlaces Útiles</h4>
            <a href="https://www.uteq.edu.mx" target="_blank" rel="noopener noreferrer">Sitio Web UTEQ</a>
            <a href="#" title="Próximamente">Portal de Alumnos</a>
            <a href="#" title="Próximamente">Sistema de Proveedores</a>
          </div>

        </div>

        <p className="footer-copy">
          © 2026 UTEQ - UTEQ Connect Sistema de Gestión de Espacios • Todos los derechos reservados
        </p>
      </footer>
    </div>
    
  );
};

export default HomeScreen;