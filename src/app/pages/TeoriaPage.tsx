import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Header } from "../components/layout/Header";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { apiGet } from "../lib/apiClient";
import { useProjectContext } from "../contexts/ProjectContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LogframeItem {
  id: number;
  nivel: string;
  resultado: string;
  indicador: string;
  unidade: string;
  baseline: number;
  meta: number;
  valor_atual: number;
  estado: string;
  pressupostos: string;
}

type NivelKey = "Impacto" | "Resultado" | "Produção" | "Atividade";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NIVEIS: NivelKey[] = ["Impacto", "Resultado", "Produção", "Atividade"];

// Bottom-up display order (visual bottom → top)
const DISPLAY_ORDER: NivelKey[] = ["Atividade", "Produção", "Resultado", "Impacto"];

const NIVEL_STYLES: Record<NivelKey, { card: string; badge: string; arrow: string }> = {
  Impacto: {
    card: "bg-purple-50 border-purple-300",
    badge: "bg-purple-100 text-purple-800",
    arrow: "text-purple-400",
  },
  Resultado: {
    card: "bg-blue-50 border-blue-300",
    badge: "bg-blue-100 text-blue-800",
    arrow: "text-blue-400",
  },
  Produção: {
    card: "bg-green-50 border-green-300",
    badge: "bg-green-100 text-green-800",
    arrow: "text-green-400",
  },
  Atividade: {
    card: "bg-orange-50 border-orange-300",
    badge: "bg-orange-100 text-orange-800",
    arrow: "text-orange-400",
  },
};

const NIVEL_LABELS: Record<NivelKey, string> = {
  Impacto: "Impacto",
  Resultado: "Resultado",
  Produção: "Produção",
  Atividade: "Atividade",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressBar({ baseline, atual, meta }: { baseline: number; atual: number; meta: number }) {
  const range = (meta - baseline) || 1;
  const progress = Math.min(100, Math.max(0, Math.round(((atual - baseline) / range) * 100)));
  return (
    <div className="mt-1">
      <div className="flex justify-between text-xs text-gray-500 mb-0.5">
        <span>Baseline: {baseline}</span>
        <span>Atual: {atual}</span>
        <span>Meta: {meta}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-200">
        <div
          className={`h-1.5 rounded-full ${
            progress >= 100 ? "bg-green-500" : progress >= 50 ? "bg-blue-500" : "bg-orange-400"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-0.5 text-right">{progress}%</p>
    </div>
  );
}

function NivelBlock({
  nivel,
  items,
}: {
  nivel: NivelKey;
  items: LogframeItem[];
}) {
  const styles = NIVEL_STYLES[nivel];

  return (
    <div className={`rounded-lg border-2 p-4 ${styles.card}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${styles.badge}`}>
          {NIVEL_LABELS[nivel]}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-md p-4 text-center text-sm text-gray-400">
          Sem indicadores neste nível
          <div className="mt-2">
            <Link to="/impacto" className="text-blue-600 hover:underline text-xs">
              Adicionar indicador
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-md border border-gray-200 p-3 flex gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{item.resultado}</p>
                {item.indicador && (
                  <p className="text-xs text-gray-600 mt-0.5">{item.indicador}</p>
                )}
                {(item.meta > 0 || item.baseline > 0) && (
                  <ProgressBar
                    baseline={item.baseline ?? 0}
                    atual={item.valor_atual ?? 0}
                    meta={item.meta ?? 0}
                  />
                )}
              </div>
              {item.pressupostos && (
                <div className="flex-shrink-0 max-w-[200px] bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 text-xs text-amber-800">
                  <p className="font-semibold mb-0.5">Pressupostos:</p>
                  <p>{item.pressupostos}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TeoriaPage() {
  const { activeProject, activeProjectId } = useProjectContext();
  const [logframe, setLogframe] = useState<LogframeItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeProjectId) {
      setLogframe([]);
      return;
    }
    setLoading(true);
    apiGet<LogframeItem[]>(`/api/impact/logframe?projeto_id=${encodeURIComponent(activeProjectId)}`)
      .then(setLogframe)
      .catch(() => setLogframe([]))
      .finally(() => setLoading(false));
  }, [activeProjectId]);

  const byNivel = NIVEIS.reduce<Record<string, LogframeItem[]>>((acc, n) => {
    acc[n] = logframe.filter((i) => i.nivel === n);
    return acc;
  }, {});

  if (!activeProjectId) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
        <Header showBackButton />
        <div className="flex-1 min-h-0 overflow-auto p-6">
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            Seleciona um projeto ativo no topo para ver a Teoria da Mudança.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <Header showBackButton />

      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Teoria da Mudança</h1>
            <p className="text-gray-600 mt-1">{activeProject?.name}</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/impacto">+ Adicionar indicador</Link>
          </Button>
        </div>

        {/* Explanation card */}
        <Card className="p-5 mb-6 bg-slate-50 border-slate-200">
          <h2 className="font-semibold text-slate-800 mb-1">Como ler este diagrama</h2>
          <p className="text-sm text-slate-600">
            A Teoria da Mudança mostra a cadeia causal do projeto, da base para o topo.
            As <strong>Atividades</strong> produzem <strong>Produções</strong> (outputs), que geram
            <strong> Resultados</strong> (outcomes), que contribuem para o <strong>Impacto</strong> de longo prazo.
            Os pressupostos (caixas âmbar) são condições externas necessárias para que cada nível produza o nível seguinte.
          </p>
        </Card>

        {loading ? (
          <Card className="p-10 text-center text-gray-500">A carregar...</Card>
        ) : (
          <div className="flex flex-col gap-0">
            {DISPLAY_ORDER.map((nivel, idx) => {
              const isLast = idx === DISPLAY_ORDER.length - 1;
              return (
                <div key={nivel}>
                  <NivelBlock nivel={nivel} items={byNivel[nivel] ?? []} />
                  {!isLast && (
                    <div className="flex justify-center py-2">
                      <span className="text-2xl text-gray-400 select-none">↑</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Link back */}
        <div className="mt-6 text-center">
          <Button asChild variant="outline">
            <Link to="/impacto">Ver quadro lógico completo (LFA)</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
