import { Link } from "react-router";
import { AlertTriangle, CalendarClock, FolderKanban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import type { ApiDashboard } from "./home.types";

interface ExecutiveAttentionCardProps {
  stats: ApiDashboard["stats"];
}

export function ExecutiveAttentionCard({ stats }: ExecutiveAttentionCardProps) {
  const executiveAlerts = [
    {
      label: "Projetos com tarefas atrasadas",
      value: stats.portfolio.projetos_com_tarefas_atrasadas,
      detail: `${stats.saude_sistema.atrasadas} tarefas fora do prazo`,
      href: "/projetos?attention=overdue",
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Milestones nos próximos 14 dias",
      value: stats.portfolio.milestones_proximos,
      detail: "Próximas entregas a acompanhar",
      href: "/projetos?attention=upcoming_milestones",
      icon: CalendarClock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Projetos sem tarefas",
      value: stats.portfolio.projetos_sem_tarefas,
      detail: "Podem precisar de planeamento",
      href: "/projetos?attention=no_tasks",
      icon: FolderKanban,
      color: "text-slate-600",
      bg: "bg-slate-50",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Atenção Executiva</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-3">
          {executiveAlerts.map((alert) => {
            const Icon = alert.icon;
            return (
              <Link key={alert.label} to={alert.href} className="block rounded-md border border-border p-4 transition-colors hover:bg-muted/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-md ${alert.bg}`}>
                    <Icon className={`h-4 w-4 ${alert.color}`} />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{alert.value}</div>
                </div>
                <p className="text-sm font-medium text-foreground">{alert.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{alert.detail}</p>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
