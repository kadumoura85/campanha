import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface Usuario {
  id: number;
  nome: string;
  telefone: string | null;
  email: string | null;
  tipo: string;
  ativo: boolean;
  coordenador_id: number | null;
}

const tipoConfig: Record<string, { label: string; color: string; bg: string }> = {
  super_admin: { label: "Super Admin", color: "text-red-700", bg: "bg-red-100" },
  vereador: { label: "Vereador", color: "text-blue-700", bg: "bg-blue-100" },
  coordenador_geral: { label: "Coord. Geral", color: "text-teal-700", bg: "bg-teal-100" },
  coordenador_regional: { label: "Coordenador", color: "text-indigo-700", bg: "bg-indigo-100" },
  lider: { label: "Líder", color: "text-green-700", bg: "bg-green-100" },
};

const ALL_TIPOS = [
  { value: "vereador", label: "Vereador" },
  { value: "coordenador_geral", label: "Coordenador Geral" },
  { value: "coordenador_regional", label: "Coordenador Regional" },
  { value: "lider", label: "Líder" },
];

function getTiposPermitidos(tipoUsuario: string) {
  if (tipoUsuario === "super_admin") return ALL_TIPOS;
  if (tipoUsuario === "vereador") return ALL_TIPOS.filter(t => t.value !== "super_admin");
  if (tipoUsuario === "coordenador_geral") return ALL_TIPOS.filter(t => ["coordenador_regional", "lider"].includes(t.value));
  if (tipoUsuario === "coordenador_regional") return ALL_TIPOS.filter(t => t.value === "lider");
  return [];
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterTipo, setFilterTipo] = useState("");
  const { usuario } = useAuth();

  const canEdit = ["super_admin", "vereador", "coordenador_geral", "coordenador_regional"].includes(usuario?.tipo || "");
  const tiposPermitidos = usuario ? getTiposPermitidos(usuario.tipo) : [];
  const isCoordRegional = usuario?.tipo === "coordenador_regional";

  const [form, setForm] = useState({
    nome: "", telefone: "", email: "", senha: "",
    tipo: tiposPermitidos[0]?.value || "lider",
    coordenador_id: "", bairro_regiao: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    const qs = filterTipo ? `?tipo=${filterTipo}` : "";
    apiGet<Usuario[]>(`/api/usuarios${qs}`)
      .then(setUsuarios)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterTipo]);

  const openForm = () => {
    const defaultTipo = tiposPermitidos[0]?.value || "lider";
    setForm({ nome: "", telefone: "", email: "", senha: "", tipo: defaultTipo, coordenador_id: "", bairro_regiao: "" });
    setError("");
    setShowForm(true);
  };

  const save = async () => {
    if (!form.nome || !form.senha) { setError("Nome e senha são obrigatórios"); return; }
    setSaving(true); setError("");
    try {
      await apiPost("/api/usuarios", {
        nome: form.nome,
        telefone: form.telefone || null,
        email: form.email || null,
        senha: form.senha,
        tipo: form.tipo,
        coordenador_id: form.coordenador_id ? Number(form.coordenador_id) : null,
        bairro_regiao: form.bairro_regiao || null,
        ativo: true,
      });
      setShowForm(false);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (u: Usuario) => {
    await apiPatch(`/api/usuarios/${u.id}`, { ativo: !u.ativo });
    load();
  };

  const groups: Record<string, Usuario[]> = {};
  for (const u of usuarios) {
    if (!groups[u.tipo]) groups[u.tipo] = [];
    groups[u.tipo].push(u);
  }

  const tipoOrder = ["super_admin", "vereador", "coordenador_geral", "coordenador_regional", "lider"];
  const filterOptions = [{ value: "", label: "Todos" }, ...ALL_TIPOS];

  return (
    <Layout>
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isCoordRegional ? "Meus Líderes" : "Usuários"}
            </h1>
            <p className="text-sm text-gray-500">{usuarios.length} {isCoordRegional ? "líderes" : "usuários"}</p>
          </div>
          {canEdit && tiposPermitidos.length > 0 && (
            <button onClick={openForm} className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-xl shadow">
              + Novo
            </button>
          )}
        </div>

        {!isCoordRegional && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {filterOptions.map(t => (
              <button key={t.value} onClick={() => setFilterTipo(t.value)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filterTipo === t.value ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Novo Usuário</h2>
            {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nome *</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Telefone</label>
                  <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Senha *</label>
                  <input type="password" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {tiposPermitidos.length > 1 ? (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Perfil *</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {tiposPermitidos.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              ) : (
                <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-2.5">
                  Perfil: <span className="font-semibold text-gray-700">{tiposPermitidos[0]?.label}</span>
                </div>
              )}

              {!isCoordRegional && (form.tipo === "lider" || form.tipo === "coordenador_regional") && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">ID Coordenador</label>
                    <input type="number" value={form.coordenador_id} onChange={e => setForm(f => ({ ...f, coordenador_id: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Bairro / Região</label>
                    <input value={form.bairro_regiao} onChange={e => setForm(f => ({ ...f, bairro_regiao: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              )}

              {isCoordRegional && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Bairro / Região</label>
                  <input value={form.bairro_regiao} onChange={e => setForm(f => ({ ...f, bairro_regiao: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold text-sm">
                  Cancelar
                </button>
                <button onClick={save} disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50">
                  {saving ? "Salvando..." : "Criar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {tipoOrder.map(tipo => {
          const list = groups[tipo];
          if (!list || list.length === 0) return null;
          const cfg = tipoConfig[tipo] || tipoConfig.lider;
          return (
            <div key={tipo} className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{cfg.label} ({list.length})</p>
              <div className="space-y-2">
                {list.map(u => (
                  <div key={u.id} className={`bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 flex items-center gap-3 ${!u.ativo ? "opacity-50" : ""}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                      {u.nome[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{u.nome}</p>
                      <p className="text-xs text-gray-400">{u.telefone || u.email || "—"}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    {canEdit && (
                      <button onClick={() => toggleAtivo(u)}
                        className={`text-xs px-2 py-1 rounded-lg font-medium ${u.ativo ? "bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600" : "bg-green-100 text-green-600"}`}>
                        {u.ativo ? "Desativar" : "Ativar"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {usuarios.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-5xl mb-3">👥</p>
            <p>{isCoordRegional ? "Nenhum líder cadastrado ainda" : "Nenhum usuário encontrado"}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
