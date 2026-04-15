import { useState, useEffect } from "react";

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    // Sincroniza clase en <body> al montar
    document.body.classList.toggle("offline", !navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      document.body.classList.remove("offline");
    };
    const handleOffline = () => {
      setIsOnline(false);
      document.body.classList.add("offline");
    };

    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}