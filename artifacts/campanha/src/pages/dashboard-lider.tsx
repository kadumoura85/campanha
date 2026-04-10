import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import ConversionThermometer from "@/components/ConversionThermometer";
import Layout from "@/components/Layout";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useCampanha } from "@/contexts/CampanhaContext";
import { getCampaignAssetUrl } from "@/lib/campanha";

interface Contato {
  id: number;
  nome: string;
  telefone: string;
  bairro: string | null;
  nivel: string;
}

interface Evento {
  id: number;
  titulo: string;
  data: string;
  hora: string | null;
  local: string | null;
}

interface DashboardLider {
  total_contatos: number;
  total_simpatizantes: number;
  total_fechados: number;
  regiao_nome: string | null;
  ultimos_cadastrados: Contato[];
  proximos_eventos: Evento[];
}

const nivelConfig: Record<string, { label: string; color: string; dot: string }> = {
  contato: { label: "Contato", color: "text-gray-500", dot: "bg-gray-400" },
  simpatizante: { label: "Simpatizante", color: "text-yellow-600", dot: "bg-yellow-400" },
  fechado: { label: "Fechado", color: "text-green-600", dot: "bg-green-500" },
};

export default function DashboardLiderPage() {
  const [data, setData] = useState<DashboardLider | null>(null);
  const [loading, setLoading] = useState(true);
  const { usuario } = useAuth();
  const { config } = useCampanha();
  const [, navigate] = useLocation();

  useEffect(() => {
    apiGet<DashboardLider>("/api/dashboard/lider")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const santinhoUrl = getCampaignAssetUrl(config.santinho_imagem);
  const totalContatosAbertos = data
    ? Math.max(0, data.total_contatos - data.total_simpatizantes - data.total_fechados)
    : 0;
  const taxaFechados = data?.total_contatos ? (data.total_fechados / data.total_contatos) * 100 : 0;

  const downloadSantinho = () => {
    if (!santinhoUrl) return;

    const assetName =
      (config.nome_candidato || "campanha").trim().replace(/\s+/g, "-").toLowerCase() || "campanha";

    fetch(santinhoUrl)
      .then((response) => {
        if (!response.ok) throw new Error("Falha ao baixar santinho");
        const contentType = response.headers.get("content-type") || "";
        return response.blob().then((blob) => ({ blob, contentType }));
      })
      .then(({ blob, contentType }) => {
        const extensionFromType =
          contentType.includes("png")
            ? "png"
            : contentType.includes("webp")
              ? "webp"
              : contentType.includes("jpeg") || contentType.includes("jpg")
                ? "jpg"
                : "jpg";
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = `santinho-${assetName}.${extensionFromType}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
      })
      .catch(() => {
        window.open(santinhoUrl, "_blank", "noopener,noreferrer");
      });
  };

  const primeiroNome = usuario?.nome?.split(" ")[0] || "Líder";

  return (
    <Layout>
      <div className="mx-auto max-w-5xl p-4 pb-8 sm:p-6">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Olá, {primeiroNome}!</h1>
          {data?.regiao_nome && <p className="text-sm text-gray-500">📍 {data.regiao_nome}</p>}
        </div>

        {loading && (
          <div className="py-16 text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
          </div>
        )}

        {data && (
          <>
            <div className="mb-4 rounded-2xl bg-gradient-to-br from-green-600 to-green-800 p-5 text-white shadow-lg">
              <p className="mb-1 text-sm text-green-200">Minha base</p>
              <p className="text-7xl font-black">{data.total_contatos}</p>
              <p className="mt-2 text-sm text-green-100">Soma de contatos, simpatizantes e fechados.</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-2xl font-black text-white">{totalContatosAbertos}</p>
                  <p className="mt-1 text-sm text-green-100">Contatos</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-2xl font-black text-yellow-300">{data.total_simpatizantes}</p>
                  <p className="mt-1 text-sm text-green-100">Simpatizantes</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-2xl font-black text-white">{data.total_fechados}</p>
                  <p className="mt-1 text-sm text-green-100">Fechados</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <ConversionThermometer
                title="Fechados da minha base"
                percent={taxaFechados}
                ratioText={`${data.total_fechados} de ${data.total_contatos} fechados`}
                onAction={() => navigate("/contatos?nivel=simpatizante")}
              />
            </div>

            <button
              onClick={() => navigate("/contatos/novo")}
              className="mb-3 w-full rounded-2xl bg-green-600 p-4 text-center text-base font-bold text-white shadow-lg transition-all hover:bg-green-700 active:scale-95"
            >
              Cadastrar nova pessoa
            </button>

            <button
              onClick={() => navigate("/contatos")}
              className="mb-5 w-full rounded-2xl border border-gray-200 bg-white p-3.5 text-center text-sm font-semibold text-gray-700 shadow-sm"
            >
              Ver todos os contatos
            </button>

            {santinhoUrl && (
              <button
                onClick={downloadSantinho}
                className="mb-5 w-full rounded-2xl border border-green-200 bg-white p-3.5 text-center text-sm font-semibold text-green-700 shadow-sm"
              >
                Baixar santinho
              </button>
            )}

            {data.ultimos_cadastrados.length > 0 && (
              <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-gray-700">Últimos cadastrados</h2>
                <div className="space-y-1">
                  {data.ultimos_cadastrados.map((contato) => {
                    const cfg = nivelConfig[contato.nivel] || nivelConfig.contato;

                    return (
                      <div
                        key={contato.id}
                        onClick={() => navigate(`/contatos/${contato.id}/editar`)}
                        className="flex cursor-pointer items-center justify-between rounded-lg px-1 py-2.5 active:bg-gray-50"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`h-2 w-2 flex-shrink-0 rounded-full ${cfg.dot}`} />
                          <div>
                            <p className="text-sm font-medium text-gray-800">{contato.nome}</p>
                            <p className="text-xs text-gray-400">
                              {contato.telefone}
                              {contato.bairro ? ` • ${contato.bairro}` : ""}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {data.proximos_eventos.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-gray-700">Próximos eventos</h2>
                {data.proximos_eventos.map((evento) => (
                  <div key={evento.id} className="mb-2 flex items-start gap-3 rounded-xl bg-green-50 p-3 last:mb-0">
                    <div className="min-w-[40px] rounded-lg bg-green-100 p-1.5 text-center">
                      <p className="text-xs font-bold text-green-700">
                        {new Date(`${evento.data}T12:00:00`).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{evento.titulo}</p>
                      {evento.hora && (
                        <p className="text-xs text-gray-500">
                          {evento.hora.slice(0, 5)}
                          {evento.local ? ` • ${evento.local}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data.total_contatos === 0 && (
              <div className="py-8 text-center text-gray-400">
                <p className="mb-3 text-5xl">👥</p>
                <p className="font-medium">Ainda sem cadastros</p>
                <p className="mt-1 text-sm">Comece cadastrando sua primeira pessoa.</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
