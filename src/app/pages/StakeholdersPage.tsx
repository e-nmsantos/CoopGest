import { useState, useEffect, useCallback } from "react";
import { useProjectContext } from "../contexts/ProjectContext";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/apiClient";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users, Grid3X3, List } from "lucide-react";

interface Stakeholder {
  id: number;
  nome: string;
  organizacao: string;
  papel: string;
  interesse: "Alto" | "Médio" | "Baixo";
  influencia: "Alto" | "Médio" | "Baixo";
  posicao: "Apoiante" | "Neutro" | "Oponente";
  estrategia: string;
  contacto: string;
  notas: string;
  criado_por: string;
}

interface MatrixData {
  gerir_de_perto: Stakeholder[];
  manter_satisfeito: Stakeholder[];
  manter_informado: Stakeholder[];
  monitorizar: Stakeholder[];
}

type View = "matriz" | "lista";

const EMPTY_FORM: Omit<Stakeholder, "id" | "criado_por"> = {
  nome: "",
  organizacao: "",
  papel: "",
  interesse: "Médio",
  influencia: "Médio",
  posicao: "Neutro",
  estrategia: "",
  contacto: "",
  notas: "",
};

function posicaoBadge(posicao: string) {
  if (posicao === "Apoiante")
    return "bg-green-100 text-green-800 border border-green-200";
  if (posicao === "Oponente")
    return "bg-red-100 text-red-800 border border-red-200";
  return "bg-slate-100 text-slate-600 border border-slate-200";
}

function interesseBadge(v: string) {
  if (v === "Alto") return "bg-red-50 text-red-700";
  if (v === "Médio") return "bg-amber-50 text-amber-700";
  return "bg-slate-50 text-slate-600";
}

interface QuadrantProps {
  title: string;
  subtitle: string;
  colorClass: string;
  headerClass: string;
  stakeholders: Stakeholder[];
  onEdit: (sk: Stakeholder) => void;
}

