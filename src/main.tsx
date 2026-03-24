import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";

/* ============================
   SERVICE WORKER + NOTIFICACIONES
============================ */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registrado correctamente');

      // Pedir permiso para notificaciones
      if ('Notification' in window) {
        await Notification.requestPermission();
      }

      // Escuchar cuando hay una nueva versión del SW lista
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

    } catch (error) {
      console.error('Error al registrar el Service Worker:', error);
    }
  });
}

/* ============================
   RENDER DE LA APP
============================ */

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);