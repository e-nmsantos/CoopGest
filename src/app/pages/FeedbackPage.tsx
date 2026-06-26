import { useState, useEffect } from "react";
import { useParams } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { Star, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError, apiGet, apiPost } from "../lib/apiClient";

interface FeedbackForm {
  titulo: string;
  descricao: string;
  projeto_nome: string;
}

export function FeedbackPage() {
  const { token } = useParams<{ token: string }>();
  const [form, setForm] = useState<FeedbackForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [nome, setNome] = useState("");
  const [resposta, setResposta] = useState("");
  const [avaliacao, setAvaliacao] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);

  useEffect(() => {
    if (!token) return;
    apiGet<FeedbackForm>(`/api/feedback/${token}`)
      .then(data => {
        if (data) setForm(data);
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 404) {
          setNotFound(true);
          return;
        }
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!avaliacao) {
      toast.error("Por favor, dê uma avaliação de 1 a 5 estrelas");
      return;
    }
    try {
      await apiPost<null>(`/api/feedback/${token}`, { nome_respondente: nome, resposta, avaliacao });
      setSubmitted(true);
    } catch {
      toast.error("Erro ao submeter feedback. Tente novamente.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">A carregar formulário...</p>
      </div>
    );
  }

  if (notFound || !form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <p className="text-gray-500 text-lg font-medium mb-2">Formulário não encontrado</p>
          <p className="text-gray-400 text-sm">Este link pode estar inativo ou ter expirado.</p>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <CheckCircle2 className="size-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Obrigado pelo seu feedback!</h2>
          <p className="text-gray-500 text-sm">
            A sua resposta foi registada e será analisada pela equipa do projeto.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-8">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Star className="size-6 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">{form.titulo}</h1>
          <p className="text-sm text-gray-500 mt-1">Projeto: {form.projeto_nome}</p>
          {form.descricao && (
            <p className="text-sm text-gray-600 mt-3 text-left bg-gray-50 rounded-lg p-3">{form.descricao}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="nome">O seu nome (opcional)</Label>
            <Input
              id="nome"
              placeholder="Nome ou iniciais..."
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="resposta">A sua resposta / feedback *</Label>
            <Textarea
              id="resposta"
              required
              placeholder="Partilhe a sua experiência, sugestões ou comentários..."
              value={resposta}
              onChange={e => setResposta(e.target.value)}
              rows={5}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Avaliação geral *</Label>
            <div className="flex items-center gap-2 mt-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setAvaliacao(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`size-8 transition-colors ${star <= (hoveredStar || avaliacao) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                  />
                </button>
              ))}
              {avaliacao > 0 && (
                <span className="text-sm text-gray-600 ml-2">
                  {["", "Muito mau", "Mau", "Razoável", "Bom", "Excelente"][avaliacao]}
                </span>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full">
            Submeter Feedback
          </Button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-4">
          Powered by CoopGest — Gestão de Projetos Cooperativos
        </p>
      </Card>
    </div>
  );
}
