import { Header } from "../components/layout/Header";
import { useEffect, useState } from "react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast } from "sonner";
import { useProjectContext } from "../contexts/ProjectContext";
import { apiDelete, apiGet, apiPost, apiPut } from "../lib/apiClient";
import { Lightbulb, TrendingUp, TrendingDown, Minus, Plus, Pencil, Trash2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Licao {
  id: number;
  projeto_id: number;
  titulo: string;
  descricao: string;
  area: string;
  fase_projeto: string;
  tipo: "Positiva" | "Negativa" | "Neutra";
  impacto: "Alto" | "Médio" | "Baixo";
  recomendacao: string;
  criado_por: string;
  criado_em: string;
}

interface LicaoForm {
  [key: string]: string;
  titulo: string;
  descricao: string;
  area: string;
  fase_projeto: string;
  tipo: string;
  impacto: string;
  recomendacao: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AREAS = ["M&E", "Financeiro", "Parceiros", "Equipa", "Técnico", "Comunicação", "Gestão", "Outro"];
const FASES = ["Início", "Planeamento", "Execução", "Monitorização", "Encerramento"];
const TIPOS = ["Positiva", "Negativa", "Neutra"] as const;
const IMPACTOS = ["Alto", "Médio", "Baixo"] as const;

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  Positiva: { label: "Positiva", color: "text-green-700", bg: "bg-green-50 border-green-200", icon: TrendingUp },
  Negativa: { label: "Negativa", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: TrendingDown },
  Neutra: { label: "Neutra", color: "text-gray-700", bg: "bg-gray-50 border-gray-200", icon: Minus },
};

const IMPACTO_CONFIG: Record<string, { color: string; bg: string }> = {
  Alto: { color: "text-red-700", bg: "bg-red-100" },
  Médio: { color: "text-amber-700", bg: "bg-amber-100" },
  Baixo: { color: "text-blue-700", bg: "bg-blue-100" },
};

const AREA_COLORS: Record<string, string> = {
  "M&E": "bg-purple-100 text-purple-700",
  Financeiro: "bg-yellow-100 text-yellow-700",
  Parceiros: "bg-blue-100 text-blue-700",
  Equipa: "bg-green-100 text-green-700",
  Técnico: "bg-indigo-100 text-indigo-700",
  Comunicação: "bg-pink-100 text-pink-700",
  Gestão: "bg-orange-100 text-orange-700",
  Outro: "bg-gray-100 text-gray-700",
};

const initialForm: LicaoForm = {
  titulo: "",
  descricao: "",
  area: "Gestão",
  fase_projeto: "Execução",
  tipo: "Positiva",
  impacto: "Médio",
  recomendacao: "",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LicoesPage() {
  const { activeProject, activeProjectId } = useProjectContext();
  const [licoes, setLicoes] = useState<Licao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<LicaoForm>(initialForm);

  // Filters
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterArea, setFilterArea] = useState<string>("all");

  const loadLicoes = async () => {
    if (!activeProjectId) return;
    setIsLoading(true);
    try {
      const data = await apiGet<Licao[]>(`/api/projects/${activeProjectId}/lessons`);
      setLicoes(data);
    } catch {
      toast.error("Não foi possível carregar as lições aprendidas");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLicoes();
  }, [activeProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId) return;
    setIsSubmitting(true);
    try {
      if (editingId) {
        await apiPut<Licao>(`/api/projects/${activeProjectId}/lessons/${editingId}`, form);
        toast.success("Lição atualizada");
      } else {
        await apiPost<Licao>(`/api/projects/${activeProjectId}/lessons`, form);
        toast.success("Lição registada");
      }
      setForm(initialForm);
      setEditingId(null);
      setShowForm(false);
      await loadLicoes();
    } catch {
      toast.error("Não foi possível guardar a lição");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (l: Licao) => {
    setForm({
      titulo: l.titulo,
      descricao: l.descricao,
      area: l.area,
      fase_projeto: l.fase_projeto,
      tipo: l.tipo,
      impacto: l.impacto,
      recomendacao: l.recomendacao,
    });
    setEditingId(l.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (!activeProjectId) return;
    if (!confirm("Eliminar esta lição aprendida?")) return;
    try {
      await apiDelete(`/api/projects/${activeProjectId}/lessons/${id}`);
      toast.success("Lição eliminada");
      await loadLicoes();
    } catch {
      toast.error("Não foi possível eliminar");
    }
  };

  const filtered = licoes.filter((l) => {
    if (filterTipo !== "all" && l.tipo !== filterTipo) return false;
    if (filterArea !== "all" && l.area !== filterArea) return false;
    return true;
  });

  const counts = {
    positivas: licoes.filter((l) => l.tipo === "Positiva").length,
    negativas: licoes.filter((l) => l.tipo === "Negativa").length,
    neutras: licoes.filter((l) => l.tipo === "Neutra").length,
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
          <Card className="p-8 text-center text-gray-500">
            <Lightbulb className="mx-auto mb-3 text-gray-300" size={40} />
            <p>Seleciona um projeto para ver as suas lições aprendidas.</p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Lightbulb className="text-amber-500" size={26} />
              Lições Aprendidas
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{activeProject.name}</p>
          </div>
          <Button onClick={() => { setShowForm((v) => !v); if (editingId) { setEditingId(null); setForm(initialForm); } }}>
            {showForm && !editingId ? (
              "Cancelar"
            ) : (
              <>
                <Plus size={16} className="mr-1" />
                Nova lição
              </>
            )}
          </Button>
        </div>

        {/* Summary strip */}
        {licoes.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "Positivas", count: counts.positivas, color: "text-green-700", bg: "bg-green-50 border border-green-200" },
              { label: "Negativas", count: counts.negativas, color: "text-red-700", bg: "bg-red-50 border border-red-200" },
              { label: "Neutras", count: counts.neutras, color: "text-gray-700", bg: "bg-gray-50 border border-gray-200" },
            ].map((s) => (
              <div key={s.label} className={`rounded-lg p-4 text-center ${s.bg}`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <Card className="p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              {editingId ? "Editar lição" : "Registar lição aprendida"}
            </h2>
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div>
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  required
                  value={form.titulo}
                  onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
                  placeholder="Ex: Envolvimento precoce das comunidades melhora a adesão"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm((p) => ({ ...p, tipo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Impacto</Label>
                  <Select value={form.impacto} onValueChange={(v) => setForm((p) => ({ ...p, impacto: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {IMPACTOS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Área</Label>
                  <Select value={form.area} onValueChange={(v) => setForm((p) => ({ ...p, area: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fase do projeto</Label>
                  <Select value={form.fase_projeto} onValueChange={(v) => setForm((p) => ({ ...p, fase_projeto: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FASES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={form.descricao}
                  onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
                  placeholder="O que aconteceu? Qual foi o contexto? Quais foram os fatores?"
                  rows={3}
                  className="text-sm"
                />
              </div>

              <div>
                <Label>Recomendação para projetos futuros</Label>
                <Textarea
                  value={form.recomendacao}
                  onChange={(e) => setForm((p) => ({ ...p, recomendacao: e.target.value }))}
                  placeholder="O que deve ser feito de forma diferente (ou igual) em projetos futuros?"
                  rows={2}
                  className="text-sm"
                />
              </div>

              <div className="flex justify-end gap-2">
                {editingId && (
                  <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(initialForm); setShowForm(false); }}>
                    Cancelar
                  </Button>
                )}
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "A guardar..." : editingId ? "Guardar alterações" : "Registar lição"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Filters */}
        {licoes.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex gap-1">
              {["all", ...TIPOS].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterTipo(t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filterTipo === t
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t === "all" ? "Todas" : t}
                </button>
              ))}
            </div>
            <div className="flex gap-1 flex-wrap">
              {["all", ...AREAS].map((a) => (
                <button
                  key={a}
                  onClick={() => setFilterArea(a)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filterArea === a
                      ? "bg-slate-700 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {a === "all" ? "Todas as áreas" : a}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <Card className="p-8 text-center text-gray-400">A carregar...</Card>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center">
            <Lightbulb className="mx-auto mb-3 text-gray-300" size={36} />
            <p className="text-gray-500 text-sm">
              {licoes.length === 0
                ? "Ainda não há lições aprendidas registadas. Regista a primeira!"
                : "Nenhuma lição corresponde aos filtros selecionados."}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((l) => {
              const tc = TIPO_CONFIG[l.tipo];
              const ic = IMPACTO_CONFIG[l.impacto];
              const TipoIcon = tc?.icon ?? Minus;
              return (
                <div key={l.id} className={`rounded-lg border p-4 ${tc?.bg ?? ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <TipoIcon className={`mt-0.5 flex-shrink-0 ${tc?.color}`} size={18} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{l.titulo}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ic?.bg} ${ic?.color}`}>
                            Impacto {l.impacto}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${AREA_COLORS[l.area] ?? "bg-gray-100 text-gray-600"}`}>
                            {l.area}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {l.fase_projeto}
                          </span>
                          {l.criado_por && (
                            <span className="text-xs text-gray-400">por {l.criado_por}</span>
                          )}
                        </div>
                        {l.descricao && (
                          <p className="text-sm text-gray-600 mt-2 leading-relaxed">{l.descricao}</p>
                        )}
                        {l.recomendacao && (
                          <div className="mt-2 pl-3 border-l-2 border-blue-300">
                            <p className="text-xs font-medium text-blue-700 mb-0.5">Recomendação</p>
                            <p className="text-sm text-gray-700">{l.recomendacao}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(l)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => void handleDelete(l.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
