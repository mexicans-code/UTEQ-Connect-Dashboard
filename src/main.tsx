import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";

// ─────────────────────────────────────────
//  SERVICE WORKER
// ─────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registrado');
    } catch (error) {
      console.error('❌ Error al registrar el Service Worker:', error);
    }
  });
}

// ─────────────────────────────────────────
//  RENDER
// ─────────────────────────────────────────
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);