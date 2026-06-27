import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { apiGet, apiPost, apiResponse } from "../lib/apiClient";
import { Project, ApiProject, AttentionFilter, attentionFilters } from "../components/projects/projectsList.types";

export function useProjectsList() {
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
  }, [showArchived]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const fileMatch = disposition.match(/filename="?([^"]+)"?/i);
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

  return {
    projects,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    isLoading,
    apiUnavailable,
    showArchived,
    setShowArchived,
    selectedProjectIds,
    backupLoading,
    restoreLoading,
    restoreInputRef,
    searchParams,
    setSearchParams,
    attentionFilter,
    filteredProjects,
    stats,
    areAllFilteredSelected,
    toggleProjectSelection,
    toggleSelectFiltered,
    clearAttentionFilter,
    downloadBackup,
    handleRestoreFile,
    handleCreateProject,
    loadProjects,
  };
}
