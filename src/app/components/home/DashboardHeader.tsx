import { CreateProjectDialog } from "../projects/CreateProjectDialog";
import { PortfolioReportDialog } from "./PortfolioReportDialog";
import type { PortfolioExecutiveReport } from "./home.types";

interface DashboardHeaderProps {
  apiUnavailable: boolean;
  portfolioReport: PortfolioExecutiveReport | null;
  portfolioReportLoading: boolean;
  onPortfolioReportOpen: (open: boolean) => void;
  onCreateProject: (data: {
    name: string;
    description: string;
    objectives: string;
    startDate: string;
    endDate: string;
    budget: string;
  }) => Promise<void>;
}

export function DashboardHeader({
  apiUnavailable,
  portfolioReport,
  portfolioReportLoading,
  onPortfolioReportOpen,
  onCreateProject,
}: DashboardHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral dos seus projetos cooperativos.</p>
        {apiUnavailable && (
          <p className="text-sm text-destructive mt-2">
            API indisponível. Alguns dados podem não estar atualizados.
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <PortfolioReportDialog
          portfolioReport={portfolioReport}
          portfolioReportLoading={portfolioReportLoading}
          onOpenChange={onPortfolioReportOpen}
        />
        <CreateProjectDialog onCreateProject={onCreateProject} />
      </div>
    </div>
  );
}
