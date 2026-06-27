import { Header } from "../components/layout/Header";
import { useHomeDashboard } from "../hooks/useHomeDashboard";
import { PROJECT_STATUS_ORDER, PROJECT_STATUS_META } from "../components/home/home.constants";
import { DashboardHeader } from "../components/home/DashboardHeader";
import { ExecutiveAttentionCard } from "../components/home/ExecutiveAttentionCard";
import { PortfolioHealthCard } from "../components/home/PortfolioHealthCard";
import { DecisionCentreCard } from "../components/home/DecisionCentreCard";
import { MetricsGrid } from "../components/home/MetricsGrid";
import { ProjectsOverviewCard } from "../components/home/ProjectsOverviewCard";
import { RecentProjectsCard } from "../components/home/RecentProjectsCard";
import type { ProjectStatusItem } from "../components/home/home.types";

export function HomePage() {
  const {
    projects,
    stats,
    portfolioRecommendations,
    portfolioReport,
    portfolioReportLoading,
    automationLoading,
    apiUnavailable,
    loadPortfolioReport,
    runPortfolioAutomations,
    handleCreateProject,
  } = useHomeDashboard();

  const projectStatusData: ProjectStatusItem[] = PROJECT_STATUS_ORDER.map((name) => {
    const value = stats.projetos_por_estado[name] ?? 0;
    const percentage = stats.projetos > 0 ? Math.round((value / stats.projetos) * 100) : 0;
    return { name, value, percentage, ...PROJECT_STATUS_META[name] };
  });

  const activeProjects = stats.projetos_por_estado["Em curso"] ?? 0;
  const completedWork = stats.tarefas + stats.tarefas_concluidas;
  const taskCompletion = completedWork > 0 ? Math.round((stats.tarefas_concluidas / completedWork) * 100) : 0;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-background">
      <Header />
      <main className="flex-1 min-h-0 overflow-auto p-4 sm:p-6 lg:p-8">
        <DashboardHeader
          apiUnavailable={apiUnavailable}
          portfolioReport={portfolioReport}
          portfolioReportLoading={portfolioReportLoading}
          onPortfolioReportOpen={(open) => open && void loadPortfolioReport()}
          onCreateProject={handleCreateProject}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <ExecutiveAttentionCard stats={stats} />
          <PortfolioHealthCard stats={stats} taskCompletion={taskCompletion} />
        </div>

        <DecisionCentreCard
          portfolioRecommendations={portfolioRecommendations}
          automationLoading={automationLoading}
          onRunAutomations={runPortfolioAutomations}
        />

        <MetricsGrid stats={stats} />

        <div className="grid gap-4 mt-4 md:grid-cols-2 lg:grid-cols-7">
          <ProjectsOverviewCard
            projectStatusData={projectStatusData}
            totalProjects={stats.projetos}
            activeProjects={activeProjects}
          />
          <RecentProjectsCard projects={projects} />
        </div>
      </main>
    </div>
  );
}
