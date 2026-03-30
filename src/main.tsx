import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";

/* ============================
   SERVICE WORKER + NOTIFICACIONES
============================ */

// Solo registrar SW en producción, no en desarrollo (permite hot reload)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registrado correctamente');

      // Escuchar cuando hay una nueva versión disponible
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        console.log('Nueva versión del SW disponible');
        
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            console.log('Recargando para aplicar nueva versión...');
            window.location.reload();
          }
        });
      });

      // Pedir permiso para notificaciones
      if ('Notification' in window) {
        await Notification.requestPermission();
      }

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