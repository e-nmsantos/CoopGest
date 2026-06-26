import { useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, DragOverEvent, closestCorners } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";
import { SortableTaskCard } from "./SortableTaskCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";

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

interface KanbanBoardProps {
  tasks: Task[];
  onTaskMove: (taskId: string, newStatus: "todo" | "doing" | "done", impact?: string) => void;
  selectedTasks?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onTaskClick?: (id: string) => void;
}

export function KanbanBoard({ tasks, onTaskMove, selectedTasks, onToggleSelect, onTaskClick }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [showImpactDialog, setShowImpactDialog] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ taskId: string; newStatus: "todo" | "doing" | "done" } | null>(null);
  const [impact, setImpact] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const todoTasks = tasks.filter((t) => t.status === "todo");
  const doingTasks = tasks.filter((t) => t.status === "doing");
  const doneTasks = tasks.filter((t) => t.status === "done");

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      const overId = over.id as string;
      if (overId === "todo" || overId === "doing" || overId === "done") {
        setDragOverColumn(overId);
      } else {
        const task = tasks.find(t => t.id === overId);
        if (task) {
          setDragOverColumn(task.status);
        }
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDragOverColumn(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    let newStatus: "todo" | "doing" | "done";
    if (overId === "todo" || overId === "doing" || overId === "done") {
      newStatus = overId;
    } else {
      const targetTask = tasks.find(t => t.id === overId);
      if (!targetTask) return;
      newStatus = targetTask.status;
    }

    if (newStatus === "done") {
      setPendingMove({ taskId, newStatus });
      setShowImpactDialog(true);
    } else {
      onTaskMove(taskId, newStatus);
    }
  };

  const handleImpactSubmit = () => {
    if (pendingMove) {
      onTaskMove(pendingMove.taskId, pendingMove.newStatus, impact);
      setShowImpactDialog(false);
      setPendingMove(null);
      setImpact("");
    }
  };

  const activeTask = tasks.find((t) => t.id === activeId);

  const WIP_LIMIT = 5;

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        collisionDetection={closestCorners}
      >
        <div className="grid grid-cols-3 gap-6 h-full">
          <div id="todo">
            <KanbanColumn title="To Do" count={todoTasks.length} color="gray" isOver={dragOverColumn === "todo"}>
              <SortableContext items={todoTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                {todoTasks.map((task) => (
                  <SortableTaskCard
                    key={task.id}
                    task={task}
                    selected={selectedTasks?.has(task.id)}
                    onToggleSelect={onToggleSelect}
                    onTaskClick={onTaskClick}
                  />
                ))}
              </SortableContext>
            </KanbanColumn>
          </div>

          <div id="doing">
            <KanbanColumn title="Doing" count={doingTasks.length} wipLimit={WIP_LIMIT} color="blue" isOver={dragOverColumn === "doing"}>
              <SortableContext items={doingTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                {doingTasks.map((task) => (
                  <SortableTaskCard
                    key={task.id}
                    task={task}
                    selected={selectedTasks?.has(task.id)}
                    onToggleSelect={onToggleSelect}
                    onTaskClick={onTaskClick}
                  />
                ))}
              </SortableContext>
            </KanbanColumn>
          </div>

          <div id="done">
            <KanbanColumn title="Done" count={doneTasks.length} color="green" isOver={dragOverColumn === "done"}>
              <SortableContext items={doneTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                {doneTasks.map((task) => (
                  <SortableTaskCard
                    key={task.id}
                    task={task}
                    selected={selectedTasks?.has(task.id)}
                    onToggleSelect={onToggleSelect}
                    onTaskClick={onTaskClick}
                  />
                ))}
              </SortableContext>
            </KanbanColumn>
          </div>
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {/* Impact Dialog */}
      <Dialog open={showImpactDialog} onOpenChange={setShowImpactDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>✅ Registar Conclusão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Parabéns por concluir esta tarefa! Partilhe o impacto ou resultados alcançados com a equipa.
            </p>
            <div>
              <Label htmlFor="impact">Impacto / Resultado</Label>
              <Textarea
                id="impact"
                value={impact}
                onChange={(e) => setImpact(e.target.value)}
                placeholder="Ex: Conseguimos reduzir o tempo de processamento em 30%..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowImpactDialog(false)}>Cancelar</Button>
              <Button onClick={handleImpactSubmit}>Concluir Tarefa</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
