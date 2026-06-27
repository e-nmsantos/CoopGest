import { Link } from "react-router";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Checkbox } from "../ui/checkbox";
import { Users, Euro, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { Project, statusColors } from "./projectsList.types";

interface ProjectCardProps {
  project: Project;
  selected: boolean;
  onToggleSelect: (checked: boolean) => void;
}

export function ProjectCard({ project, selected, onToggleSelect }: ProjectCardProps) {
  return (
    <Link key={project.id} to={`/projeto/${project.id}`}>
      <Card className={`p-6 hover:shadow-lg transition-shadow cursor-pointer h-full ${project.arquivado ? "opacity-60" : ""}`}>
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-lg text-gray-900">{project.name}</h3>
          <div className="flex items-center gap-1">
            <div
              onClick={(e) => e.preventDefault()}
              className="mr-1"
            >
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => onToggleSelect(checked === true)}
                aria-label={`Selecionar projeto ${project.name}`}
              />
            </div>
            {project.arquivado && (
              <Badge className="bg-gray-100 text-gray-500 border-gray-200">
                Arquivado
              </Badge>
            )}
            <Badge className={statusColors[project.status]}>
              {project.status}
            </Badge>
          </div>
        </div>

        {(project.tarefas_atrasadas > 0 || project.milestones_proximos > 0) && (
          <div className="mb-3 flex flex-wrap gap-2">
            {project.tarefas_atrasadas > 0 && (
              <Badge className="bg-red-50 text-red-700 border-red-200">
                {project.tarefas_atrasadas} tarefa{project.tarefas_atrasadas === 1 ? "" : "s"} atrasada{project.tarefas_atrasadas === 1 ? "" : "s"}
              </Badge>
            )}
            {project.milestones_proximos > 0 && (
              <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                {project.milestones_proximos} milestone{project.milestones_proximos === 1 ? "" : "s"} próximo{project.milestones_proximos === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
        )}

        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {project.description}
        </p>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">Progresso</span>
              <span className="font-medium">{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-2" />
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="size-4" />
              <span>{project.members} membros</span>
            </div>
            <div className="flex items-center gap-1">
              <Euro className="size-4" />
              <span>{parseFloat(project.budget).toLocaleString("pt-PT")}€</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="size-3" />
            <span>
              {formatDistanceToNow(new Date(project.endDate), {
                addSuffix: true,
                locale: pt,
              })}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
