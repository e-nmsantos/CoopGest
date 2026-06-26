import { useState, useEffect } from "react";
import { useParams } from "react-router";
import { Header } from "../components/layout/Header";
import { KanbanBoard } from "../components/kanban/KanbanBoard";
import { AddTaskToKanbanDialog } from "../components/kanban/AddTaskToKanbanDialog";
import { TaskDetailDialog } from "../components/kanban/TaskDetailDialog";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { useProjectContext } from "../contexts/ProjectContext";
import { useProjectEvents } from "../hooks/useProjectEvents";
import { apiDelete, apiGet, apiPatch, apiPost } from "../lib/apiClient";

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: "urgent" | "high" | "medium" | "low";
  tags: string[];
  collaborators: Array<{ id: string; name: string; initials: string; color: string }>;
  needsHelp?: boolean;
  budget?: number;
  progress?: number;
  subtasks?: { total: number; completed: number };
  dueDate?: Date;
  comments?: number;
  status: "todo" | "doing" | "done";
  responsavel?: string;
}

function parseTask(raw: Record<string, unknown>): Task {
  return {
    id: String(raw.id),
    title: String(raw.title || ""),
    description: raw.description ? String(raw.description) : undefined,
    priority: (raw.priority as Task["priority"]) || "medium",
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    collaborators: Array.isArray(raw.collaborators)
      ? (raw.collaborators as Task["collaborators"])
      : [],
    dueDate: raw.dueDate ? new Date(String(raw.dueDate)) : undefined,
    status: (raw.status as Task["status"]) || "todo",
    responsavel: raw.responsavel ? String(raw.responsavel) : undefined,
    needsHelp: Boolean(raw.needsHelp),
    budget: raw.budget ? Number(raw.budget) : undefined,
    subtasks: raw.subtasks as Task["subtasks"] | undefined,
    comments: raw.comments ? Number(raw.comments) : undefined,
  };
}

