import { Card } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import { Clock, User } from "lucide-react";
import { useState } from "react";
import { AddTaskDialog } from "../projects/AddTaskDialog";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { apiPatch, apiPost } from "../../lib/apiClient";

interface DbTask {
  id: number;
  projeto_id: number;
  nome: string;
  descricao?: string;
  responsavel?: string;
  data_fim?: string;
  prioridade?: string;
  estado?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  dueDate: Date | null;
  completed: boolean;
  priority: "high" | "medium" | "low";
}

const priorityConfig = {
  high: { label: "Alta", color: "destructive" as const },
  medium: { label: "Média", color: "default" as const },
  low: { label: "Baixa", color: "secondary" as const },
};

const DB_PRIORITY: Record<string, Task["priority"]> = {
  Urgente: "high",
  Alta: "high",
  Normal: "medium",
  Baixa: "low",
};


function fromDb(t: DbTask): Task {
  return {
    id: String(t.id),
    title: t.nome,
    description: t.descricao || "",
    assignee: t.responsavel || "",
    dueDate: t.data_fim ? new Date(t.data_fim) : null,
    completed: t.estado === "Concluída",
    priority: DB_PRIORITY[t.prioridade || "Normal"] || "medium",
  };
}

interface TarefasProps {
  projectId: string;
  initialTasks?: DbTask[];
}

export function Tarefas({ projectId, initialTasks = [] }: TarefasProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks.map(fromDb));

  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newStatus = task.completed ? "todo" : "done";
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
    try {
      await apiPatch<DbTask>(`/api/tasks/${id}`, { status: newStatus });
    } catch {
      // Reverter
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: task.completed } : t))
      );
      toast.error("Erro ao atualizar tarefa");
    }
  };

  const handleAddTask = async (taskData: {
    title: string;
    description: string;
    assignee: string;
    dueDate: string;
    priority: "high" | "medium" | "low";
    }) => {
    try {
      const raw = await apiPost<Partial<Task> & { id: number | string }>(`/api/projects/${projectId}/tasks`, {
        title: taskData.title,
        description: taskData.description,
        responsavel: taskData.assignee,
        dueDate: taskData.dueDate,
        priority: taskData.priority === "high" ? "high" : taskData.priority,
        status: "todo",
      });
      // raw comes back in Kanban format — map manually
      const newTask: Task = {
        id: String(raw.id),
        title: raw.title || taskData.title,
        description: raw.description || taskData.description,
        assignee: taskData.assignee,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
        completed: false,
        priority: taskData.priority,
      };
      setTasks((prev) => [...prev, newTask]);
      toast.success("Tarefa adicionada!");
    } catch {
      toast.error("Erro ao adicionar tarefa");
    }
  };

  const incompleteTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">
          Tarefas ({incompleteTasks.length} abertas)
        </h3>
        <AddTaskDialog onAddTask={handleAddTask} />
      </div>

      {tasks.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Nenhuma tarefa adicionada</p>
        </Card>
      ) : (
        <>
          {incompleteTasks.length > 0 && (
            <Card className="p-4">
              <ul className="space-y-3">
                {incompleteTasks.map((task) => {
                  const config = priorityConfig[task.priority];
                  return (
                    <li
                      key={task.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Checkbox
                        id={task.id}
                        checked={task.completed}
                        onCheckedChange={() => toggleTask(task.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <label
                            htmlFor={task.id}
                            className="font-medium text-gray-900 cursor-pointer"
                          >
                            {task.title}
                          </label>
                          <Badge variant={config.color}>{config.label}</Badge>
                        </div>
                        {task.description && (
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {task.assignee && (
                            <div className="flex items-center gap-1">
                              <User className="size-3" />
                              <span>{task.assignee}</span>
                            </div>
                          )}
                          {task.dueDate && (
                            <div className="flex items-center gap-1">
                              <Clock className="size-3" />
                              <span>
                                {formatDistanceToNow(task.dueDate, {
                                  addSuffix: true,
                                  locale: pt,
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {completedTasks.length > 0 && (
            <Card className="p-4 bg-gray-50">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Concluídas ({completedTasks.length})
              </h4>
              <ul className="space-y-2">
                {completedTasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-3 p-2 rounded-lg">
                    <Checkbox
                      id={task.id}
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(task.id)}
                    />
                    <label
                      htmlFor={task.id}
                      className="flex-1 cursor-pointer line-through text-gray-500"
                    >
                      {task.title}
                    </label>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
