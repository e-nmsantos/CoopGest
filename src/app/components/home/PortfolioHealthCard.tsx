import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import type { ApiDashboard } from "./home.types";

interface PortfolioHealthCardProps {
  stats: ApiDashboard["stats"];
  taskCompletion: number;
}

export function PortfolioHealthCard({ stats, taskCompletion }: PortfolioHealthCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Saúde do Portfólio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{stats.saude_sistema.status}</p>
              <p className="text-xs text-muted-foreground">Baseado em tarefas atrasadas</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-foreground">{stats.saude_sistema.score}%</div>
        </div>
        <Progress value={stats.saude_sistema.score} />
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Execução financeira</p>
            <p className="font-semibold text-foreground">{stats.portfolio.execucao_orcamental_percent}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tarefas concluídas</p>
            <p className="font-semibold text-foreground">{taskCompletion}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
