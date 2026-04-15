import React, { useEffect, useRef, useState } from "react";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import "./OfflineBanner.css";

const OfflineBanner: React.FC = () => {
  const isOnline   = useOnlineStatus();
  const wasOffline = useRef(false);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      setShowBack(false);
    } else if (wasOffline.current) {
      // Acaba de reconectarse
      setShowBack(true);
      const t = setTimeout(() => setShowBack(false), 3000);
      return () => clearTimeout(t);
    }
  }, [isOnline]);

  if (isOnline && !showBack) return null;

  return (
    <div className={`offline-banner ${showBack ? "offline-banner--back" : ""}`} role="status" aria-live="polite">
      {showBack ? (
        <>
          <span className="offline-banner__icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          Conexión restaurada
        </>
      ) : (
        <>
          <span className="offline-banner__icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
          </span>
          Sin conexión — Estás en modo offline
        </>
      )}
    </div>
  );
};

export default OfflineBanner;