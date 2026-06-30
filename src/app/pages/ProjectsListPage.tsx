import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Header } from "../components/layout/Header";
import { CreateProjectDialog } from "../components/projects/CreateProjectDialog";
import { ProjectCard } from "../components/projects/ProjectCard";
import { ProjectListItem } from "../components/projects/ProjectListItem";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Checkbox } from "../components/ui/checkbox";
import {
  Search,
  Filter,
  Grid3x3,
  List,
  ArrowUpDown,
  Archive,
  FolderKanban,
  Download,
  Upload,
  FileJson,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { attentionFilters } from "../components/projects/projectsList.types";
import { useProjectsList } from "../hooks/useProjectsList";
import { apiPost } from "../lib/apiClient";
import { toast } from "sonner";

export function ProjectsListPage() {
  const navigate = useNavigate();
  const templateInputRef = useRef<HTMLInputElement>(null);
  const [importingTemplate, setImportingTemplate] = useState(false);

  const handleImportTemplate = async (file: File | null) => {
    if (!file) return;
    setImportingTemplate(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const data = await apiPost<{ projeto_id?: number; nome?: string; criados?: Record<string, number> }>(
        "/api/projects/import-template",
        form,
      );
      const criados = data.criados ?? {};
      const partes = Object.entries(criados).map(([k, v]) => `${v} ${k}`).join(", ");
      toast.success(`Projeto "${data.nome}" importado — ${partes}`);
      void navigate(`/projeto/${data.projeto_id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao importar template");
    } finally {
      setImportingTemplate(false);
      if (templateInputRef.current) templateInputRef.current.value = "";
    }
  };

  const {
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
  } = useProjectsList();

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
            <Button
              variant="outline"
              size="sm"
              disabled={importingTemplate}
              onClick={() => templateInputRef.current?.click()}
              title="Importa um projeto completo a partir de um template JSON CoopGest (parceiros, stakeholders, PEST, SWOT, Quadro Lógico, Avaliação, Orçamento e Riscos)"
            >
              <FileJson className="size-4 mr-1" />
              {importingTemplate ? "A importar..." : "Importar Template"}
            </Button>
            <input
              ref={templateInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => void handleImportTemplate(e.target.files?.[0] ?? null)}
            />
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
              <ProjectCard
                key={project.id}
                project={project}
                selected={selectedProjectIds.has(project.id)}
                onToggleSelect={(checked) => toggleProjectSelection(project.id, checked)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <div className="divide-y">
              {filteredProjects.map((project) => (
                <ProjectListItem
                  key={project.id}
                  project={project}
                  selected={selectedProjectIds.has(project.id)}
                  onToggleSelect={(checked) => toggleProjectSelection(project.id, checked)}
                />
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
