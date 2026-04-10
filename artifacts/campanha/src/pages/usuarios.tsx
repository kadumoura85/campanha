import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface Usuario {
  id: number;
  nome: string;
  telefone: string | null;
  email: string | null;
  tipo: string;
  ativo: boolean;
  coordenador_id: number | null;
  regiao_id?: number | null;
}

interface Regiao {
  id: number;
  nome: string;
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
  { value: "coordenador_regional", label: "Coordenador" },
  { value: "lider", label: "Líder" },
];

function sortByNome<T extends { nome: string }>(items: T[]) {
  return [...items].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
}

function getTiposPermitidos(tipoUsuario: string) {
  if (tipoUsuario === "super_admin") return ALL_TIPOS;
  if (tipoUsuario === "vereador") return ALL_TIPOS.filter((t) => t.value !== "super_admin");
  if (tipoUsuario === "coordenador_geral") return ALL_TIPOS.filter((t) => ["coordenador_regional", "lider"].includes(t.value));
  if (tipoUsuario === "coordenador_regional") return ALL_TIPOS.filter((t) => t.value === "lider");
  return [];
}

function canDeleteUsuario(currentTipo: string | undefined, currentId: number | undefined, item: Usuario) {
  if (!currentTipo || !currentId || currentId === item.id) return false;
  if (currentTipo === "super_admin") return true;
  if (currentTipo === "vereador") return item.tipo !== "super_admin";
  if (currentTipo === "coordenador_geral") return item.tipo === "coordenador_regional" || item.tipo === "lider";
  if (currentTipo === "coordenador_regional") return item.tipo === "lider" && item.coordenador_id === currentId;
  return false;
}

