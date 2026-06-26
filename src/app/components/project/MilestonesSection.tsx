import { useState } from "react";
import { Card } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { AddMilestoneDialog } from "../projects/AddMilestoneDialog";
import { Calendar, CheckCircle2, Trash2 } from "lucide-react";
import { formatDistanceToNow, isPast } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { apiDelete, apiPatch, apiPost } from "../../lib/apiClient";

interface DbMilestone {
  id: number;
  projeto_id: number;
  nome: string;
  descricao?: string;
  data_prevista?: string;
  data_concluida?: string;
  estado?: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  completed: boolean;
}

function fromDb(m: DbMilestone): Milestone {
  return {
    id: String(m.id),
    title: m.nome,
    description: m.descricao || "",
    targetDate: m.data_prevista ? new Date(m.data_prevista) : new Date(),
    completed: m.estado === "Concluído",
  };
}

interface MilestonesSectionProps {
  projectId: string;
  initialMilestones?: DbMilestone[];
}

export function MilestonesSection({
  projectId,
  initialMilestones = [],
}: MilestonesSectionProps) {
  const [milestones, setMilestones] = useState<Milestone[]>(
    initialMilestones.map(fromDb)
  );

  const handleAddMilestone = async (data: {
    title: string;
    description: string;
    targetDate: string;
  }) => {
    try {
      const raw = await apiPost<DbMilestone>(`/api/projects/${projectId}/milestones`, {
        nome: data.title,
        descricao: data.description,
        data_prevista: data.targetDate,
      });
      setMilestones((prev) => [...prev, fromDb(raw)]);
      toast.success("Milestone adicionado!");
    } catch {
      toast.error("Erro ao adicionar milestone");
    }
  };

  const toggleMilestone = async (id: string) => {
    const ms = milestones.find((m) => m.id === id);
    if (!ms) return;
    const newEstado = ms.completed ? "Pendente" : "Concluído";
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, completed: !m.completed } : m))
    );
    try {
      await apiPatch<DbMilestone>(`/api/milestones/${id}`, { estado: newEstado });
    } catch {
      setMilestones((prev) =>
        prev.map((m) => (m.id === id ? { ...m, completed: ms.completed } : m))
      );
      toast.error("Erro ao atualizar milestone");
    }
  };

  const deleteMilestone = async (id: string) => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
    try {
      await apiDelete<null>(`/api/milestones/${id}`);
      toast.success("Milestone eliminado");
    } catch {
      toast.error("Erro ao eliminar milestone");
    }
  };

  const sortedMilestones = [...milestones].sort(
    (a, b) => a.targetDate.getTime() - b.targetDate.getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">
          Milestones ({milestones.filter((m) => !m.completed).length} pendentes)
        </h3>
        <AddMilestoneDialog onAddMilestone={handleAddMilestone} />
      </div>

      {milestones.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Nenhum milestone adicionado</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedMilestones.map((milestone) => {
            const isOverdue = !milestone.completed && isPast(milestone.targetDate);
            return (
              <Card
                key={milestone.id}
                className={`p-4 group ${
                  milestone.completed
                    ? "bg-green-50 border-green-200"
                    : isOverdue
                    ? "bg-red-50 border-red-200"
                    : "bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={milestone.id}
                    checked={milestone.completed}
                    onCheckedChange={() => toggleMilestone(milestone.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <label
                        htmlFor={milestone.id}
                        className={`font-medium cursor-pointer ${
                          milestone.completed
                            ? "line-through text-gray-500"
                            : "text-gray-900"
                        }`}
                      >
                        {milestone.title}
                      </label>
                      {milestone.completed && (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle2 className="size-3 mr-1" />
                          Concluído
                        </Badge>
                      )}
                      {isOverdue && (
                        <Badge variant="destructive">Atrasado</Badge>
                      )}
                    </div>
                    {milestone.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {milestone.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="size-3" />
                      <span>
                        {formatDistanceToNow(milestone.targetDate, {
                          addSuffix: true,
                          locale: pt,
                        })}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteMilestone(milestone.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
