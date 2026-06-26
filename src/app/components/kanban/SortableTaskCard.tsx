import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskCard } from "./TaskCard";

interface SortableTaskCardProps {
  task: {
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
    status?: "todo" | "doing" | "done";
    responsavel?: string;
  };
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onTaskClick?: (id: string) => void;
}

export function SortableTaskCard({ task, selected, onToggleSelect, onTaskClick }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        isDragging={isDragging}
        selected={selected}
        onToggleSelect={onToggleSelect}
        onTaskClick={onTaskClick}
      />
    </div>
  );
}
