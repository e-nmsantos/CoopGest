import { useEffect, useState, useCallback } from "react";
import { Header } from "../components/layout/Header";
import { Card } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Save, ChevronDown, ChevronUp } from "lucide-react";
import { useProjectContext } from "../contexts/ProjectContext";
import { apiGet, apiPut } from "../lib/apiClient";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type Criterio = "Relevância" | "Coerência" | "Eficácia" | "Eficiência" | "Impacto" | "Sustentabilidade";

interface AvaliacaoRow {
  criterio: Criterio;
  questoes: string;
  indicadores: string;
  metodos: string;
  fontes: string;
  momento: string;
}

const CRITERIO_META: Record<Criterio, { color: string; descricao: string }> = {
  Relevância: {
    color: "border-blue-300 bg-blue-50",
    descricao: "O projeto responde a necessidades reais dos beneficiários e está alinhado com prioridades nacionais e dos doadores?",
  },
  Coerência: {
    color: "border-indigo-300 bg-indigo-50",
    descricao: "Os objetivos, atividades e orçamento são internamente consistentes? O projeto complementa outras intervenções na área?",
  },
  Eficácia: {
    color: "border-green-300 bg-green-50",
    descricao: "O projeto atingiu ou está a atingir os objetivos e resultados previstos?",
  },
  Eficiência: {
    color: "border-amber-300 bg-amber-50",
    descricao: "Os recursos (humanos, financeiros, materiais) foram usados de forma otimizada para produzir os resultados?",
  },
  Impacto: {
    color: "border-purple-300 bg-purple-50",
    descricao: "Quais as mudanças de longo prazo — positivas e negativas, esperadas e inesperadas — atribuíveis ao projeto?",
  },
  Sustentabilidade: {
    color: "border-rose-300 bg-rose-50",
    descricao: "Os benefícios do projeto persistirão após o fim do financiamento? Existe capacidade local para continuar?",
  },
};

const CRITERIOS: Criterio[] = ["Relevância", "Coerência", "Eficácia", "Eficiência", "Impacto", "Sustentabilidade"];

// ---------------------------------------------------------------------------
// Criterion card
// ---------------------------------------------------------------------------

function CriterioCard({
  row,
  projectId,
  onChange,
}: {
  row: AvaliacaoRow;
  projectId: string;
  onChange: (updated: AvaliacaoRow) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const meta = CRITERIO_META[row.criterio];

  const field = (key: keyof AvaliacaoRow) => (
    <div>
      <Label className="text-xs text-muted-foreground capitalize">{key === "questoes" ? "Questões de avaliação" : key === "indicadores" ? "Indicadores" : key === "metodos" ? "Métodos / Instrumentos" : key === "fontes" ? "Fontes de informação" : "Momento de avaliação"}</Label>
      <Textarea
        rows={2}
        className="text-sm mt-1"
        placeholder={
          key === "questoes" ? "Ex: Em que medida o projeto contribuiu para...?"
          : key === "indicadores" ? "Ex: % de beneficiários que afirmam..."
          : key === "metodos" ? "Ex: Inquéritos, entrevistas, grupos focais, revisão documental"
          : key === "fontes" ? "Ex: Registos de participação, relatórios de monitoria, entrevistas"
          : "Ex: Avaliação intermédia (mês 6), final (mês 12)"
        }
        value={row[key]}
        onChange={(e) => onChange({ ...row, [key]: e.target.value })}
      />
    </div>
  );

  const save = async () => {
    setSaving(true);
    try {
      await apiPut(`/api/avaliacao/${encodeURIComponent(row.criterio)}`, {
        projeto_id: projectId,
        questoes: row.questoes,
        indicadores: row.indicadores,
        metodos: row.metodos,
        fontes: row.fontes,
        momento: row.momento,
      });
      toast.success(`${row.criterio} guardado`);
    } catch {
      toast.error("Erro ao guardar");
    } finally {
      setSaving(false);
    }
  };

  const filled = [row.questoes, row.indicadores, row.metodos, row.fontes, row.momento].filter(Boolean).length;

  return (
    <div className={`rounded-lg border-2 overflow-hidden ${meta.color}`}>
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">{row.criterio}</span>
          {filled > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/60 text-gray-600">
              {filled}/5 campos
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-current/10 pt-3">
          <p className="text-xs text-muted-foreground italic">{meta.descricao}</p>
          {field("questoes")}
          {field("indicadores")}
          {field("metodos")}
          {field("fontes")}
          {field("momento")}
          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="size-3.5 mr-1.5" />
              {saving ? "A guardar..." : "Guardar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function AvaliacaoPage() {
  const { activeProject, activeProjectId } = useProjectContext();
  const [rows, setRows] = useState<AvaliacaoRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!activeProjectId) { setRows([]); return; }
    setLoading(true);
    apiGet<AvaliacaoRow[]>(`/api/avaliacao?projeto_id=${activeProjectId}`)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [activeProjectId]);

  useEffect(() => { load(); }, [load]);

  const handleChange = (updated: AvaliacaoRow) => {
    setRows((prev) => prev.map((r) => (r.criterio === updated.criterio ? updated : r)));
  };

  if (!activeProjectId) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
        <Header showBackButton />
        <div className="flex-1 min-h-0 overflow-auto p-6">
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            Seleciona um projeto ativo no topo para aceder ao Plano de Avaliação.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <Header showBackButton />
      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Plano de Avaliação</h1>
          <p className="text-gray-600 mt-1">{activeProject?.name}</p>
        </div>

        <Card className="p-5 mb-6 bg-slate-50 border-slate-200">
          <h2 className="font-semibold text-slate-800 mb-1">Critérios CAD/OCDE</h2>
          <p className="text-sm text-slate-600">
            Para cada critério, define as questões de avaliação, os indicadores, os métodos de recolha de dados,
            as fontes de informação e o momento de avaliação (intermédia / final). Expande cada critério para editar.
          </p>
        </Card>

        {loading ? (
          <Card className="p-10 text-center text-gray-500">A carregar...</Card>
        ) : (
          <div className="space-y-3">
            {(rows.length > 0 ? rows : CRITERIOS.map((c) => ({ criterio: c, questoes: "", indicadores: "", metodos: "", fontes: "", momento: "" }))).map((row) => (
              <CriterioCard
                key={row.criterio}
                row={row}
                projectId={activeProjectId}
                onChange={handleChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
