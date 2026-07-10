import { Link } from "react-router";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Checkbox } from "../ui/checkbox";
import { Users, DollarSign } from "lucide-react";
import { Project, statusColors } from "./projectsList.types";
import { formatMoneyCompact } from "../../lib/currency";

interface ProjectListItemProps {
  project: Project;
  selected: boolean;
  onToggleSelect: (checked: boolean) => void;
}

export function ProjectListItem({ project, selected, onToggleSelect }: ProjectListItemProps) {
  return (
    <Link
      key={project.id}
      to={`/projeto/${project.id}`}
      className="flex items-center gap-6 p-4 hover:bg-gray-50 transition-colors"
    >
      <div onClick={(e) => e.preventDefault()} className="mr-1">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onToggleSelect(checked === true)}
          aria-label={`Selecionar projeto ${project.name}`}
        />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="font-semibold text-gray-900">{project.name}</h3>
          {project.arquivado && (
            <Badge className="bg-gray-100 text-gray-500 border-gray-200">Arquivado</Badge>
          )}
          <Badge className={statusColors[project.status]}>{project.status}</Badge>
          {project.tarefas_atrasadas > 0 && (
            <Badge className="bg-red-50 text-red-700 border-red-200">
              {project.tarefas_atrasadas} atrasada{project.tarefas_atrasadas === 1 ? "" : "s"}
            </Badge>
          )}
          {project.milestones_proximos > 0 && (
            <Badge className="bg-amber-50 text-amber-700 border-amber-200">
              {project.milestones_proximos} milestone{project.milestones_proximos === 1 ? "" : "s"}
            </Badge>
          )}
        </div>
        <p className="text-sm text-gray-600">{project.description}</p>
      </div>

      <div className="w-48">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600">Progresso</span>
          <span className="font-medium">{project.progress}%</span>
        </div>
        <Progress value={project.progress} className="h-2" />
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <Users className="size-4" />
          <span>{project.members}</span>
        </div>
        <div className="flex items-center gap-1">
          <DollarSign className="size-4" />
          <span>{formatMoneyCompact(parseFloat(project.budget))}</span>
        </div>
      </div>
    </Link>
  );
}
