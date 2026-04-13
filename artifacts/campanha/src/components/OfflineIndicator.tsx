import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-40 bg-yellow-50 border border-yellow-200 rounded-lg p-3 shadow-md flex items-center gap-2"
      >
        <WifiOff className="w-4 h-4 text-yellow-600 flex-shrink-0" />
        <span className="text-sm text-yellow-800 font-medium">Você está offline</span>
        <span className="text-xs text-yellow-700">Modo offline ativo</span>
      </motion.div>
    </AnimatePresence>
  );
}
