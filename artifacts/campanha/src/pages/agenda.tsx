import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface Evento {
  id: number;
  titulo: string;
  descricao: string | null;
  data: string;
  hora: string | null;
  local: string | null;
  tipo_evento: string;
  visibilidade: string;
  regiao_nome: string | null;
  criado_por_nome: string | null;
}

const tipoEventoConfig: Record<string, { label: string; emoji: string; color: string }> = {
  reuniao: { label: "Reunião", emoji: "🤝", color: "bg-blue-100 text-blue-700" },
  caminhada: { label: "Caminhada", emoji: "🚶", color: "bg-green-100 text-green-700" },
  visita: { label: "Visita", emoji: "🏠", color: "bg-purple-100 text-purple-700" },
  comicio: { label: "Comício", emoji: "🎤", color: "bg-red-100 text-red-700" },
  acao_de_rua: { label: "Ação de Rua", emoji: "📢", color: "bg-orange-100 text-orange-700" },
  evento_interno: { label: "Interno", emoji: "🏛️", color: "bg-gray-100 text-gray-700" },
};

const VISIBILIDADE_LABELS: Record<string, string> = {
  geral: "Toda a campanha",
  regional: "Regional",
  lider: "Líderes",
};

const TIPOS_EVENTO = Object.entries(tipoEventoConfig).map(([k, v]) => ({ value: k, label: v.label }));

export default function AgendaPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { usuario } = useAuth();

  const canCreate = ["super_admin", "vereador", "coordenador_geral", "coordenador_regional"].includes(usuario?.tipo || "");

  const [form, setForm] = useState({
    titulo: "", descricao: "", data: "", hora: "", local: "",
    tipo_evento: "reuniao", visibilidade: "geral",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    apiGet<Evento[]>("/api/eventos")
      .then(setEventos)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().split("T")[0]!;
  const proximos = eventos.filter(e => e.data >= today).sort((a, b) => a.data.localeCompare(b.data));
  const passados = eventos.filter(e => e.data < today).sort((a, b) => b.data.localeCompare(a.data));

  const save = async () => {
    if (!form.titulo || !form.data) { setError("Título e data são obrigatórios"); return; }
    setSaving(true); setError("");
    try {
      await apiPost("/api/eventos", form);
      setShowForm(false);
      setForm({ titulo: "", descricao: "", data: "", hora: "", local: "", tipo_evento: "reuniao", visibilidade: "geral" });
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
            <p className="text-sm text-gray-500">{proximos.length} próximos eventos</p>
          </div>
          {canCreate && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-xl shadow"
            >
              {showForm ? "Cancelar" : "+ Evento"}
            </button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Novo Evento</h2>
            {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Título *</label>
                <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Data *</label>
                  <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Hora</label>
                  <input type="time" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Local</label>
                <input value={form.local} onChange={e => setForm(f => ({ ...f, local: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                  <select value={form.tipo_evento} onChange={e => setForm(f => ({ ...f, tipo_evento: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {TIPOS_EVENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Visibilidade</label>
                  <select value={form.visibilidade} onChange={e => setForm(f => ({ ...f, visibilidade: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="geral">Todos</option>
                    <option value="regional">Regional</option>
                    <option value="lider">Líderes</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  rows={2} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <button onClick={save} disabled={saving}
                className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50">
                {saving ? "Salvando..." : "Criar Evento"}
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Próximos */}
        {proximos.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Próximos Eventos</p>
            <div className="space-y-3">
              {proximos.map(e => <EventoCard key={e.id} evento={e} />)}
            </div>
          </div>
        )}

        {/* Passados */}
        {passados.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Passados</p>
            <div className="space-y-3 opacity-60">
              {passados.slice(0, 5).map(e => <EventoCard key={e.id} evento={e} />)}
            </div>
          </div>
        )}

        {eventos.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-5xl mb-3">📅</p>
            <p className="font-medium">Nenhum evento cadastrado</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

function EventoCard({ evento }: { evento: Evento }) {
  const cfg = tipoEventoConfig[evento.tipo_evento] || tipoEventoConfig.reuniao;
  const dateObj = new Date(evento.data + "T12:00:00");

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex gap-3 items-start">
        <div className="bg-gray-50 rounded-xl p-2.5 text-center min-w-[56px] border border-gray-100">
          <p className="text-xs font-semibold text-blue-600">{dateObj.toLocaleDateString("pt-BR", { month: "short" }).toUpperCase()}</p>
          <p className="text-2xl font-black text-gray-800">{dateObj.getDate()}</p>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-gray-900">{evento.titulo}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${cfg.color}`}>{cfg.emoji} {cfg.label}</span>
          </div>
          {evento.hora && <p className="text-xs text-gray-500 mt-0.5">🕐 {evento.hora.slice(0, 5)}</p>}
          {evento.local && <p className="text-xs text-gray-500">📍 {evento.local}</p>}
          {evento.regiao_nome && <p className="text-xs text-gray-400">🗺️ {evento.regiao_nome}</p>}
          <p className="text-xs text-gray-400 mt-1">{VISIBILIDADE_LABELS[evento.visibilidade]}</p>
        </div>
      </div>
    </div>
  );
}
