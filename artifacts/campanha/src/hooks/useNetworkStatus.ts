import { useEffect, useState, useCallback } from "react";

interface ConnectionState {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType?: string;
}

export function useNetworkStatus() {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isOnline: navigator.onLine,
    isSlowConnection: false,
    connectionType: "unknown",
  });

  useEffect(() => {
    // Verificar tipo de conexão usando Navigation API
    const getConnectionInfo = () => {
      const nav = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      if (nav) {
        const effectiveType = nav.effectiveType; // "slow-2g", "2g", "3g", "4g"
        const isSlowConnection = effectiveType === "slow-2g" || effectiveType === "2g" || effectiveType === "3g";
        
        setConnectionState((prev) => ({
          ...prev,
          isSlowConnection,
          connectionType: effectiveType,
        }));
      }
    };

    getConnectionInfo();

    const handleOnline = () => {
      setConnectionState((prev) => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setConnectionState((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Monitorar mudanças de tipo de conexão
    const nav = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (nav) {
      nav.addEventListener("change", getConnectionInfo);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (nav) {
        nav.removeEventListener("change", getConnectionInfo);
      }
    };
  }, []);

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch("", { method: "HEAD", cache: "no-store" });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  return {
    ...connectionState,
    checkConnectivity,
  };
}