export default function UsuariosPage() {
  const [, navigate] = useLocation();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creationPreset, setCreationPreset] = useState<"coordenador" | "lider" | null>(null);
  const [filterTipo, setFilterTipo] = useState("");
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const { usuario } = useAuth();

  const canEdit = ["super_admin", "vereador", "coordenador_geral", "coordenador_regional"].includes(usuario?.tipo || "");
  const canCreate = ["super_admin", "coordenador_geral", "coordenador_regional"].includes(usuario?.tipo || "");
  const tiposPermitidos = usuario ? getTiposPermitidos(usuario.tipo) : [];
  const isCoordRegional = usuario?.tipo === "coordenador_regional";
  const regiaoById = useMemo(() => new Map(regioes.map((regiao) => [regiao.id, regiao.nome])), [regioes]);
  const usuarioById = useMemo(() => new Map(usuarios.map((item) => [item.id, item])), [usuarios]);

  const visibleFilterOptions = useMemo(() => {
    if (usuario?.tipo === "coordenador_geral" || usuario?.tipo === "vereador") {
      return [
        { value: "", label: "Todos" },
        { value: "coordenador_regional", label: "Coordenadores" },
        { value: "lider", label: "Líderes" },
      ];
    }
    return [{ value: "", label: "Todos" }, ...ALL_TIPOS];
  }, [usuario?.tipo]);

  const totalCoordenadores = usuarios.filter((item) => item.tipo === "coordenador_regional").length;
  const totalLideres = usuarios.filter((item) => item.tipo === "lider").length;

  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    email: "",
    senha: "",
    tipo: tiposPermitidos[0]?.value || "lider",
    coordenador_id: "",
    regiao_id: "",
    bairro_regiao: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const responsavelOptions = useMemo(() => {
    if (form.tipo === "coordenador_regional") {
      return sortByNome(usuarios.filter((item) => item.tipo === "coordenador_geral" && item.ativo));
    }
    if (form.tipo === "lider") {
      return sortByNome(usuarios.filter((item) => item.tipo === "coordenador_regional" && item.ativo));
    }
    return [];
  }, [form.tipo, usuarios]);

  const isLockedCoordinatorFlow = usuario?.tipo === "coordenador_geral" && creationPreset === "coordenador";
  const showResponsavelField = !isCoordRegional && !isLockedCoordinatorFlow && responsavelOptions.length > 0;
  const responsavelLabel = form.tipo === "coordenador_regional" ? "Coordenador geral responsável" : "Coordenador responsável";
  const showRegiaoField = form.tipo === "coordenador_regional";
  const showTipoField = tiposPermitidos.length > 1 && !isLockedCoordinatorFlow;
  const showBairroRegiaoField = form.tipo === "lider";
  const actionLabel = form.tipo === "coordenador_regional" ? "Cadastrar coordenador" : "Cadastrar líder";

  const load = () => {
    setLoading(true);
    const qs = filterTipo ? `?tipo=${filterTipo}` : "";
    apiGet<Usuario[]>(`/api/usuarios${qs}`)
      .then((items) => setUsuarios(sortByNome(items)))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [filterTipo]);

  useEffect(() => {
    apiGet<Regiao[]>("/api/regioes").then((items) => setRegioes(sortByNome(items))).catch(() => {});
  }, []);

  useEffect(() => {
    if (isCoordRegional) return;

    if (form.tipo !== "lider" && form.tipo !== "coordenador_regional" && form.coordenador_id) {
      setForm((current) => ({ ...current, coordenador_id: "" }));
      return;
    }

    if (form.tipo !== "coordenador_regional" && form.regiao_id) {
      setForm((current) => ({ ...current, regiao_id: "" }));
      return;
    }

    if (form.coordenador_id && !responsavelOptions.some((item) => String(item.id) === form.coordenador_id)) {
      setForm((current) => ({ ...current, coordenador_id: "" }));
    }
  }, [form.tipo, form.coordenador_id, isCoordRegional, responsavelOptions, form.regiao_id]);

  const openForm = () => {
    if (usuario?.tipo === "coordenador_geral") {
      openFormWithTipo("coordenador_regional", "coordenador");
      return;
    }
    if (usuario?.tipo === "coordenador_regional") {
      openFormWithTipo("lider", "lider");
      return;
    }

    const defaultTipo = tiposPermitidos[0]?.value || "lider";
    openFormWithTipo(defaultTipo, defaultTipo === "lider" ? "lider" : null);
  };

  const openFormWithTipo = (tipo: string, preset: "coordenador" | "lider" | null = null) => {
    const allowedTipo = tiposPermitidos.some((item) => item.value === tipo) ? tipo : tiposPermitidos[0]?.value || "lider";

    setForm({
      nome: "",
      telefone: "",
      email: "",
      senha: "",
      tipo: allowedTipo,
      coordenador_id: preset === "coordenador" && usuario?.id ? String(usuario.id) : "",
      regiao_id: "",
      bairro_regiao: "",
    });
    setCreationPreset(preset);
    setError("");
    setShowForm(true);
  };

  const save = async () => {
    if (!form.nome || !form.senha) {
      setError("Nome e senha são obrigatórios.");
      return;
    }
    if (showResponsavelField && !form.coordenador_id) {
      setError("Selecione um responsável para continuar.");
      return;
    }
    if (showRegiaoField && !form.regiao_id) {
      setError("Selecione um bairro para o coordenador.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await apiPost("/api/usuarios", {
        nome: form.nome,
        telefone: form.telefone || null,
        email: form.email || null,
        senha: form.senha,
        tipo: form.tipo,
        coordenador_id: isLockedCoordinatorFlow && usuario?.id ? usuario.id : form.coordenador_id ? Number(form.coordenador_id) : null,
        regiao_id: form.regiao_id ? Number(form.regiao_id) : null,
        bairro_regiao: form.bairro_regiao || null,
        ativo: true,
      });
      setShowForm(false);
      setCreationPreset(null);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (item: Usuario) => {
    await apiPatch(`/api/usuarios/${item.id}`, { ativo: !item.ativo });
    load();
  };

  const deleteUsuario = async (item: Usuario) => {
    const alvoLabel = tipoConfig[item.tipo]?.label || "usuário";
    if (!window.confirm(`Tem certeza que deseja excluir ${item.nome} (${alvoLabel})?`)) return;

    try {
      await apiDelete(`/api/usuarios/${item.id}`);
      load();
    } catch (e: any) {
      window.alert(e.message || "Não foi possível excluir este usuário.");
    }
  };

  const groups: Record<string, Usuario[]> = {};
  for (const item of usuarios) {
    if (!groups[item.tipo]) groups[item.tipo] = [];
    groups[item.tipo].push(item);
  }

  const tipoOrder = ["super_admin", "vereador", "coordenador_geral", "coordenador_regional", "lider"];

  useEffect(() => {
    if (!tiposPermitidos.length) return;
    const search = new URLSearchParams(window.location.search);
    const novo = search.get("novo");
    if (!novo) return;

    const tipoFromQuery = novo === "coordenador" ? "coordenador_regional" : novo === "lider" ? "lider" : "";
    if (!tipoFromQuery) return;

    setFilterTipo(tipoFromQuery);
    openFormWithTipo(tipoFromQuery, novo === "coordenador" ? "coordenador" : "lider");
    navigate("/usuarios", { replace: true });
  }, [navigate, tiposPermitidos]);

  return (
    <Layout>
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isCoordRegional ? "Meus Líderes" : usuario?.tipo === "coordenador_geral" ? "Coordenadores" : "Usuários"}
            </h1>
            <p className="text-sm text-gray-500">
              {usuarios.length} {isCoordRegional ? "líderes" : usuario?.tipo === "coordenador_geral" ? "na equipe" : "usuários"}
            </p>
          </div>
          {canCreate && tiposPermitidos.length > 0 && !showForm && (
            <button onClick={openForm} className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-xl shadow">
              {usuario?.tipo === "coordenador_geral" ? "+ Cadastrar coordenador" : usuario?.tipo === "coordenador_regional" ? "+ Cadastrar líder" : "+ Novo"}
            </button>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-4">
          <p className="text-sm font-semibold text-blue-900 mb-1">
            {isCoordRegional
              ? "Você gerencia os líderes do seu bairro."
              : usuario?.tipo === "coordenador_geral"
                ? "Cada coordenador fica ligado a um bairro e pode ter vários líderes."
                : "A equipe segue a hierarquia: coordenador -> líder -> pessoas."}
          </p>
          <p className="text-xs text-blue-700">
            {isCoordRegional ? `${totalLideres} líderes vinculados a você.` : `${totalCoordenadores} coordenadores e ${totalLideres} líderes cadastrados.`}
          </p>
        </div>

        {!isCoordRegional && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {visibleFilterOptions.map((item) => (
              <button
                key={item.value}
                onClick={() => setFilterTipo(item.value)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  filterTipo === item.value ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">{actionLabel}</h2>
            {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nome *</label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm((current) => ({ ...current, nome: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Telefone</label>
                  <input
                    value={form.telefone}
                    onChange={(e) => setForm((current) => ({ ...current, telefone: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Senha *</label>
                  <input
                    type="password"
                    value={form.senha}
                    onChange={(e) => setForm((current) => ({ ...current, senha: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {showTipoField ? (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Perfil *</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm((current) => ({ ...current, tipo: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {tiposPermitidos.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-2.5">
                  Perfil: <span className="font-semibold text-gray-700">{tiposPermitidos[0]?.label}</span>
                </div>
              )}

              {showResponsavelField && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{responsavelLabel}</label>
                  <select
                    value={form.coordenador_id}
                    onChange={(e) => setForm((current) => ({ ...current, coordenador_id: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione</option>
                    {responsavelOptions.map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        {item.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {showRegiaoField && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Bairro *</label>
                  <select
                    value={form.regiao_id}
                    onChange={(e) => setForm((current) => ({ ...current, regiao_id: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione</option>
                    {regioes.map((regiao) => (
                      <option key={regiao.id} value={String(regiao.id)}>
                        {regiao.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {showBairroRegiaoField && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Bairro de atuação</label>
                  <input
                    value={form.bairro_regiao}
                    onChange={(e) => setForm((current) => ({ ...current, bairro_regiao: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setCreationPreset(null);
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold text-sm"
                >
                  Cancelar
                </button>
                <button onClick={save} disabled={saving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50">
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

        {tipoOrder.map((tipo) => {
          const list = groups[tipo];
          if (!list || list.length === 0) return null;

          const cfg = tipoConfig[tipo] || tipoConfig.lider;
          return (
            <div key={tipo} className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {cfg.label} ({list.length})
              </p>
              <div className="space-y-2">
                {list.map((item) => (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 flex items-center gap-3 ${
                      !item.ativo ? "opacity-50" : ""
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                      {item.nome[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{item.nome}</p>
                      <p className="text-xs text-gray-400">{item.telefone || item.email || "-"}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                        {item.regiao_id && (
                          <p className="text-xs text-gray-500">Bairro: {regiaoById.get(item.regiao_id) || "Não informado"}</p>
                        )}
                        {item.tipo === "lider" && item.coordenador_id && usuarioById.get(item.coordenador_id) && (
                          <p className="text-xs text-gray-500">Coordenador: {usuarioById.get(item.coordenador_id)?.nome}</p>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    {canEdit && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleAtivo(item)}
                          className={`text-xs px-2 py-1 rounded-lg font-medium ${
                            item.ativo ? "bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600" : "bg-green-100 text-green-600"
                          }`}
                        >
                          {item.ativo ? "Desativar" : "Ativar"}
                        </button>
                        {canDeleteUsuario(usuario?.tipo, usuario?.id, item) && (
                          <button onClick={() => deleteUsuario(item)} className="text-xs px-2 py-1 rounded-lg font-medium bg-red-50 text-red-700 hover:bg-red-100">
                            Excluir
                          </button>
                        )}
                      </div>
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
