import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Trash2, Users, Link2, Copy, Check, Star, ChevronDown, ChevronUp, PieChart } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { apiDelete, apiGet, apiPost } from "../../lib/apiClient";
import { BeneficiariosDesagregacao } from "./BeneficiariosDesagregacao";

interface Desagregacao {
  id: number;
  dimensao: string;
  categoria: string;
  numero: number;
}

interface DbBeneficiario {
  id: number;
  projeto_id: number;
  nome: string;
  tipo: string;
  numero: number;
  descricao: string;
  localizacao?: string;
  data_registo: string;
  desagregacao?: Desagregacao[];
}

interface FeedbackItem {
  id: number;
  nome_respondente?: string;
  resposta: string;
  avaliacao: number;
  criado_em: string;
}

interface BeneficiariosSectionProps {
  projectId: string;
  initialBeneficiarios?: DbBeneficiario[];
}

const TIPOS = ["Individual", "Grupo", "Comunidade", "Organização"];

const DIMENSOES = [
  { value: "genero", label: "Género" },
  { value: "faixa_etaria", label: "Faixa etária" },
  { value: "localizacao", label: "Localização" },
  { value: "vulnerabilidade", label: "Vulnerabilidade" },
  { value: "outro", label: "Outro" },
];

const CATEGORIAS_PADRAO: Record<string, string[]> = {
  genero: ["Masculino", "Feminino", "Outro / Não especificado"],
  faixa_etaria: ["0-14 anos", "15-24 anos", "25-49 anos", "50-64 anos", "65+ anos"],
  localizacao: ["Urbano", "Rural", "Periurbano"],
  vulnerabilidade: ["Pessoas com deficiência", "Deslocados internos", "Refugiados", "Mulheres chefes de família", "Outros grupos vulneráveis"],
  outro: [],
};

