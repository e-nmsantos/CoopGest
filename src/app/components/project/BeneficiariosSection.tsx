import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Trash2, Users, Link2, Copy, Check, Star, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { apiDelete, apiGet, apiPost } from "../../lib/apiClient";

interface DbBeneficiario {
  id: number;
  projeto_id: number;
  nome: string;
  tipo: string;
  numero: number;
  descricao: string;
  data_registo: string;
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

const TIPOS = ['Individual', 'Grupo', 'Comunidade', 'Organização'];

export function BeneficiariosSection({ projectId, initialBeneficiarios = [] }: BeneficiariosSectionProps) {
  const [items, setItems] = useState<DbBeneficiario[]>(initialBeneficiarios);
  const [form, setForm] = useState({ nome: '', tipo: 'Individual', numero: '1', descricao: '' });

  // Feedback state
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
      });
      setItems((prev) => [raw, ...prev]);
      setForm({ nome: '', tipo: 'Individual', numero: '1', descricao: '' });
      toast.success('Beneficiário adicionado');
    } catch {
      toast.error('Erro ao adicionar beneficiário');
    }
  };

  const handleDelete = async (id: number) => {
    setItems((prev) => prev.filter((b) => b.id !== id));
    try {
      await apiDelete<null>(`/api/beneficiarios/${id}`);
      toast.success('Beneficiário eliminado');
    } catch {
      toast.error('Erro ao eliminar beneficiário');
    }
  };

  const handleGenerateFeedbackLink = async () => {
    if (!feedbackTitulo.trim()) { toast.error("Insira um título para o formulário"); return; }
    setGeneratingLink(true);
    try {
      const data = await apiPost<{ token: string }>(`/api/projects/${projectId}/feedback-token`, { titulo: feedbackTitulo, descricao: feedbackDescricao });
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
      setFeedbacks(Array.isArray(data) ? data : data.feedbacks || []);
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
      {/* Resumo */}
      <Card className="p-4 bg-teal-50 border-teal-200">
        <div className="flex items-center gap-3">
          <Users className="size-8 text-teal-600" />
          <div>
            <div className="text-sm text-teal-700">Total de Beneficiários</div>
            <div className="text-3xl font-bold text-teal-800">{total.toLocaleString('pt-PT')}</div>
          </div>
        </div>
      </Card>

      {/* Formulário */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Adicionar Beneficiário</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <Input
            placeholder="Nome / Grupo *"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
          <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min="1"
            placeholder="Nº de pessoas"
            value={form.numero}
            onChange={(e) => setForm({ ...form, numero: e.target.value })}
          />
        </div>
        <Input
          placeholder="Descrição (opcional)"
          value={form.descricao}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          className="mb-3"
        />
        <Button onClick={handleAdd} disabled={!form.nome.trim()}>Adicionar</Button>
      </Card>

      {/* Lista */}
      {items.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">Sem beneficiários registados</div>
      ) : (
        <div className="space-y-2">
          {items.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 group">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-gray-900">{b.nome}</span>
                  <span className="text-xs px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full">{b.tipo}</span>
                  <span className="text-sm font-semibold text-teal-700">{(b.numero || 1).toLocaleString('pt-PT')} pessoas</span>
                </div>
                {b.descricao && <p className="text-xs text-gray-500">{b.descricao}</p>}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDelete(b.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Formulário de Feedback */}
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
            <Input
              placeholder="Título do formulário *"
              value={feedbackTitulo}
              onChange={e => setFeedbackTitulo(e.target.value)}
            />
            <Input
              placeholder="Descrição / instruções (opcional)"
              value={feedbackDescricao}
              onChange={e => setFeedbackDescricao(e.target.value)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateFeedbackLink}
              disabled={generatingLink || !feedbackTitulo.trim()}
            >
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
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-gray-500"
              onClick={() => setFeedbackLink("")}
            >
              Gerar novo link
            </Button>
          </div>
        )}

        {/* View feedbacks */}
        <div className="mt-4 pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadFeedbacks}
            disabled={loadingFeedbacks}
            className="text-sm text-gray-600"
          >
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
                  {feedbacks.map(f => (
                    <div key={f.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-700">
                          {f.nome_respondente || "Anónimo"}
                        </span>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`size-3 ${i < f.avaliacao ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                            />
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
