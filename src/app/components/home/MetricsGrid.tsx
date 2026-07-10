import { FolderKanban, Users, CheckSquare, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import type { ApiDashboard } from "./home.types";
import { formatMoneyCompact } from "../../lib/currency";

interface MetricsGridProps {
  stats: ApiDashboard["stats"];
}

export function MetricsGrid({ stats }: MetricsGridProps) {
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Projetos</CardTitle>
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.projetos}</div>
          <p className="text-xs text-muted-foreground">Total de projetos na plataforma</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Parceiros Envolvidos</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.parceiros}</div>
          <p className="text-xs text-muted-foreground">Coletividades e organizações</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tarefas Pendentes</CardTitle>
          <CheckSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.tarefas}</div>
          <p className="text-xs text-muted-foreground">Total de tarefas por concluir</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Execução Financeira</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.portfolio.execucao_orcamental_percent}%</div>
          <p className="text-xs text-muted-foreground">
            {formatMoneyCompact(stats.orcamento_executado || 0)} de {formatMoneyCompact(stats.orcamento_total || 0)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