function DesagregacaoPanel({ ben, projectId: _projectId }: { ben: DbBeneficiario; projectId: string }) {
  const [des, setDes] = useState<Desagregacao[]>(ben.desagregacao ?? []);
  const [dimensao, setDimensao] = useState("genero");
  const [categoria, setCategoria] = useState("");
  const [numero, setNumero] = useState("");
  const [saving, setSaving] = useState(false);

  const cats = CATEGORIAS_PADRAO[dimensao] ?? [];

  const handleAdd = async () => {
    const cat = categoria.trim();
    if (!cat) { toast.error("Categoria é obrigatória"); return; }
    setSaving(true);
    try {
      const row = await apiPost<Desagregacao>(`/api/beneficiarios/${ben.id}/desagregacao`, {
        dimensao,
        categoria: cat,
        numero: parseInt(numero) || 0,
      });
      setDes((prev) => [...prev, row]);
      setCategoria("");
      setNumero("");
      toast.success("Desagregação adicionada");
    } catch {
      toast.error("Erro ao adicionar desagregação");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDes((prev) => prev.filter((d) => d.id !== id));
    try {
      await apiDelete(`/api/beneficiarios/desagregacao/${id}`);
    } catch {
      toast.error("Erro ao eliminar desagregação");
    }
  };

  const byDim: Record<string, Desagregacao[]> = {};
  for (const d of des) {
    (byDim[d.dimensao] ??= []).push(d);
  }

  return (
    <div className="border-t pt-3 mt-3 space-y-3">
      <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
        <PieChart className="size-3.5" /> Desagregação
      </p>

      {/* Existing disaggregations by dimension */}
      {Object.entries(byDim).map(([dim, rows]) => (
        <div key={dim}>
          <p className="text-xs text-gray-500 mb-1 capitalize">{DIMENSOES.find((d) => d.value === dim)?.label ?? dim}</p>
          <div className="flex flex-wrap gap-2">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-1 px-2 py-0.5 bg-teal-50 border border-teal-200 rounded text-xs">
                <span>{r.categoria}: <strong>{r.numero.toLocaleString("pt-PT")}</strong></span>
                <button
                  onClick={() => void handleDelete(r.id)}
                  className="text-teal-400 hover:text-red-500 ml-1 leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Add form */}
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Dimensão</p>
          <Select value={dimensao} onValueChange={(v) => { setDimensao(v); setCategoria(""); }}>
            <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DIMENSOES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Categoria</p>
          {cats.length > 0 ? (
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="h-7 text-xs w-44"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                {cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                <SelectItem value="__custom__">Outra (digitar)</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              className="h-7 text-xs w-44"
              placeholder="Categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            />
          )}
        </div>
        {categoria === "__custom__" && (
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Texto</p>
            <Input className="h-7 text-xs w-40" placeholder="Categoria personalizada"
              onChange={(e) => setCategoria(e.target.value === "" ? "__custom__" : e.target.value)} />
          </div>
        )}
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Nº</p>
          <Input
            type="number"
            className="h-7 text-xs w-20"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="0"
          />
        </div>
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={() => void handleAdd()}
          disabled={saving || !categoria || categoria === "__custom__"}
        >
          {saving ? "..." : "+ Add"}
        </Button>
      </div>
    </div>
  );
}

export function BeneficiariosSection({ projectId, initialBeneficiarios = [] }: BeneficiariosSectionProps) {
  const [items, setItems] = useState<DbBeneficiario[]>(initialBeneficiarios);
  const [form, setForm] = useState({ nome: "", tipo: "Individual", numero: "1", descricao: "", localizacao: "" });
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [feedbackLink, setFeedbackLink] = useState("");
  const [feedbackTitulo, setFeedbackTitulo] = useState("");
  const [feedbackDescricao, setFeedbackDescricao] = useState("");
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [showFeedbacks, setShowFeedbacks] = useState(false);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);

  const total = items.reduce((s, b) => s + (b.numero || 1), 0);

  const handleAdd = async () => {
    if (!form.nome.trim()) return;
    try {
      const raw = await apiPost<DbBeneficiario>(`/api/projects/${projectId}/beneficiarios`, {
        nome: form.nome,
        tipo: form.tipo,
        numero: parseInt(form.numero) || 1,
        descricao: form.descricao,
        localizacao: form.localizacao,
      });
      setItems((prev) => [raw, ...prev]);
      setForm({ nome: "", tipo: "Individual", numero: "1", descricao: "", localizacao: "" });
      toast.success("Beneficiário adicionado");
    } catch {
      toast.error("Erro ao adicionar beneficiário");
    }
  };

  const handleDelete = async (id: number) => {
    setItems((prev) => prev.filter((b) => b.id !== id));
    try {
      await apiDelete<null>(`/api/beneficiarios/${id}`);
      toast.success("Beneficiário eliminado");
    } catch {
      toast.error("Erro ao eliminar beneficiário");
    }
  };

  const handleGenerateFeedbackLink = async () => {
    if (!feedbackTitulo.trim()) { toast.error("Insira um título para o formulário"); return; }
    setGeneratingLink(true);
    try {
      const data = await apiPost<{ token: string }>(`/api/projects/${projectId}/feedback-token`, {
        titulo: feedbackTitulo,
        descricao: feedbackDescricao,
      });
      const link = `${window.location.origin}/feedback/${data.token}`;
      setFeedbackLink(link);
      toast.success("Link de feedback gerado!");
    } catch {
      toast.error("Erro ao gerar link de feedback");
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(feedbackLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const loadFeedbacks = async () => {
    if (showFeedbacks) { setShowFeedbacks(false); return; }
    setLoadingFeedbacks(true);
    try {
      const data = await apiGet<FeedbackItem[] | { feedbacks?: FeedbackItem[] }>(`/api/projects/${projectId}/feedbacks`);
      setFeedbacks(Array.isArray(data) ? data : data.feedbacks ?? []);
      setShowFeedbacks(true);
    } catch {
      toast.error("Erro ao carregar feedbacks");
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  const avgRating = feedbacks.length > 0
    ? (feedbacks.reduce((s, f) => s + f.avaliacao, 0) / feedbacks.length).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="p-4 bg-teal-50 border-teal-200">
        <div className="flex items-center gap-3">
          <Users className="size-8 text-teal-600" />
          <div>
            <div className="text-sm text-teal-700">Total de Beneficiários</div>
            <div className="text-3xl font-bold text-teal-800">{total.toLocaleString("pt-PT")}</div>
          </div>
        </div>
      </Card>

      {/* Form */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Adicionar Beneficiário / Grupo</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <Input
            placeholder="Nome / Grupo *"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
          <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Input
            type="number" min="1"
            placeholder="Nº de pessoas"
            value={form.numero}
            onChange={(e) => setForm({ ...form, numero: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <Input
            placeholder="Localização (opcional)"
            value={form.localizacao}
            onChange={(e) => setForm({ ...form, localizacao: e.target.value })}
          />
          <Input
            placeholder="Descrição (opcional)"
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          />
        </div>
        <Button onClick={() => void handleAdd()} disabled={!form.nome.trim()}>Adicionar</Button>
      </Card>

      {/* List */}
      {items.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">Sem beneficiários registados</div>
      ) : (
        <div className="space-y-2">
          {items.map((b) => {
            const isExpanded = expandedId === b.id;
            return (
              <div key={b.id} className="bg-white rounded-lg border border-gray-200 group">
                <div className="flex items-center justify-between p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-medium text-gray-900">{b.nome}</span>
                      <span className="text-xs px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full">{b.tipo}</span>
                      <span className="text-sm font-semibold text-teal-700">{(b.numero || 1).toLocaleString("pt-PT")} pessoas</span>
                      {b.localizacao && <span className="text-xs text-gray-400">{b.localizacao}</span>}
                    </div>
                    {b.descricao && <p className="text-xs text-gray-500">{b.descricao}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost" size="sm"
                      className="text-teal-500 hover:text-teal-700"
                      onClick={() => setExpandedId(isExpanded ? null : b.id)}
                      title="Desagregação"
                    >
                      {isExpanded ? <ChevronUp className="size-4" /> : <PieChart className="size-4" />}
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => void handleDelete(b.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4">
                    <DesagregacaoPanel ben={b} projectId={projectId} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Project-level disaggregation summary */}
      <BeneficiariosDesagregacao
        projectId={projectId}
        beneficiarios={items.map((b) => ({ id: b.id, nome: b.nome, numero: b.numero || 1 }))}
      />

      {/* Feedback section */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="size-4 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Formulário de Feedback Externo</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Gere um link público para recolher feedback dos beneficiários sem necessidade de login.
        </p>

        {!feedbackLink ? (
          <div className="space-y-3">
            <Input placeholder="Título do formulário *" value={feedbackTitulo}
              onChange={(e) => setFeedbackTitulo(e.target.value)} />
            <Input placeholder="Descrição / instruções (opcional)" value={feedbackDescricao}
              onChange={(e) => setFeedbackDescricao(e.target.value)} />
            <Button variant="outline" size="sm" onClick={() => void handleGenerateFeedbackLink()}
              disabled={generatingLink || !feedbackTitulo.trim()}>
              <Link2 className="size-4 mr-2" />
              {generatingLink ? "A gerar..." : "Gerar Link de Feedback"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <span className="text-sm text-green-800 flex-1 font-mono truncate">{feedbackLink}</span>
              <Button size="sm" variant="ghost" onClick={copyLink} className="shrink-0">
                {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-gray-500"
              onClick={() => setFeedbackLink("")}>
              Gerar novo link
            </Button>
          </div>
        )}

        <div className="mt-4 pt-4 border-t">
          <Button variant="ghost" size="sm" onClick={() => void loadFeedbacks()} disabled={loadingFeedbacks}
            className="text-sm text-gray-600">
            {showFeedbacks ? <ChevronUp className="size-4 mr-1" /> : <ChevronDown className="size-4 mr-1" />}
            {loadingFeedbacks ? "A carregar..." : `Ver feedbacks recebidos${feedbacks.length > 0 ? ` (${feedbacks.length})` : ""}`}
          </Button>

          {showFeedbacks && (
            <div className="mt-3 space-y-3">
              {feedbacks.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Nenhum feedback recebido ainda</p>
              ) : (
                <>
                  {avgRating && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Star className="size-4 text-yellow-400 fill-yellow-400" />
                      <span>Avaliação média: <strong>{avgRating}/5</strong> ({feedbacks.length} resposta{feedbacks.length !== 1 ? "s" : ""})</span>
                    </div>
                  )}
                  {feedbacks.map((f) => (
                    <div key={f.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-700">{f.nome_respondente || "Anónimo"}</span>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`size-3 ${i < f.avaliacao ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                          ))}
                          <span className="text-xs text-gray-400 ml-1">
                            {formatDistanceToNow(new Date(f.criado_em), { addSuffix: true, locale: pt })}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{f.resposta}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
