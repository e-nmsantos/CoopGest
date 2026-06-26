import { useEffect, useRef, useState } from "react";
import { Header } from "../components/layout/Header";
import { CreateProjectDialog } from "../components/projects/CreateProjectDialog";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Skeleton } from "../components/ui/skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Checkbox } from "../components/ui/checkbox";
import { Link, useSearchParams } from "react-router";
import {
  Search,
  Filter,
  Grid3x3,
  List,
  Calendar,
  Users,
  Euro,
  ArrowUpDown,
  Archive,
  FolderKanban,
  Download,
  Upload,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { apiGet, apiPost, apiResponse } from "../lib/apiClient";

interface Project {
  id: string;
  name: string;
  description: string;
  objectives: string;
  startDate: string;
  endDate: string;
  budget: string;
  status: "Em curso" | "Planeamento" | "Concluído" | "Suspenso";
  progress: number;
  members: number;
  tarefas_total: number;
  tarefas_atrasadas: number;
  milestones_proximos: number;
  arquivado: boolean;
}

interface ApiProject {
  id: number;
  nome: string;
  descricao: string;
  objetivos: string;
  data_inicio: string;
  data_fim: string;
  estado: "Em curso" | "Planeamento" | "Concluído" | "Suspenso";
  membros?: number;
  tarefas_total?: number;
  tarefas_concluidas?: number;
  tarefas_atrasadas?: number;
  milestones_proximos?: number;
  arquivado?: number;
}

type AttentionFilter = "overdue" | "upcoming_milestones" | "no_tasks";

const attentionFilters: Record<AttentionFilter, { label: string; description: string }> = {
  overdue: {
    label: "Projetos com tarefas atrasadas",
    description: "Mostra projetos com tarefas abertas fora do prazo.",
  },
  upcoming_milestones: {
    label: "Projetos com milestones próximos",
    description: "Mostra projetos com entregas nos próximos 14 dias.",
  },
  no_tasks: {
    label: "Projetos sem tarefas",
    description: "Mostra projetos que ainda não têm tarefas planeadas.",
  },
};

const statusColors = {
  "Em curso": "bg-blue-100 text-blue-700 border-blue-200",
  "Planeamento": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Concluído": "bg-green-100 text-green-700 border-green-200",
  "Suspenso": "bg-red-100 text-red-700 border-red-200",
};

export function ProjectsListPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isLoading, setIsLoading] = useState(true);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const attentionParam = searchParams.get("attention");
  const attentionFilter = attentionParam && attentionParam in attentionFilters
    ? attentionParam as AttentionFilter
    : null;

  const loadProjects = async (includeArchived = showArchived) => {
    try {
      const url = includeArchived ? "/api/projects?include_archived=1" : "/api/projects";
      const data = await apiGet<ApiProject[]>(url);
      const mappedProjects: Project[] = data.map((project) => {
        const totalTasks = project.tarefas_total ?? 0;
        const doneTasks = project.tarefas_concluidas ?? 0;
        const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

        return {
          id: String(project.id),
          name: project.nome,
          description: project.descricao ?? "",
          objectives: project.objetivos ?? "",
          startDate: project.data_inicio ?? "",
          endDate: project.data_fim ?? "",
          budget: "0",
          status: project.estado,
          progress,
          members: project.membros ?? 0,
          arquivado: !!(project.arquivado),
          tarefas_total: totalTasks,
          tarefas_atrasadas: project.tarefas_atrasadas ?? 0,
          milestones_proximos: project.milestones_proximos ?? 0,
        };
      });

      setProjects(mappedProjects);
      setSelectedProjectIds((prev) => {
        const valid = new Set(mappedProjects.map((p) => p.id));
        return new Set(Array.from(prev).filter((id) => valid.has(id)));
      });
      setApiUnavailable(false);
    } catch {
      setApiUnavailable(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects(showArchived);
  }, [showArchived]);

  const handleCreateProject = async (projectData: {
    name: string;
    description: string;
    objectives: string;
    startDate: string;
    endDate: string;
    budget: string;
  }) => {
    await apiPost<ApiProject>("/api/projects", {
      nome: projectData.name,
      descricao: projectData.description,
      objetivos: projectData.objectives,
      data_inicio: projectData.startDate,
      data_fim: projectData.endDate,
      estado: "Planeamento",
    });

    await loadProjects();
  };

  // Filtrar e ordenar projetos
  const filteredProjects = projects
    .filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "Todos" || p.status === statusFilter;
      const matchesAttention =
        !attentionFilter ||
        (attentionFilter === "overdue" && p.tarefas_atrasadas > 0) ||
        (attentionFilter === "upcoming_milestones" && p.milestones_proximos > 0) ||
        (attentionFilter === "no_tasks" && p.tarefas_total === 0);
      return matchesSearch && matchesStatus && matchesAttention;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        case "name":
          return a.name.localeCompare(b.name);
        case "progress":
          return b.progress - a.progress;
        case "budget":
          return parseFloat(b.budget) - parseFloat(a.budget);
        default:
          return 0;
      }
    });

  const stats = {
    total: projects.length,
    active: projects.filter((p) => p.status === "Em curso").length,
    planning: projects.filter((p) => p.status === "Planeamento").length,
    completed: projects.filter((p) => p.status === "Concluído").length,
  };

  const filteredIds = filteredProjects.map((p) => p.id);
  const areAllFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedProjectIds.has(id));

  const toggleProjectSelection = (projectId: string, checked: boolean) => {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(projectId);
      } else {
        next.delete(projectId);
      }
      return next;
    });
  };

  const toggleSelectFiltered = (checked: boolean) => {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        filteredIds.forEach((id) => next.add(id));
      } else {
        filteredIds.forEach((id) => next.delete(id));
      }
      return next;
    });
  };

  const clearAttentionFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("attention");
    setSearchParams(next, { replace: true });
  };

  const downloadBackup = async (opts: { all?: boolean; ids?: string[] }) => {
    setBackupLoading(true);
    try {
      const response = await apiResponse("/api/projects/backup/export", {
        method: "POST",
        body: {
          all: !!opts.all,
          project_ids: opts.ids?.map((id) => Number(id)) ?? [],
        },
      });

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const fileMatch = disposition.match(/filename="?([^\"]+)"?/i);
      const fileName = fileMatch?.[1] || `backup-projetos-${new Date().toISOString().slice(0, 10)}.zip`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup exportado com sucesso");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao exportar backup");
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreFile = async (file: File | null) => {
    if (!file) return;
    setRestoreLoading(true);
    try {
      const formData = new FormData();
      formData.append("backup_file", file);
      formData.append("strategy", "duplicate");

      const payload = await apiPost<{ imported_count?: number; warnings?: unknown[] }>("/api/projects/backup/import", formData);

      const importedCount = Number(payload?.imported_count || 0);
      const warningCount = Array.isArray(payload?.warnings) ? payload.warnings.length : 0;
      toast.success(`Restore concluído: ${importedCount} projeto(s) importado(s)`);
      if (warningCount > 0) {
        toast.warning(`Restore com ${warningCount} aviso(s).`);
      }
      await loadProjects(showArchived);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao restaurar backup");
    } finally {
      setRestoreLoading(false);
      if (restoreInputRef.current) {
        restoreInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <Header />

      <div className="flex-1 min-h-0 overflow-auto p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Todos os Projetos</h1>
            <p className="text-gray-600 mt-1">
              Gestão completa da carteira de projetos cooperativos
            </p>
            {apiUnavailable && (
              <p className="text-sm text-amber-700 mt-2">
                API indisponível. A listagem pode estar desatualizada.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={backupLoading || restoreLoading || selectedProjectIds.size === 0}
              onClick={() => void downloadBackup({ ids: Array.from(selectedProjectIds) })}
            >
              <Download className="size-4 mr-1" />
              {backupLoading ? "A gerar backup..." : `Backup (${selectedProjectIds.size})`}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={backupLoading || restoreLoading || projects.length === 0}
              onClick={() => void downloadBackup({ all: true })}
            >
              <Download className="size-4 mr-1" />
              Backup de todos
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={backupLoading || restoreLoading}
              onClick={() => restoreInputRef.current?.click()}
            >
              <Upload className="size-4 mr-1" />
              {restoreLoading ? "A restaurar..." : "Restaurar backup"}
            </Button>
            <input
              ref={restoreInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => void handleRestoreFile(e.target.files?.[0] ?? null)}
            />
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived(v => !v)}
            >
              <Archive className="size-4 mr-1" />
              {showArchived ? "Ocultar arquivados" : "Mostrar arquivados"}
            </Button>
            <CreateProjectDialog onCreateProject={handleCreateProject} />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-sm text-gray-600 mb-1">Total</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600 mb-1">Em Curso</div>
            <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600 mb-1">Planeamento</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.planning}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600 mb-1">Concluídos</div>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-white">
            <Checkbox
              checked={areAllFilteredSelected}
              onCheckedChange={(checked) => toggleSelectFiltered(checked === true)}
              aria-label="Selecionar todos os projetos filtrados"
            />
            <span className="text-sm text-gray-700">Selecionar filtrados</span>
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Pesquisar projetos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <Filter className="size-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os estados</SelectItem>
              <SelectItem value="Em curso">Em curso</SelectItem>
              <SelectItem value="Planeamento">Planeamento</SelectItem>
              <SelectItem value="Concluído">Concluído</SelectItem>
              <SelectItem value="Suspenso">Suspenso</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <ArrowUpDown className="size-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="name">Nome (A-Z)</SelectItem>
              <SelectItem value="progress">Progresso</SelectItem>
              <SelectItem value="budget">Orçamento</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="px-2"
            >
              <Grid3x3 className="size-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="px-2"
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>

        {attentionFilter && (
          <div className="mb-6 flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-blue-900">{attentionFilters[attentionFilter].label}</p>
              <p className="text-xs text-blue-700">{attentionFilters[attentionFilter].description}</p>
            </div>
            <Button variant="ghost" size="sm" className="text-blue-800 hover:bg-blue-100" onClick={clearAttentionFilter}>
              <X className="size-4 mr-1" />
              Limpar filtro
            </Button>
          </div>
        )}

        {/* Projects Grid/List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-6 space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-2 w-full rounded-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title={searchQuery ? "Nenhum projeto encontrado" : "Ainda não há projetos"}
            description={searchQuery ? `Nenhum projeto corresponde a "${searchQuery}".` : "Crie o primeiro projeto da sua organização."}
            action={!searchQuery ? { label: "Novo Projeto", onClick: () => document.querySelector<HTMLButtonElement>('[data-create-project]')?.click() } : undefined}
          />
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
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
                          checked={selectedProjectIds.has(project.id)}
                          onCheckedChange={(checked) => toggleProjectSelection(project.id, checked === true)}
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
            ))}
          </div>
        ) : (
          <Card>
            <div className="divide-y">
              {filteredProjects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projeto/${project.id}`}
                  className="flex items-center gap-6 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div onClick={(e) => e.preventDefault()} className="mr-1">
                    <Checkbox
                      checked={selectedProjectIds.has(project.id)}
                      onCheckedChange={(checked) => toggleProjectSelection(project.id, checked === true)}
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
                      <Euro className="size-4" />
                      <span>{parseFloat(project.budget).toLocaleString("pt-PT")}€</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