function Quadrant({ title, subtitle, colorClass, headerClass, stakeholders, onEdit }: QuadrantProps) {
  return (
    <div className={`rounded-lg border-2 ${colorClass} p-4 min-h-[180px]`}>
      <div className={`text-xs font-bold uppercase tracking-wide mb-0.5 ${headerClass}`}>{title}</div>
      <div className="text-xs text-slate-500 mb-3">{subtitle}</div>
      <div className="flex flex-wrap gap-1.5">
        {stakeholders.length === 0 && (
          <span className="text-xs text-slate-400 italic">Nenhum stakeholder</span>
        )}
        {stakeholders.map((sk) => (
          <button
            key={sk.id}
            onClick={() => onEdit(sk)}
            title={sk.organizacao || sk.nome}
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-opacity hover:opacity-80 ${posicaoBadge(sk.posicao)}`}
          >
            {sk.nome}
          </button>
        ))}
      </div>
    </div>
  );
}

export function StakeholdersPage() {
  const { activeProjectId, activeProject } = useProjectContext();
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [matrix, setMatrix] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("matriz");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<Stakeholder, "id" | "criado_por">>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const [sks, mat] = await Promise.all([
        apiGet<Stakeholder[]>(`/api/projects/${id}/stakeholders`),
        apiGet<MatrixData>(`/api/projects/${id}/stakeholders/matrix`),
      ]);
      setStakeholders(Array.isArray(sks) ? sks : []);
      setMatrix(mat && typeof mat === "object" ? mat : null);
    } catch {
      toast.error("Erro ao carregar stakeholders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeProjectId) {
      void fetchData(activeProjectId);
    } else {
      setStakeholders([]);
      setMatrix(null);
    }
  }, [activeProjectId, fetchData]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(sk: Stakeholder) {
    setForm({
      nome: sk.nome,
      organizacao: sk.organizacao,
      papel: sk.papel,
      interesse: sk.interesse,
      influencia: sk.influencia,
      posicao: sk.posicao,
      estrategia: sk.estrategia,
      contacto: sk.contacto,
      notas: sk.notas,
    });
    setEditingId(sk.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!activeProjectId) return;
    if (!form.nome.trim()) {
      toast.error("O nome é obrigatório");
      return;
    }
    setSaving(true);
    try {
      if (editingId !== null) {
        await apiPut(`/api/projects/${activeProjectId}/stakeholders/${editingId}`, form);
        toast.success("Stakeholder atualizado");
      } else {
        await apiPost(`/api/projects/${activeProjectId}/stakeholders`, form);
        toast.success("Stakeholder criado");
      }
      cancelForm();
      await fetchData(activeProjectId);
    } catch {
      toast.error("Erro ao guardar stakeholder");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(sk: Stakeholder) {
    if (!activeProjectId) return;
    if (!confirm(`Eliminar "${sk.nome}"?`)) return;
    try {
      await apiDelete(`/api/projects/${activeProjectId}/stakeholders/${sk.id}`);
      toast.success("Stakeholder eliminado");
      await fetchData(activeProjectId);
    } catch {
      toast.error("Erro ao eliminar stakeholder");
    }
  }

  // Summary counts
  const apoiantes = stakeholders.filter((s) => s.posicao === "Apoiante").length;
  const neutros = stakeholders.filter((s) => s.posicao === "Neutro").length;
  const oponentes = stakeholders.filter((s) => s.posicao === "Oponente").length;

  if (!activeProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <Users className="size-12 mb-3 opacity-40" />
        <p className="text-lg font-medium">Nenhum projeto selecionado</p>
        <p className="text-sm mt-1">Selecione um projeto para gerir stakeholders</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Stakeholders</h1>
          {activeProject && (
            <p className="text-sm text-slate-500 mt-0.5">{activeProject.nome}</p>
          )}
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="size-4" />
          Adicionar Stakeholder
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-slate-800">{stakeholders.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Total</div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-700">{apoiantes}</div>
          <div className="text-xs text-green-600 mt-0.5">Apoiantes</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-slate-600">{neutros}</div>
          <div className="text-xs text-slate-500 mt-0.5">Neutros</div>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-700">{oponentes}</div>
          <div className="text-xs text-red-600 mt-0.5">Oponentes</div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800 mb-4">
            {editingId !== null ? "Editar Stakeholder" : "Novo Stakeholder"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome do stakeholder"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Organização</label>
              <input
                type="text"
                value={form.organizacao}
                onChange={(e) => setForm((f) => ({ ...f, organizacao: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Organização"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Papel</label>
              <input
                type="text"
                value={form.papel}
                onChange={(e) => setForm((f) => ({ ...f, papel: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Papel no projeto"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Interesse</label>
              <select
                value={form.interesse}
                onChange={(e) =>
                  setForm((f) => ({ ...f, interesse: e.target.value as Stakeholder["interesse"] }))
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Alto">Alto</option>
                <option value="Médio">Médio</option>
                <option value="Baixo">Baixo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Influência</label>
              <select
                value={form.influencia}
                onChange={(e) =>
                  setForm((f) => ({ ...f, influencia: e.target.value as Stakeholder["influencia"] }))
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Alto">Alto</option>
                <option value="Médio">Médio</option>
                <option value="Baixo">Baixo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Posição</label>
              <select
                value={form.posicao}
                onChange={(e) =>
                  setForm((f) => ({ ...f, posicao: e.target.value as Stakeholder["posicao"] }))
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Apoiante">Apoiante</option>
                <option value="Neutro">Neutro</option>
                <option value="Oponente">Oponente</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Contacto</label>
              <input
                type="text"
                value={form.contacto}
                onChange={(e) => setForm((f) => ({ ...f, contacto: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Email / telefone"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Estratégia de Envolvimento</label>
              <textarea
                value={form.estrategia}
                onChange={(e) => setForm((f) => ({ ...f, estrategia: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Como envolver este stakeholder?"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">Notas</label>
              <textarea
                value={form.notas}
                onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Notas adicionais..."
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "A guardar..." : editingId !== null ? "Atualizar" : "Criar"}
            </button>
            <button
              onClick={cancelForm}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-md text-sm hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* View toggle */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setView("matriz")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            view === "matriz"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Grid3X3 className="size-4" />
          Matriz
        </button>
        <button
          onClick={() => setView("lista")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            view === "lista"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <List className="size-4" />
          Lista
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32 text-slate-500">
          <div className="animate-spin size-6 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
          A carregar...
        </div>
      )}

      {/* Matriz view */}
      {!loading && view === "matriz" && (
        <div>
          {/* Axis labels */}
          <div className="relative">
            {/* X-axis label (Influência) */}
            <div className="flex justify-center mb-1">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Influência →
              </div>
            </div>
            <div className="flex gap-0">
              {/* Y-axis label (Interesse) */}
              <div className="flex items-center mr-2">
                <div
                  className="text-xs font-semibold text-slate-500 uppercase tracking-widest"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                >
                  ← Interesse
                </div>
              </div>
              <div className="flex-1">
                {/* Column headers */}
                <div className="grid grid-cols-2 gap-1 mb-1">
                  <div className="text-center text-xs text-slate-400 font-medium">Baixa</div>
                  <div className="text-center text-xs text-slate-400 font-medium">Alta</div>
                </div>
                {/* Row: Alto interesse */}
                <div className="grid grid-cols-2 gap-1 mb-1">
                  <div className="text-right text-xs text-slate-400 font-medium self-center pr-2 absolute -ml-16">
                  </div>
                  {/* Manter Informado — Alto interesse, Baixa influência */}
                  <Quadrant
                    title="Manter Informado"
                    subtitle="Alto interesse, baixa influência"
                    colorClass="border-green-200 bg-green-50/40"
                    headerClass="text-green-700"
                    stakeholders={matrix?.manter_informado ?? []}
                    onEdit={openEdit}
                  />
                  {/* Gerir de Perto — Alto interesse, Alta influência */}
                  <Quadrant
                    title="Gerir de Perto"
                    subtitle="Alto interesse, alta influência"
                    colorClass="border-blue-200 bg-blue-50/40"
                    headerClass="text-blue-700"
                    stakeholders={matrix?.gerir_de_perto ?? []}
                    onEdit={openEdit}
                  />
                </div>
                {/* Row labels */}
                <div className="grid grid-cols-2 gap-1 -mt-1 mb-1">
                  <div className="text-center text-xs text-slate-300">— Alto</div>
                  <div />
                </div>
                <div className="grid grid-cols-2 gap-1 mb-1">
                  <div className="text-center text-xs text-slate-300">Baixo —</div>
                  <div />
                </div>
                {/* Row: Baixo interesse */}
                <div className="grid grid-cols-2 gap-1">
                  {/* Monitorizar — Baixo interesse, Baixa influência */}
                  <Quadrant
                    title="Monitorizar"
                    subtitle="Baixo interesse, baixa influência"
                    colorClass="border-slate-200 bg-slate-50/40"
                    headerClass="text-slate-600"
                    stakeholders={matrix?.monitorizar ?? []}
                    onEdit={openEdit}
                  />
                  {/* Manter Satisfeito — Baixo interesse, Alta influência */}
                  <Quadrant
                    title="Manter Satisfeito"
                    subtitle="Baixo interesse, alta influência"
                    colorClass="border-amber-200 bg-amber-50/40"
                    headerClass="text-amber-700"
                    stakeholders={matrix?.manter_satisfeito ?? []}
                    onEdit={openEdit}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span className="font-medium">Legenda:</span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-3 rounded-full bg-green-200 border border-green-400" />
              Apoiante
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-3 rounded-full bg-slate-200 border border-slate-400" />
              Neutro
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-3 rounded-full bg-red-200 border border-red-400" />
              Oponente
            </span>
            <span className="text-slate-400 italic">Clique num stakeholder para editar</span>
          </div>

          {stakeholders.length === 0 && !loading && (
            <div className="mt-4 text-center py-8 text-slate-400 text-sm">
              Nenhum stakeholder adicionado ainda.{" "}
              <button
                onClick={openCreate}
                className="text-blue-600 hover:underline font-medium"
              >
                Adicionar o primeiro
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lista view */}
      {!loading && view === "lista" && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          {stakeholders.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="size-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum stakeholder encontrado</p>
              <button
                onClick={openCreate}
                className="mt-3 text-blue-600 text-sm hover:underline"
              >
                Adicionar stakeholder
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Organização</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Papel</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Interesse</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Influência</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Posição</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody>
                {stakeholders.map((sk, i) => (
                  <tr
                    key={sk.id}
                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">{sk.nome}</td>
                    <td className="px-4 py-3 text-slate-600">{sk.organizacao || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{sk.papel || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${interesseBadge(sk.interesse)}`}>
                        {sk.interesse}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${interesseBadge(sk.influencia)}`}>
                        {sk.influencia}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${posicaoBadge(sk.posicao)}`}>
                        {sk.posicao}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEdit(sk)}
                          className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          onClick={() => void handleDelete(sk)}
                          className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
