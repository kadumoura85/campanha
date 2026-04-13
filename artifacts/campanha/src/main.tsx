import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./register-service-worker";
import {
  OFFLINE_MUTATION_QUEUED_EVENT,
  OFFLINE_SYNC_COMPLETE_EVENT,
} from "@/lib/offline";
import { PWA_UPDATE_AVAILABLE_EVENT } from "@/lib/pwa";
import { toast } from "@/hooks/use-toast";

window.addEventListener(OFFLINE_SYNC_COMPLETE_EVENT, (event) => {
  const detail = (event as CustomEvent<{ processed?: number }>).detail;
  if ((detail?.processed || 0) > 0 && document.visibilityState === "visible") {
    toast({
      title: "Sincronizacao concluida",
      description: `${detail?.processed} cadastro(s) ou edicao(oes) pendentes foram enviados com sucesso.`,
    });
  }
});

window.addEventListener(OFFLINE_MUTATION_QUEUED_EVENT, () => {
  toast({
    title: "Alteracao guardada para sincronizar depois",
    description: "Ela ficou salva neste aparelho e sera enviada automaticamente quando a conexao voltar.",
  });
});

window.addEventListener("offline", () => {
  toast({
    title: "Modo offline",
    description: "Voce pode consultar dados ja carregados. Novos cadastros e edicoes compativeis ficam pendentes ate a internet voltar.",
    variant: "destructive",
  });
});

window.addEventListener(PWA_UPDATE_AVAILABLE_EVENT, () => {
  toast({
    title: "Atualizacao pronta",
    description: "Ha uma nova versao do app. Atualize quando terminar o que estiver fazendo.",
  });
});

createRoot(document.getElementById("root")!).render(<App />);
