import { useInstallApp } from "@/hooks/useInstallApp";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Check, AlertCircle } from "lucide-react";

export function InstallAppPrompt() {
  const { isInstallable, isInstalled, isStandalone, handleInstall } = useInstallApp();

  // Não mostrar a mensagem se já está instalado ou em standalone mode
  if (isInstalled || isStandalone || !isInstallable) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-lg"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Instale o app Campanha no seu celular</p>
              <p className="text-sm opacity-90">Acesso rápido e funciona offline</p>
            </div>
          </div>
          <button
            onClick={handleInstall}
            className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors flex-shrink-0"
          >
            <Download className="w-4 h-4" />
            Instalar
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
