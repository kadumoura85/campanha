import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
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
  regiao_id: number | null;
  regiao_nome: string | null;
  criado_por: number | null;
  criado_por_nome: string | null;
}

interface Regiao {
  id: number;
  nome: string;
}

const tipoEventoConfig: Record<string, { label: string; emoji: string; color: string }> = {
  reuniao: { label: "Reunião", emoji: "🤝", color: "bg-blue-100 text-blue-700" },
  caminhada: { label: "Caminhada", emoji: "🚶", color: "bg-green-100 text-green-700" },
  visita: { label: "Visita", emoji: "🏠", color: "bg-purple-100 text-purple-700" },
  comicio: { label: "Comício", emoji: "🎤", color: "bg-red-100 text-red-700" },
  acao_de_rua: { label: "Ação de rua", emoji: "📢", color: "bg-orange-100 text-orange-700" },
  evento_interno: { label: "Interno", emoji: "🏛️", color: "bg-gray-100 text-gray-700" },
};

const VISIBILIDADE_LABELS: Record<string, string> = {
  geral: "Toda a campanha",
  regional: "Coordenação",
  lider: "Líderes",
};

const TIPO_EVENTO_DESCONHECIDO = {
  label: "Tipo invalido",
  emoji: "!",
  color: "bg-amber-100 text-amber-700",
};

const VISIBILIDADE_DESCONHECIDA = "Visibilidade invalida";

const TIPOS_EVENTO = Object.entries(tipoEventoConfig).map(([k, v]) => ({ value: k, label: v.label }));

const emptyForm = () => ({
  titulo: "",
  descricao: "",
  data: "",
  hora: "",
  local: "",
  tipo_evento: "reuniao",
  visibilidade: "geral",
  regiao_id: "",
});

