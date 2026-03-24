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
          <img src={logo} alt="Logo" className="logo" />
        </div>

        <div className="buttons-container">
          <button
            className="btn-primary"
            onClick={() => navigate("/login")}
          >
            Inicio de Sesión
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
        alt="Proyecto" 
        className="footer-logo small"
      />
    </div>

    {/* Contacto */}
    <div className="footer-section">
      <h4>Contacto</h4>
      <p>Teléfono: (442) 209 61 00</p>
    </div>

    {/* Enlaces */}
    <div className="footer-section links">
      <h4>Enlaces</h4>
      <a href="#">Portal de alumnos</a>
      <a href="#">Proveedores</a>
      <a href="#">Sistema SRFT</a>
      <a href="#">Portal de Idiomas</a>
    </div>

  </div>

  <p className="footer-copy">© 2026 UTEQ - Todos los derechos reservados</p>
</footer>
    </div>
    
  );
};

export default HomeScreen;