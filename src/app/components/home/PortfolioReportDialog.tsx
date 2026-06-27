import { Printer } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import type { PortfolioExecutiveReport } from "./home.types";

interface PortfolioReportDialogProps {
  portfolioReport: PortfolioExecutiveReport | null;
  portfolioReportLoading: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PortfolioReportDialog({
  portfolioReport,
  portfolioReportLoading,
  onOpenChange,
}: PortfolioReportDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Printer className="h-4 w-4 mr-2" />
          Relatório do Portfólio
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Relatório Executivo do Portfólio</DialogTitle>
        </DialogHeader>
        {portfolioReportLoading || !portfolioReport ? (
          <div className="py-10 text-center text-sm text-muted-foreground">A preparar relatório...</div>
        ) : (
          <div id="portfolio-report" className="space-y-5 text-sm">
            <div className="border-b pb-4">
              <h1 className="text-2xl font-bold text-foreground">Portfólio de Projetos Cooperativos</h1>
              <p className="text-muted-foreground">
                Relatório gerado em {new Date(portfolioReport.generated_at).toLocaleString("pt-PT")}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-md bg-blue-50 p-3">
                <p className="text-xs text-blue-700">Saúde média</p>
                <p className="text-2xl font-bold text-blue-900">{portfolioReport.summary.average_health}%</p>
              </div>
              <div className="rounded-md bg-red-50 p-3">
                <p className="text-xs text-red-700">Projetos críticos</p>
                <p className="text-2xl font-bold text-red-900">{portfolioReport.summary.critical_projects}</p>
              </div>
              <div className="rounded-md bg-amber-50 p-3">
                <p className="text-xs text-amber-700">Ações altas</p>
                <p className="text-2xl font-bold text-amber-900">{portfolioReport.summary.high_priority_actions}</p>
              </div>
              <div className="rounded-md bg-green-50 p-3">
                <p className="text-xs text-green-700">Beneficiários</p>
                <p className="text-2xl font-bold text-green-900">{portfolioReport.summary.total_beneficiaries.toLocaleString("pt-PT")}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-foreground">Prioridades do Portfólio</h3>
              <div className="space-y-2">
                {portfolioReport.recommendations.slice(0, 8).map((item) => (
                  <div key={`${item.project_id}-${item.title}`} className="rounded-md border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.project_name} · saúde {item.health_score}%</p>
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
                    <p className="mt-2 text-xs text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-foreground">Projetos por Nível de Atenção</h3>
              <div className="overflow-hidden rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-2 text-left">Projeto</th>
                      <th className="p-2 text-left">Estado</th>
                      <th className="p-2 text-right">Saúde</th>
                      <th className="p-2 text-right">Tarefas</th>
                      <th className="p-2 text-right">Finanças</th>
                      <th className="p-2 text-right">Impacto</th>
                      <th className="p-2 text-right">Alertas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolioReport.projects.map((project) => (
                      <tr key={project.project_id} className="border-t border-border">
                        <td className="p-2 font-medium">{project.project_name}</td>
                        <td className="p-2">{project.estado}</td>
                        <td className="p-2 text-right">{project.health.score}%</td>
                        <td className="p-2 text-right">{project.summary.progresso_tarefas}%</td>
                        <td className="p-2 text-right">{project.finance.execucao_financeira}%</td>
                        <td className="p-2 text-right">{project.summary.impacto_execucao}%</td>
                        <td className="p-2 text-right">
                          {project.summary.tarefas_atrasadas + project.summary.milestones_atrasados + project.summary.riscos_altos}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end border-t pt-3">
              <Button onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir / Guardar PDF
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
