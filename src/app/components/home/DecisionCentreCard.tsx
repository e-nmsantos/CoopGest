import { Link } from "react-router";
import { Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import type { ApiDashboard } from "./home.types";

interface DecisionCentreCardProps {
  portfolioRecommendations: ApiDashboard["portfolio_recommendations"];
  automationLoading: boolean;
  onRunAutomations: () => void;
}

export function DecisionCentreCard({
  portfolioRecommendations,
  automationLoading,
  onRunAutomations,
}: DecisionCentreCardProps) {
  const items = portfolioRecommendations ?? [];

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle>Centro de Decisão</CardTitle>
        <Button
          variant="outline"
          size="sm"
          disabled={automationLoading || items.length === 0}
          onClick={onRunAutomations}
        >
          <Bell className="h-4 w-4 mr-2" />
          {automationLoading ? "A executar..." : "Executar automações"}
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
            <p className="text-sm font-medium text-foreground">Sem ações críticas neste momento</p>
            <p className="text-xs text-muted-foreground">Continue a atualizar tarefas, milestones, orçamento, riscos e impacto para manter esta leitura útil.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => (
              <Link
                key={`${item.project_id}-${item.kind}-${item.title}`}
                to={item.url}
                className="rounded-md border border-border p-4 transition-colors hover:bg-muted/40"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="line-clamp-1 text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{item.project_name}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    item.priority === "Alta"
                      ? "bg-red-50 text-red-700"
                      : item.priority === "Média"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-green-50 text-green-700"
                  }`}>
                    {item.priority}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Saúde</span>
                  <span className="font-semibold text-foreground">{item.health_score}% · {item.health_status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
