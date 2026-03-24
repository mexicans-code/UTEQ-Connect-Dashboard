import React, { useState } from "react";
import "../../styles/Logs.css";
import NavSpAdmin from "../components/NavSpAdmin";
import { Eye, X, Shield } from "lucide-react";

interface Log {
  id: number;
  titulo: string;
  descripcion: string;
  fecha: string;
  usuario: string;
}

const Logs: React.FC = () => {
  const [logs] = useState<Log[]>([
    {
      id: 1,
      titulo: "Inicio de sesión",
      descripcion: "El usuario admin inició sesión correctamente.",
      fecha: "20/02/2026 - 10:15 AM",
      usuario: "admin",
    },
    {
      id: 2,
      titulo: "Solicitud de evento",
      descripcion: "Se realizó una solicitud para el evento 'Conferencia Tech'.",
      fecha: "20/02/2026 - 11:30 AM",
      usuario: "maria.rosas",
    },
  ]);

  const [logSeleccionado, setLogSeleccionado] = useState<Log | null>(null);

  return (
    <div className="logs-container">
      <NavSpAdmin />

      <div className="logs-main">
        <header className="logs-header">
          <h1>Seguridad del Sistema</h1>
        </header>

        <div className="logs-content">

          <div className="logs-table-wrapper">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>LOGS DEL SISTEMA</th>
                  <th>Detalles</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="logs-descripcion">
                      <Shield size={18} /> {log.titulo}
                    </td>
                    <td>
                      <button
                        className="logs-btn-detalle"
                        onClick={() => setLogSeleccionado(log)}
                      >
                        <Eye size={16} /> Ver detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MODAL */}
          {logSeleccionado && (
            <div className="logs-modal-overlay">
              <div className="logs-modal-container">
                <div className="logs-modal-header">
                  <h2>Detalles del Log</h2>
                  <X onClick={() => setLogSeleccionado(null)} />
                </div>

                <div className="logs-modal-body">
                  <p><strong>Acción:</strong> {logSeleccionado.titulo}</p>
                  <p><strong>Usuario:</strong> {logSeleccionado.usuario}</p>
                  <p><strong>Fecha:</strong> {logSeleccionado.fecha}</p>
                  <p><strong>Descripción:</strong></p>
                  <div className="logs-modal-box">
                    {logSeleccionado.descripcion}
                  </div>
                </div>

                <div className="logs-modal-footer">
                  <button
                    className="logs-btn-cerrar"
                    onClick={() => setLogSeleccionado(null)}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Logs;