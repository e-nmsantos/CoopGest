import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Plus } from "lucide-react";
import { Checkbox } from "../ui/checkbox";

interface AddTaskToKanbanDialogProps {
  onAddTask: (task: {
    title: string;
    description: string;
    priority: "urgent" | "high" | "medium" | "low";
    tags: string[];
    needsHelp: boolean;
    budget?: number;
    dueDate: string;
    responsavel: string;
  }) => void;
}

export function AddTaskToKanbanDialog({ onAddTask }: AddTaskToKanbanDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as "urgent" | "high" | "medium" | "low",
    tags: "",
    needsHelp: false,
    budget: "",
    dueDate: "",
    responsavel: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddTask({
      ...formData,
      tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean),
      budget: formData.budget ? parseFloat(formData.budget) : undefined,
    });
    setFormData({
      title: "",
      description: "",
      priority: "medium",
      tags: "",
      needsHelp: false,
      budget: "",
      dueDate: "",
      responsavel: "",
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4 mr-2" />
          Nova Tarefa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar Tarefa ao Kanban</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Preparar relatório mensal"
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalhes da tarefa..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: "urgent" | "high" | "medium" | "low") =>
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">🔴 Urgente</SelectItem>
                  <SelectItem value="high">🟠 Alta</SelectItem>
                  <SelectItem value="medium">🟡 Média</SelectItem>
                  <SelectItem value="low">🔵 Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dueDate">Prazo *</Label>
              <Input
                id="dueDate"
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="responsavel">Responsável</Label>
              <Input
                id="responsavel"
                value={formData.responsavel}
                onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                placeholder="Nome do responsável"
              />
            </div>

            <div>
              <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="Ex: Urgente, Relatório"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="needsHelp"
              checked={formData.needsHelp}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, needsHelp: checked as boolean })
              }
            />
            <Label htmlFor="needsHelp" className="cursor-pointer">
              Esta tarefa precisa de ajuda da equipa
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Adicionar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
