import { Header } from "../components/layout/Header";
import { Card } from "../components/ui/card";
import { usePortfolio } from "../hooks/usePortfolio";
import { PortfolioKpiStrip } from "../components/portfolio/PortfolioKpiStrip";
import { PortfolioHealthChart } from "../components/portfolio/PortfolioHealthChart";
import { ProjectCardGrid } from "../components/portfolio/ProjectCardGrid";
import { RecommendationsTable } from "../components/portfolio/RecommendationsTable";

export function PortfolioPage() {
  const { data, loading, error } = usePortfolio();

  const summary = data?.summary;
  const projects = data?.projects ?? [];
  const recommendations = data?.recommendations ?? [];

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <Header />

      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Portfólio de Projetos</h1>
          <p className="text-gray-600 mt-1">Visão consolidada de todos os projetos</p>
        </div>

        {loading && (
          <Card className="p-10 text-center text-gray-500">A carregar...</Card>
        )}

        {error && !loading && (
          <Card className="p-10 text-center text-red-600">{error}</Card>
        )}

        {!loading && !error && data && (
          <>
            <PortfolioKpiStrip summary={summary} />
            <PortfolioHealthChart projects={projects} />
            <ProjectCardGrid projects={projects} />
            <RecommendationsTable recommendations={recommendations} />
          </>
        )}
      </div>
    </div>
  );
}