export function KanbanPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = id ?? "";
  const { tasks: allTasks, isConnected, refetchTasks } = useProjectEvents(projectId);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState("Kanban");
  const { setActiveProjectId } = useProjectContext();
  
  // Filters
  const [filterResponsavel, setFilterResponsavel] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterTag, setFilterTag] = useState("");

  // Bulk select
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  // Task detail dialog
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleTaskClick = (taskId: string) => {
    setDetailTaskId(taskId);
    setDetailOpen(true);
  };

  useEffect(() => {
    if (projectId) {
      setActiveProjectId(projectId);
      const loadProjectName = async () => {
        try {
            const proj = await apiGet<{ projeto?: { nome?: string } }>(`/api/projects/${projectId}`);
            setProjectName(proj.projeto?.nome ? `${proj.projeto.nome} - Kanban` : "Kanban");
        } catch {
          toast.error("Erro ao carregar o nome do projeto");
        } finally {
            setLoading(false);
        }
      };
      loadProjectName();
    }
  }, [projectId, setActiveProjectId]);

  if (!projectId) {
    return <div>Project ID not found</div>;
  }

  const tasks = allTasks.map(parseTask);

  // Derived filter options
  const uniqueResponsaveis = [...new Set(tasks.map(t => t.responsavel).filter(Boolean))] as string[];
  const uniqueTags = [...new Set(tasks.flatMap(t => t.tags))];

  // Filtered tasks
  const filteredTasks = tasks.filter(t => {
    if (filterResponsavel && t.responsavel !== filterResponsavel) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterTag && !t.tags.includes(filterTag)) return false;
    return true;
  });

  const hasFilter = !!(filterResponsavel || filterPriority || filterTag);

  const handleToggleSelect = (taskId: string) => {
    setSelectedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleBulkMove = async (newStatus: "todo" | "doing" | "done") => {
    const ids = [...selectedTasks];
    setSelectedTasks(new Set());
    try {
      await Promise.all(ids.map(id => apiPatch<Task>(`/api/tasks/${id}`, { status: newStatus })));
      toast.success(`${ids.length} tarefa${ids.length !== 1 ? "s" : ""} movida${ids.length !== 1 ? "s" : ""}!`);
    } catch {
      toast.error("Erro ao mover tarefas");
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedTasks];
    if (!confirm(`Eliminar ${ids.length} tarefa${ids.length !== 1 ? "s" : ""}?`)) return;
    setSelectedTasks(new Set());
    try {
      await Promise.all(ids.map(id => apiDelete<null>(`/api/tasks/${id}`)));
      toast.success(`${ids.length} tarefa${ids.length !== 1 ? "s" : ""} eliminada${ids.length !== 1 ? "s" : ""}`);
    } catch {
      toast.error("Erro ao eliminar tarefas");
    }
  };

  const handleTaskMove = async (taskId: string, newStatus: "todo" | "doing" | "done", impact?: string) => {
    try {
      await apiPatch<Task>(`/api/tasks/${taskId}`, { status: newStatus });
      if (newStatus === "done" && impact) {
        toast.success("Tarefa concluída!", { description: `Impacto: ${impact}` });
      } else {
        toast.success("Tarefa movida com sucesso!");
      }
    } catch {
      toast.error("Erro ao guardar alteração");
    }
  };

  const handleAddTask = async (taskData: {
    title: string;
    description: string;
    priority: "urgent" | "high" | "medium" | "low";
    tags: string[];
    needsHelp: boolean;
    budget?: number;
    dueDate: string;
    responsavel: string;
  }) => {
    try {
      await apiPost<Task>(`/api/projects/${id}/tasks`, {
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        dueDate: taskData.dueDate,
        tags: taskData.tags,
        responsavel: taskData.responsavel,
        status: "todo",
      });
      toast.success("Tarefa adicionada com sucesso!");
    } catch {
      toast.error("Erro ao adicionar tarefa");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">A carregar tarefas...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <Header projectName={projectName} showBackButton />

      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Quadro Kanban</h2>
            <p className="text-sm text-gray-600 mt-1">
              Arraste as tarefas para gerir o fluxo de trabalho cooperativo
            </p>
          </div>
          <AddTaskToKanbanDialog onAddTask={handleAddTask} />
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap mb-4 bg-white border border-gray-200 rounded-lg px-4 py-2.5">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filtrar</span>

          <select
            value={filterResponsavel}
            onChange={(e) => setFilterResponsavel(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white"
          >
            <option value="">Todos os responsáveis</option>
            {uniqueResponsaveis.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white"
          >
            <option value="">Todas as prioridades</option>
            <option value="urgent">🔴 Urgente</option>
            <option value="high">🟠 Alta</option>
            <option value="medium">🟡 Média</option>
            <option value="low">🔵 Baixa</option>
          </select>

          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white"
          >
            <option value="">Todas as tags</option>
            {uniqueTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
          </select>

          {hasFilter && (
            <button
              onClick={() => { setFilterResponsavel(""); setFilterPriority(""); setFilterTag(""); }}
              className="text-xs text-blue-600 hover:underline ml-auto"
            >
              Limpar filtros
            </button>
          )}

          {hasFilter && (
            <span className="text-xs text-gray-400">
              {filteredTasks.length} de {tasks.length} tarefas
            </span>
          )}
        </div>

        <div className="h-[calc(100vh-290px)]">
          <KanbanBoard
            tasks={filteredTasks}
            onTaskMove={handleTaskMove}
            selectedTasks={selectedTasks}
            onToggleSelect={handleToggleSelect}
            onTaskClick={handleTaskClick}
          />
        </div>
      </div>

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        taskId={detailTaskId}
        taskTitle={tasks.find(t => t.id === detailTaskId)?.title}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        projectTasks={tasks.map(t => ({ id: t.id, title: t.title }))}
      />

      {/* Bulk action floating bar */}
      {selectedTasks.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3 flex items-center gap-3 z-50">
          <span className="text-sm text-gray-600 font-medium">
            {selectedTasks.size} selecionada{selectedTasks.size !== 1 ? "s" : ""}
          </span>
          <div className="h-4 border-l border-gray-200" />
          <span className="text-xs text-gray-500">Mover para:</span>
          <Button size="sm" variant="outline" onClick={() => handleBulkMove("todo")}>To Do</Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkMove("doing")}>Em Curso</Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkMove("done")}>Concluído</Button>
          <div className="h-4 border-l border-gray-200" />
          <Button size="sm" variant="destructive" onClick={handleBulkDelete}>Eliminar</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedTasks(new Set())}>Cancelar</Button>
        </div>
      )}
    </div>
  );
}
