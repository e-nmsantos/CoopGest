import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPost } from "../../lib/apiClient";

interface HourLog {
  id: number;
  tarefa_id: number;
  tarefa_nome: string;
  user_nome: string;
  horas: number;
  descricao: string;
  data_registo: string;
}

interface DbTask {
  id: number;
  nome: string;
}

interface HoursSectionProps {
  projectId: string;
  tasks: DbTask[];
}

export function HoursSection({ projectId, tasks }: HoursSectionProps) {
  const [logs, setLogs] = useState<HourLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    tarefa_id: "",
    horas: "",
    descricao: "",
    data_registo: new Date().toISOString().substring(0, 10),
  });

  useEffect(() => {
    apiGet<{ logs?: HourLog[] }>(`/api/projects/${projectId}/hours`)
      .then(data => setLogs(data.logs || []))
      .catch(() => toast.error("Erro ao carregar horas"))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleAdd = async () => {
    if (!form.tarefa_id || !form.horas) {
      toast.error("Selecione uma tarefa e insira as horas");
      return;
    }
    try {
      const created = await apiPost<HourLog>(`/api/tasks/${form.tarefa_id}/hours`, {
        horas: parseFloat(form.horas),
        descricao: form.descricao,
        data_registo: form.data_registo,
      });
      setLogs(prev => [created, ...prev]);
      setForm(f => ({ ...f, horas: "", descricao: "" }));
      toast.success("Horas registadas!");
    } catch {
      toast.error("Erro ao registar horas");
    }
  };

  const handleDelete = async (id: number) => {
    setLogs(prev => prev.filter(l => l.id !== id));
    try {
      await apiDelete<null>(`/api/hours/${id}`);
    } catch {
      toast.error("Erro ao eliminar registo");
    }
  };

  const totalHours = logs.reduce((s, l) => s + (l.horas || 0), 0);

  // Group by person
  const byPerson: Record<string, number> = {};
  logs.forEach(l => {
    byPerson[l.user_nome] = (byPerson[l.user_nome] || 0) + l.horas;
  });

  // Group by task
  const byTask: Record<string, { nome: string; horas: number }> = {};
  logs.forEach(l => {
    const key = String(l.tarefa_id);
    if (!byTask[key]) byTask[key] = { nome: l.tarefa_nome || `#${key}`, horas: 0 };
    byTask[key].horas += l.horas;
  });

  if (loading) {
    return <div className="text-center py-8 text-gray-400 text-sm">A carregar horas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Clock className="size-4 text-blue-500" />
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">{totalHours}h</div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Por pessoa</p>
          <div className="space-y-1">
            {Object.entries(byPerson).length === 0 && <p className="text-xs text-gray-400">—</p>}
            {Object.entries(byPerson).map(([nome, h]) => (
              <div key={nome} className="flex items-center justify-between text-xs">
                <span className="text-gray-700">{nome}</span>
                <span className="font-semibold text-gray-900">{h}h</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Por tarefa</p>
          <div className="space-y-1">
            {Object.entries(byTask).length === 0 && <p className="text-xs text-gray-400">—</p>}
            {Object.entries(byTask).slice(0, 5).map(([, t]) => (
              <div key={t.nome} className="flex items-center justify-between text-xs">
                <span className="text-gray-700 truncate flex-1 mr-2">{t.nome}</span>
                <span className="font-semibold text-gray-900 shrink-0">{t.horas}h</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Add form */}
      <Card className="p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Registar horas</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <Label className="text-xs text-gray-500">Tarefa *</Label>
            <select
              value={form.tarefa_id}
              onChange={e => setForm(f => ({ ...f, tarefa_id: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white mt-1"
            >
              <option value="">Selecionar tarefa...</option>
              {tasks.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Horas *</Label>
            <Input
              type="number" step="0.5" min="0.5"
              placeholder="Ex: 2.5"
              value={form.horas}
              onChange={e => setForm(f => ({ ...f, horas: e.target.value }))}
              className="text-sm mt-1"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <Label className="text-xs text-gray-500">Data</Label>
            <Input
              type="date"
              value={form.data_registo}
              onChange={e => setForm(f => ({ ...f, data_registo: e.target.value }))}
              className="text-sm mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Descrição</Label>
            <Input
              placeholder="Trabalho realizado..."
              value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              className="text-sm mt-1"
            />
          </div>
        </div>
        <Button size="sm" onClick={handleAdd}>Registar</Button>
      </Card>

      {/* Log table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold text-gray-900">Histórico de horas ({logs.length})</h3>
        </div>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Sem registos de horas</p>
        ) : (
          <div className="divide-y">
            {logs.map(l => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-3 group hover:bg-gray-50">
                <span className="font-semibold text-blue-600 w-12 shrink-0">{l.horas}h</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{l.tarefa_nome || `Tarefa #${l.tarefa_id}`}</p>
                  {l.descricao && <p className="text-xs text-gray-500 truncate">{l.descricao}</p>}
                </div>
                <div className="text-xs text-gray-400 shrink-0 text-right">
                  <p>{l.user_nome}</p>
                  <p>{l.data_registo}</p>
                </div>
                <Button
                  variant="ghost" size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 shrink-0"
                  onClick={() => handleDelete(l.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
