import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import { useNavigate } from "react-router";
import { AlertCircle, CalendarClock, CheckCircle2, Circle, Clock, FolderOpen, ListChecks, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Header } from "../components/layout/Header";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { apiGet, apiPatch } from "../lib/apiClient";

interface WorkTask {
  id: number;
  nome: string;
  descricao?: string;
  responsavel?: string;
  estado: string;
  prioridade?: string;
  data_fim?: string;
  projeto_id: number;
  projeto_nome: string;
  bucket: WorkBucket;
  dias_ate_prazo?: number | null;
  assigned_to_me: boolean;
  needs_assignment: boolean;
  can_edit: boolean;
}

type WorkBucket = "atrasadas" | "hoje" | "proximos_7_dias" | "futuras" | "sem_data" | "concluidas";
type FilterKey = "abertas" | WorkBucket | "por_atribuir";

interface WorkSummary {
  total: number;
  abertas: number;
  atrasadas: number;
  hoje: number;
  proximos_7_dias: number;
  sem_data: number;
  por_atribuir: number;
}

const bucketLabels: Record<WorkBucket, string> = {
  atrasadas: "Atrasadas",
  hoje: "Hoje",
  proximos_7_dias: "Proximos 7 dias",
  futuras: "Futuras",
  sem_data: "Sem data",
  concluidas: "Concluidas",
};

const priorityStyles: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
};

function dueLabel(task: WorkTask) {
  if (!task.data_fim) return "Sem prazo";
  if (task.bucket === "atrasadas") return `${Math.abs(task.dias_ate_prazo ?? 0)} dia(s) em atraso`;
  if (task.bucket === "hoje") return "Termina hoje";
  if (task.dias_ate_prazo === 1) return "Termina amanha";
  if ((task.dias_ate_prazo ?? 99) > 1) return `Daqui a ${task.dias_ate_prazo} dias`;
  return task.data_fim;
}

function isDone(task: WorkTask) {
  return (task.estado || "").toLowerCase().startsWith("conclu");
}

export function MyWorkPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [summary, setSummary] = useState<WorkSummary>({
    total: 0,
    abertas: 0,
    atrasadas: 0,
    hoje: 0,
    proximos_7_dias: 0,
    sem_data: 0,
    por_atribuir: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("abertas");
  const [savingId, setSavingId] = useState<number | null>(null);

  const loadWork = () => {
    setLoading(true);
    apiGet<{ tasks?: WorkTask[]; summary?: WorkSummary }>("/api/my-work")
      .then((data) => {
        setTasks(data.tasks || []);
        setSummary(data.summary || summary);
      })
      .catch(() => toast.error("Erro ao carregar o meu trabalho"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadWork();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filter === "abertas") return task.bucket !== "concluidas";
      if (filter === "por_atribuir") return task.needs_assignment;
      return task.bucket === filter;
    });
  }, [filter, tasks]);

  const groupedTasks = useMemo(() => {
    const order: WorkBucket[] = ["atrasadas", "hoje", "proximos_7_dias", "futuras", "sem_data", "concluidas"];
    return order
      .map((bucket) => ({ bucket, tasks: filteredTasks.filter((task) => task.bucket === bucket) }))
      .filter((group) => group.tasks.length > 0);
  }, [filteredTasks]);

  const updateStatus = async (task: WorkTask) => {
    if (!task.can_edit) {
      toast.error("Sem permissao para alterar esta tarefa");
      return;
    }
    const nextState = isDone(task) ? "Em curso" : "Concluída";
    setSavingId(task.id);
    try {
      await apiPatch<WorkTask>(`/api/tasks/${task.id}`, { estado: nextState });
      toast.success(isDone(task) ? "Tarefa reaberta" : "Tarefa concluida");
      loadWork();
    } catch {
      toast.error("Erro ao atualizar tarefa");
    } finally {
      setSavingId(null);
    }
  };

  const filterItems: Array<{ key: FilterKey; label: string; value: number; icon: ElementType }> = [
    { key: "abertas", label: "Abertas", value: summary.abertas, icon: ListChecks },
    { key: "atrasadas", label: "Atrasadas", value: summary.atrasadas, icon: AlertCircle },
    { key: "hoje", label: "Hoje", value: summary.hoje, icon: Clock },
    { key: "proximos_7_dias", label: "7 dias", value: summary.proximos_7_dias, icon: CalendarClock },
    { key: "sem_data", label: "Sem data", value: summary.sem_data, icon: Circle },
    { key: "por_atribuir", label: "Por atribuir", value: summary.por_atribuir, icon: UserPlus },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 min-h-0 overflow-auto p-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">O Meu Trabalho</h1>
            <p className="text-gray-600 mt-1">Prioridades pessoais, tarefas atribuidas e trabalho por planear.</p>
          </div>
          <Button variant="outline" onClick={loadWork} disabled={loading}>
            Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
          {filterItems.map((item) => {
            const Icon = item.icon;
            const active = filter === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setFilter(item.key)}
                className={`text-left rounded-md border p-4 transition-colors ${
                  active ? "border-slate-800 bg-white shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <Icon className={`size-4 ${item.key === "atrasadas" ? "text-red-500" : "text-slate-500"}`} />
                  <span className="text-2xl font-semibold text-gray-900">{item.value}</span>
                </div>
                <p className="mt-2 text-sm font-medium text-gray-700">{item.label}</p>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">A carregar trabalho...</div>
        ) : filteredTasks.length === 0 ? (
          <Card className="p-12 text-center">
            <CheckCircle2 className="size-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">Nada urgente nesta vista</p>
            <p className="text-sm text-gray-500 mt-1">Mude o filtro ou avance para o planeamento dos projetos.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {groupedTasks.map((group) => (
              <section key={group.bucket}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    {bucketLabels[group.bucket]}
                  </h2>
                  <span className="text-xs text-gray-400">{group.tasks.length} tarefa(s)</span>
                </div>
                <div className="space-y-3">
                  {group.tasks.map((task) => {
                    const done = isDone(task);
                    return (
                      <Card key={task.id} className="p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge className={priorityStyles[task.prioridade || ""] || "bg-gray-100 text-gray-600 border-gray-200"}>
                                {task.prioridade || "normal"}
                              </Badge>
                              {task.needs_assignment && (
                                <Badge className="bg-purple-100 text-purple-700 border-purple-200">Por atribuir</Badge>
                              )}
                              <span className={`text-xs font-medium ${task.bucket === "atrasadas" ? "text-red-600" : "text-gray-500"}`}>
                                {dueLabel(task)}
                              </span>
                            </div>
                            <button
                              onClick={() => navigate(`/projeto/${task.projeto_id}`)}
                              className="text-left font-semibold text-gray-900 hover:text-blue-700"
                            >
                              {task.nome}
                            </button>
                            {task.descricao && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.descricao}</p>}
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                              <span className="inline-flex items-center gap-1">
                                <FolderOpen className="size-3.5" />
                                {task.projeto_nome}
                              </span>
                              <span>Responsavel: {task.responsavel || "por definir"}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button variant="outline" size="sm" onClick={() => navigate(`/projeto/${task.projeto_id}`)}>
                              Abrir projeto
                            </Button>
                            <Button size="sm" onClick={() => updateStatus(task)} disabled={!task.can_edit || savingId === task.id}>
                              {done ? "Reabrir" : "Concluir"}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