export default function AgendaPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Evento | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const { usuario } = useAuth();

  const canCreate = ["super_admin", "vereador", "coordenador_geral", "coordenador_regional"].includes(usuario?.tipo || "");

  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [integrityWarning, setIntegrityWarning] = useState("");

  const load = () => {
    setLoading(true);
    apiGet<Evento[]>("/api/eventos")
      .then((data) => {
        const invalidCount = data.filter(
          (evento) => !tipoEventoConfig[evento.tipo_evento] || !VISIBILIDADE_LABELS[evento.visibilidade],
        ).length;

        setEventos(data);
        setIntegrityWarning(
          invalidCount > 0
            ? `${invalidCount} evento(s) tem valor de tipo ou visibilidade fora do padrao e precisam de correcao.`
            : "",
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    apiGet<Regiao[]>("/api/regioes").then(setRegioes).catch(() => {});
  }, []);

  const today = new Date().toISOString().split("T")[0]!;
  const proximos = eventos.filter((e) => e.data >= today).sort((a, b) => a.data.localeCompare(b.data));
  const passados = eventos.filter((e) => e.data < today).sort((a, b) => b.data.localeCompare(a.data));

  const openEdit = (evento: Evento) => {
    setEditando(evento);
    setForm({
      titulo: evento.titulo,
      descricao: evento.descricao || "",
      data: evento.data,
      hora: evento.hora || "",
      local: evento.local || "",
      tipo_evento: evento.tipo_evento,
      visibilidade: evento.visibilidade,
      regiao_id: evento.regiao_id ? String(evento.regiao_id) : "",
    });
    setShowForm(true);
    setError("");
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditando(null);
    setForm(emptyForm());
    setError("");
  };

  const save = async () => {
    if (!form.titulo || !form.data) {
      setError("Título e data são obrigatórios.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = { ...form };
      payload.regiao_id = form.regiao_id ? Number(form.regiao_id) : null;

      if (editando) {
        await apiPatch<Evento>(`/api/eventos/${editando.id}`, payload);
      } else {
        await apiPost("/api/eventos", payload);
      }

      cancelForm();
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteEvento = async (id: number) => {
    try {
      await apiDelete(`/api/eventos/${id}`);
      setConfirmDelete(null);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const canManage = (evento: Evento) =>
    ["super_admin", "vereador", "coordenador_geral"].includes(usuario?.tipo || "") || evento.criado_por === usuario?.id;

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
              onClick={() => {
                cancelForm();
                setShowForm(!showForm);
              }}
              className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-xl shadow active:scale-95 transition-transform"
            >
              {showForm && !editando ? "Cancelar" : "+ Evento"}
            </button>
          )}
        </div>

        {integrityWarning && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {integrityWarning}
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-blue-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">{editando ? "Editar evento" : "Novo evento"}</h2>
              <button onClick={cancelForm} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
                ×
              </button>
            </div>
            {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Título *</label>
                <input
                  value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome do evento"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Data *</label>
                  <input
                    type="date"
                    value={form.data}
                    onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Hora</label>
                  <input
                    type="time"
                    value={form.hora}
                    onChange={(e) => setForm((f) => ({ ...f, hora: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Local</label>
                <input
                  value={form.local}
                  onChange={(e) => setForm((f) => ({ ...f, local: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Endereço ou local"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                  <select
                    value={form.tipo_evento}
                    onChange={(e) => setForm((f) => ({ ...f, tipo_evento: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TIPOS_EVENTO.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Visibilidade</label>
                  <select
                    value={form.visibilidade}
                    onChange={(e) => setForm((f) => ({ ...f, visibilidade: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="geral">Todos</option>
                    <option value="regional">Coordenação</option>
                    <option value="lider">Líderes</option>
                  </select>
                </div>
              </div>
              {regioes.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Bairro</label>
                  <select
                    value={form.regiao_id}
                    onChange={(e) => setForm((f) => ({ ...f, regiao_id: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sem bairro específico</option>
                    {regioes.map((r) => (
                      <option key={r.id} value={String(r.id)}>
                        {r.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Detalhes do evento..."
                />
              </div>
              <button
                onClick={save}
                disabled={saving}
                className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50 active:scale-95 transition-transform"
              >
                {saving ? "Salvando..." : editando ? "Salvar alterações" : "Criar evento"}
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {confirmDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <p className="text-base font-bold text-gray-900 mb-2">Excluir evento?</p>
              <p className="text-sm text-gray-500 mb-5">Esta ação não poderá ser desfeita.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">
                  Cancelar
                </button>
                <button onClick={() => deleteEvento(confirmDelete)} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium">
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}

        {proximos.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Próximos eventos</p>
            <div className="space-y-3">
              {proximos.map((e) => (
                <EventoCard key={e.id} evento={e} canManage={canManage(e)} onEdit={() => openEdit(e)} onDelete={() => setConfirmDelete(e.id)} />
              ))}
            </div>
          </div>
        )}

        {passados.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Eventos passados</p>
            <div className="space-y-3 opacity-60">
              {passados.slice(0, 5).map((e) => (
                <EventoCard key={e.id} evento={e} canManage={canManage(e)} onEdit={() => openEdit(e)} onDelete={() => setConfirmDelete(e.id)} />
              ))}
            </div>
          </div>
        )}

        {eventos.length === 0 && !loading && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-6xl mb-4">📅</p>
            <p className="font-semibold text-gray-600">Nenhum evento cadastrado</p>
            {canCreate && <p className="text-sm mt-1">Toque em "+ Evento" para criar o primeiro.</p>}
          </div>
        )}
      </div>
    </Layout>
  );
}

function EventoCard({
  evento,
  canManage,
  onEdit,
  onDelete,
}: {
  evento: Evento;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cfg = tipoEventoConfig[evento.tipo_evento] || TIPO_EVENTO_DESCONHECIDO;
  const visibilidadeLabel = VISIBILIDADE_LABELS[evento.visibilidade] || VISIBILIDADE_DESCONHECIDA;
  const dateObj = new Date(`${evento.data}T12:00:00`);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 cursor-pointer" onClick={() => setExpanded((e) => !e)}>
        <div className="flex gap-3 items-start">
          <div className="bg-gray-50 rounded-xl p-2.5 text-center min-w-[56px] border border-gray-100 flex-shrink-0">
            <p className="text-xs font-semibold text-blue-600">{dateObj.toLocaleDateString("pt-BR", { month: "short" }).toUpperCase()}</p>
            <p className="text-2xl font-black text-gray-800">{dateObj.getDate()}</p>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold text-gray-900">{evento.titulo}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${cfg.color}`}>
                {cfg.emoji} {cfg.label}
              </span>
            </div>
            {evento.hora && <p className="text-xs text-gray-500 mt-0.5">🕐 {evento.hora.slice(0, 5)}</p>}
            {evento.local && <p className="text-xs text-gray-500">📍 {evento.local}</p>}
            {evento.regiao_nome && <p className="text-xs text-gray-400">🗺️ {evento.regiao_nome}</p>}
            <p className="text-xs text-gray-400 mt-1">{visibilidadeLabel}</p>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4">
          {evento.descricao && <p className="text-sm text-gray-600 mt-3 mb-3">{evento.descricao}</p>}
          {evento.criado_por_nome && <p className="text-xs text-gray-400 mb-3">Criado por: {evento.criado_por_nome}</p>}
          {canManage && (
            <div className="flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="flex-1 text-xs py-2 rounded-xl border border-blue-200 text-blue-600 font-medium hover:bg-blue-50 transition-colors">
                Editar
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="flex-1 text-xs py-2 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50 transition-colors">
                Excluir
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
