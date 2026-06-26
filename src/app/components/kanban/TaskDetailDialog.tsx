import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Plus, Trash2, X, Clock, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../lib/apiClient";

interface Subtask {
  id: number;
  nome: string;
  concluida: number;
}

interface TaskComment {
  id: number;
  user_nome: string;
  texto: string;
  criado_em: string;
}

interface HourLog {
  id: number;
  user_nome: string;
  horas: number;
  descricao: string;
  data_registo: string;
}

interface ProjectTask {
  id: string;
  title: string;
}

interface TaskData {
  recorrencia?: string | null;
}

interface TaskDetailDialogProps {
  taskId: string | null;
  taskTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectTasks?: ProjectTask[];
}

export function TaskDetailDialog({ taskId, taskTitle, open, onOpenChange, projectTasks = [] }: TaskDetailDialogProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [hours, setHours] = useState<HourLog[]>([]);
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [recorrencia, setRecorrencia] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [newSubtask, setNewSubtask] = useState("");
  const [newComment, setNewComment] = useState("");
  const [hoursForm, setHoursForm] = useState({
    horas: "",
    descricao: "",
    data_registo: new Date().toISOString().substring(0, 10),
  });
  const [newDep, setNewDep] = useState("");

  useEffect(() => {
    if (!open || !taskId) return;
    setLoading(true);
    Promise.all([
      apiGet<Subtask[]>(`/api/tasks/${taskId}/subtasks`).catch(() => []),
      apiGet<TaskComment[]>(`/api/tasks/${taskId}/comments`).catch(() => []),
      apiGet<{ logs?: HourLog[] } | HourLog[]>(`/api/tasks/${taskId}/hours`).catch(() => ({ logs: [] })),
      apiGet<Array<{ depende_de: number }>>(`/api/tasks/${taskId}/dependencies`).catch(() => []),
      apiGet<TaskData>(`/api/tasks/${taskId}`).catch(() => ({})),
    ]).then(([subs, cmts, hrs, deps, taskData]: [unknown, unknown, { logs?: HourLog[] } | HourLog[], unknown, TaskData]) => {
      setSubtasks(Array.isArray(subs) ? subs : []);
      setComments(Array.isArray(cmts) ? cmts : []);
      const hrsArr = Array.isArray(hrs) ? hrs : (hrs.logs || []);
      setHours(hrsArr);
      setDependencies((Array.isArray(deps) ? deps : []).map((d: { depende_de: number }) => String(d.depende_de)));
      setRecorrencia(taskData?.recorrencia || "");
    }).catch(() => toast.error("Erro ao carregar detalhes da tarefa"))
      .finally(() => setLoading(false));
  }, [open, taskId]);

  const handleAddSubtask = async () => {
    if (!newSubtask.trim() || !taskId) return;
    try {
      const created = await apiPost<Subtask>(`/api/tasks/${taskId}/subtasks`, { nome: newSubtask.trim() });
      setSubtasks(prev => [...prev, created]);
      setNewSubtask("");
    } catch {
      toast.error("Erro ao adicionar subtarefa");
    }
  };

  const handleToggleSubtask = async (subtask: Subtask) => {
    const newVal = subtask.concluida ? 0 : 1;
    setSubtasks(prev => prev.map(s => s.id === subtask.id ? { ...s, concluida: newVal } : s));
    try {
      await apiPatch<Subtask>(`/api/subtasks/${subtask.id}`, { concluida: newVal });
    } catch {
      toast.error("Erro ao atualizar subtarefa");
    }
  };

  const handleDeleteSubtask = async (id: number) => {
    setSubtasks(prev => prev.filter(s => s.id !== id));
    try {
      await apiDelete<null>(`/api/subtasks/${id}`);
    } catch {
      toast.error("Erro ao eliminar subtarefa");
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !taskId) return;
    try {
      const created = await apiPost<TaskComment>(`/api/tasks/${taskId}/comments`, { texto: newComment.trim() });
      setComments(prev => [...prev, created]);
      setNewComment("");
    } catch {
      toast.error("Erro ao adicionar comentário");
    }
  };

  const handleAddHours = async () => {
    if (!hoursForm.horas || !taskId) return;
    try {
      const created = await apiPost<HourLog>(`/api/tasks/${taskId}/hours`, {
        horas: parseFloat(hoursForm.horas),
        descricao: hoursForm.descricao,
        data_registo: hoursForm.data_registo,
      });
      setHours(prev => [...prev, created]);
      setHoursForm(f => ({ ...f, horas: "", descricao: "" }));
      toast.success("Horas registadas!");
    } catch {
      toast.error("Erro ao registar horas");
    }
  };

  const handleDeleteHours = async (id: number) => {
    setHours(prev => prev.filter(h => h.id !== id));
    try {
      await apiDelete<null>(`/api/hours/${id}`);
    } catch {
      toast.error("Erro ao eliminar registo");
    }
  };

  const handleAddDep = async () => {
    if (!newDep || !taskId) return;
    try {
      await apiPost<unknown>(`/api/tasks/${taskId}/dependencies`, { depende_de: parseInt(newDep) });
      setDependencies(prev => [...prev, newDep]);
      setNewDep("");
    } catch {
      toast.error("Erro ao adicionar dependência (verifique ciclos)");
    }
  };

  const handleRemoveDep = async (depId: string) => {
    setDependencies(prev => prev.filter(d => d !== depId));
    try {
      await apiDelete<null>(`/api/tasks/${taskId}/dependencies/${depId}`);
    } catch {
      toast.error("Erro ao remover dependência");
    }
  };

  const completedSubtasks = subtasks.filter(s => s.concluida).length;
  const totalHours = hours.reduce((s, h) => s + (h.horas || 0), 0);
  const availableDeps = projectTasks.filter(t => t.id !== taskId && !dependencies.includes(t.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="pr-8 text-base">{taskTitle || "Detalhes da Tarefa"}</DialogTitle>
        </DialogHeader>

        {/* Recorrência */}
        {!loading && (
          <div className="flex items-center gap-2 pb-3 border-b">
            <RefreshCw className="size-3.5 text-gray-400 shrink-0" />
            <span className="text-xs text-gray-500">Recorrência:</span>
            <select
              value={recorrencia}
              onChange={async (e) => {
                const val = e.target.value;
                setRecorrencia(val);
                try {
                  await apiPatch<TaskData>(`/api/tasks/${taskId}`, { recorrencia: val || null });
                  toast.success(val ? `Recorrência: ${val}` : "Recorrência removida");
                } catch {
                  toast.error("Erro ao definir recorrência");
                }
              }}
              className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700"
            >
              <option value="">Nenhuma</option>
              <option value="diária">Diária</option>
              <option value="semanal">Semanal</option>
              <option value="mensal">Mensal</option>
              <option value="trimestral">Trimestral</option>
            </select>
            {recorrencia && (
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                Ao concluir, cria nova tarefa automaticamente
              </span>
            )}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-sm text-gray-400">A carregar...</div>
        ) : (
          <Tabs defaultValue="subtasks">
            <TabsList className="grid grid-cols-4 text-xs">
              <TabsTrigger value="subtasks">
                ✅ Subtarefas{subtasks.length > 0 ? ` (${completedSubtasks}/${subtasks.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="comments">
                💬 Comentários{comments.length > 0 ? ` (${comments.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="hours">
                ⏱ Horas{totalHours > 0 ? ` (${totalHours}h)` : ""}
              </TabsTrigger>
              <TabsTrigger value="deps">
                🔗 Depende de{dependencies.length > 0 ? ` (${dependencies.length})` : ""}
              </TabsTrigger>
            </TabsList>

            {/* SUBTASKS */}
            <TabsContent value="subtasks" className="mt-4 space-y-3">
              {subtasks.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>{completedSubtasks} de {subtasks.length} concluídas</span>
                    <span>{Math.round((completedSubtasks / subtasks.length) * 100)}%</span>
                  </div>
                  <Progress value={(completedSubtasks / subtasks.length) * 100} className="h-1.5" />
                </div>
              )}
              <div className="space-y-1 max-h-48 overflow-auto">
                {subtasks.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Sem subtarefas. Adicione abaixo.</p>
                )}
                {subtasks.map(s => (
                  <div key={s.id} className="flex items-center gap-2 group py-1.5 px-2 rounded hover:bg-gray-50">
                    <Checkbox
                      checked={!!s.concluida}
                      onCheckedChange={() => handleToggleSubtask(s)}
                    />
                    <span className={`flex-1 text-sm ${s.concluida ? "line-through text-gray-400" : "text-gray-700"}`}>
                      {s.nome}
                    </span>
                    <Button
                      variant="ghost" size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"
                      onClick={() => handleDeleteSubtask(s.id)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Input
                  placeholder="Nova subtarefa... (Enter para adicionar)"
                  value={newSubtask}
                  onChange={e => setNewSubtask(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddSubtask()}
                  className="text-sm"
                />
                <Button size="sm" onClick={handleAddSubtask}>
                  <Plus className="size-3.5" />
                </Button>
              </div>
            </TabsContent>

            {/* COMMENTS */}
            <TabsContent value="comments" className="mt-4 space-y-3">
              <div className="space-y-3 max-h-64 overflow-auto">
                {comments.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Sem comentários nesta tarefa</p>
                )}
                {comments.map(c => (
                  <div key={c.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700">{c.user_nome}</span>
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(c.criado_em), { addSuffix: true, locale: pt })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{c.texto}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Textarea
                  placeholder="Adicionar comentário..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  rows={2}
                  className="text-sm flex-1"
                />
                <Button size="sm" className="self-end" onClick={handleAddComment}>
                  <Plus className="size-3.5" />
                </Button>
              </div>
            </TabsContent>

            {/* HOURS */}
            <TabsContent value="hours" className="mt-4 space-y-4">
              {totalHours > 0 && (
                <div className="flex items-center gap-2 text-sm font-medium text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
                  <Clock className="size-4" />
                  Total: {totalHours}h registadas
                </div>
              )}
              <div className="space-y-2 max-h-48 overflow-auto">
                {hours.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-3">Sem horas registadas</p>
                )}
                {hours.map(h => (
                  <div key={h.id} className="flex items-center gap-3 text-sm group bg-gray-50 rounded-lg px-3 py-2">
                    <span className="font-semibold text-blue-600 w-10 shrink-0">{h.horas}h</span>
                    <span className="text-gray-600 flex-1">{h.descricao || "—"}</span>
                    <span className="text-gray-400 text-xs shrink-0">{h.user_nome} · {h.data_registo}</span>
                    <Button
                      variant="ghost" size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"
                      onClick={() => handleDeleteHours(h.id)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs text-gray-500">Registar horas</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number" step="0.5" min="0.5"
                    placeholder="Horas"
                    value={hoursForm.horas}
                    onChange={e => setHoursForm(f => ({ ...f, horas: e.target.value }))}
                    className="text-sm"
                  />
                  <Input
                    type="date"
                    value={hoursForm.data_registo}
                    onChange={e => setHoursForm(f => ({ ...f, data_registo: e.target.value }))}
                    className="text-sm"
                  />
                  <Button size="sm" onClick={handleAddHours} disabled={!hoursForm.horas}>
                    Registar
                  </Button>
                </div>
                <Input
                  placeholder="Descrição do trabalho realizado..."
                  value={hoursForm.descricao}
                  onChange={e => setHoursForm(f => ({ ...f, descricao: e.target.value }))}
                  className="text-sm"
                />
              </div>
            </TabsContent>

            {/* DEPENDENCIES */}
            <TabsContent value="deps" className="mt-4 space-y-3">
              <p className="text-xs text-gray-500">
                Esta tarefa só deve começar após as seguintes tarefas estarem concluídas:
              </p>
              <div className="flex flex-wrap gap-2 min-h-8">
                {dependencies.length === 0 && (
                  <span className="text-sm text-gray-400">Sem dependências definidas</span>
                )}
                {dependencies.map(depId => {
                  const depTask = projectTasks.find(t => t.id === depId);
                  return (
                    <Badge key={depId} variant="secondary" className="gap-1 pr-1">
                      {depTask ? depTask.title : `Tarefa #${depId}`}
                      <button
                        onClick={() => handleRemoveDep(depId)}
                        className="ml-1 hover:text-red-600 text-gray-400 transition-colors"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
              {availableDeps.length > 0 && (
                <div className="flex gap-2 pt-2 border-t">
                  <select
                    value={newDep}
                    onChange={e => setNewDep(e.target.value)}
                    className="flex-1 text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white"
                  >
                    <option value="">Selecionar tarefa pré-requisito...</option>
                    {availableDeps.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                  <Button size="sm" onClick={handleAddDep} disabled={!newDep}>
                    <Plus className="size-3.5" />
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
