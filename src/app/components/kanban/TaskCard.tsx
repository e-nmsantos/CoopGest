import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { HandHelping, Euro, Calendar, MessageSquare, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

interface Collaborator {
  id: string;
  name: string;
  initials: string;
  color: string;
}

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description?: string;
    priority: "urgent" | "high" | "medium" | "low";
    tags: string[];
    collaborators: Collaborator[];
    needsHelp?: boolean;
    budget?: number;
    progress?: number;
    subtasks?: { total: number; completed: number };
    dueDate?: Date;
    comments?: number;
    status?: "todo" | "doing" | "done";
    responsavel?: string;
  };
  isDragging?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onTaskClick?: (id: string) => void;
}

const priorityColors = {
  urgent: "border-l-4 border-l-red-600 bg-red-50/30",
  high: "border-l-4 border-l-orange-500 bg-orange-50/30",
  medium: "border-l-4 border-l-yellow-500 bg-yellow-50/30",
  low: "border-l-4 border-l-blue-500 bg-blue-50/30",
};

const tagColors = [
  "bg-purple-100 text-purple-700",
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-pink-100 text-pink-700",
  "bg-indigo-100 text-indigo-700",
];

export function TaskCard({ task, isDragging, selected, onToggleSelect, onTaskClick }: TaskCardProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = !!(task.dueDate && task.dueDate < today && task.status !== "done");

  const cardClass = isOverdue
    ? "border-l-4 border-l-red-500 bg-red-50/20"
    : priorityColors[task.priority];

  return (
    <Card
      className={`p-4 cursor-grab active:cursor-grabbing transition-all hover:shadow-md group ${cardClass} ${isDragging ? "opacity-50 rotate-2" : ""} ${selected ? "ring-2 ring-blue-400" : ""}`}
    >
      {/* Header */}
      <div className="flex items-start gap-2 mb-2">
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={selected || false}
            onChange={() => onToggleSelect(task.id)}
            onPointerDown={(e) => e.stopPropagation()}
            className={`mt-0.5 shrink-0 cursor-pointer transition-opacity ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          />
        )}
        <h4
          className={`font-semibold text-gray-900 text-sm leading-tight flex-1 line-clamp-2 ${onTaskClick ? "cursor-pointer hover:text-blue-600" : ""}`}
          onClick={() => onTaskClick?.(task.id)}
        >
          {task.title}
        </h4>
        <div className="flex items-center gap-1 shrink-0">
          {isOverdue && (
            <AlertCircle className="size-4 text-red-500" aria-label="Em atraso" />
          )}
          {task.needsHelp && (
            <div className="p-1.5 bg-orange-100 rounded-md" title="Precisa de ajuda">
              <HandHelping className="size-4 text-orange-600" />
            </div>
          )}
        </div>
      </div>

      {/* Overdue badge */}
      {isOverdue && (
        <Badge variant="destructive" className="mb-2 text-xs py-0">Em atraso</Badge>
      )}

      {/* Description */}
      {task.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{task.description}</p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {task.tags.map((tag, index) => (
            <span
              key={tag}
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${tagColors[index % tagColors.length]}`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Subtasks progress */}
      {task.subtasks && task.subtasks.total > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Subtarefas</span>
            <span className="font-medium">{task.subtasks.completed}/{task.subtasks.total}</span>
          </div>
          <Progress value={(task.subtasks.completed / task.subtasks.total) * 100} className="h-1.5" />
        </div>
      )}

      {/* Footer: Budget, Due Date, Comments */}
      <div className="flex items-center gap-3 mb-3 text-xs text-gray-600">
        {task.budget && (
          <div className="flex items-center gap-1" title={`Orçamento: ${task.budget}€`}>
            <Euro className="size-3" />
            <span className="font-medium">{task.budget}€</span>
          </div>
        )}
        {task.dueDate && (
          <div className={`flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : ""}`}>
            <Calendar className="size-3" />
            <span>{formatDistanceToNow(task.dueDate, { locale: pt, addSuffix: true })}</span>
          </div>
        )}
        {task.comments && task.comments > 0 && (
          <div className="flex items-center gap-1">
            <MessageSquare className="size-3" />
            <span>{task.comments}</span>
          </div>
        )}
      </div>

      {/* Collaborators */}
      <div className="flex items-center -space-x-2">
        {task.collaborators.slice(0, 3).map((collaborator) => (
          <Avatar key={collaborator.id} className="size-7 border-2 border-white" style={{ backgroundColor: collaborator.color }}>
            <AvatarFallback className="text-white text-xs font-medium">{collaborator.initials}</AvatarFallback>
          </Avatar>
        ))}
        {task.collaborators.length > 3 && (
          <div className="size-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
            <span className="text-xs font-medium text-gray-600">+{task.collaborators.length - 3}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
