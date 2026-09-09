import { Printer } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import type { DbProject, DbPartner, DbMilestone, DbBudgetItem, DbFundingSource, DbRisk, DbBeneficiario, ExecutiveReport } from "../../types/project";
import { formatMoney } from "../../lib/currency";

interface Props {
  project: DbProject | null;
  executiveReport: ExecutiveReport | null;
  milestones: DbMilestone[];
  budget: DbBudgetItem[];
  funding: DbFundingSource[];
  riscos: DbRisk[];
  beneficiarios: DbBeneficiario[];
  partners: DbPartner[];
  totalDespesas: number;
  totalAprovado: number;
  totalBeneficiarios: number;
  dateRange: string;
}

export function ExportReportDialog({
  project, executiveReport, milestones, budget, funding, riscos,
  beneficiarios, partners, totalDespesas, totalAprovado, totalBeneficiarios, dateRange,
}: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Printer className="size-4 mr-2" />
          Exportar Relatório
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-auto bg-white text-slate-950 border-slate-200 shadow-2xl">
        <DialogHeader>
          <DialogTitle>Relatório do Projeto</DialogTitle>
        </DialogHeader>
        <div id="report-content" className="report-document space-y-5 text-sm text-slate-900 bg-white">
          <div className="border-b pb-3">
            <h1 className="text-xl font-bold text-gray-900">{project?.nome}</h1>
            <div className="flex gap-4 text-gray-500 mt-1">
              <span>Estado: {project?.estado || "—"}</span>
              <span>Período: {dateRange || "—"}</span>
            </div>
          </div>
          {executiveReport && (
            <div>
              <h3 className="font-semibold mb-2">Resumo Executivo</h3>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="bg-blue-50 p-2 rounded">
                  <div className="text-blue-700">Saúde</div>
                  <div className="font-bold text-blue-900">{executiveReport.health.score}%</div>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <div className="text-gray-600">Tarefas</div>
                  <div className="font-bold text-gray-900">{executiveReport.summary.progresso_tarefas}%</div>
                </div>
                <div className="bg-green-50 p-2 rounded">
                  <div className="text-green-700">Financeiro</div>
                  <div className="font-bold text-green-900">{executiveReport.finance.execucao_financeira}%</div>
                </div>
                <div className="bg-purple-50 p-2 rounded">
                  <div className="text-purple-700">Impacto</div>
                  <div className="font-bold text-purple-900">{executiveReport.summary.impacto_execucao}%</div>
                </div>
              </div>
              <h4 className="font-semibold mt-3 mb-1">Ações recomendadas</h4>
              <ul className="text-gray-600 text-xs space-y-1">
                {executiveReport.recommendations.map((item) => (
                  <li key={`${item.kind}-${item.title}`}>
                    <strong>[{item.priority}] {item.title}:</strong> {item.description}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {project?.descricao && (
            <div>
              <h3 className="font-semibold mb-1">Descrição</h3>
              <p className="text-gray-600 whitespace-pre-line">{project.descricao}</p>
            </div>
          )}
          {project?.objetivos && (
            <div>
              <h3 className="font-semibold mb-1">Objetivos</h3>
              <p className="text-gray-600 whitespace-pre-line">{project.objetivos}</p>
            </div>
          )}
          {milestones.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Milestones</h3>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-2 border">Nome</th>
                    <th className="text-left p-2 border">Data Prevista</th>
                    <th className="text-left p-2 border">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.map((m) => (
                    <tr key={m.id}>
                      <td className="p-2 border">{m.nome}</td>
                      <td className="p-2 border">{m.data_prevista || "—"}</td>
                      <td className="p-2 border">{m.estado || "Pendente"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {budget.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Resumo Orçamental</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 p-3 rounded">
                  <div className="text-xs text-green-700">Receitas Previstas</div>
                  <div className="font-bold text-green-800">
                    {formatMoney(budget.filter(b => b.tipo === "Receita").reduce((s, b) => s + b.valor_previsto, 0))}
                  </div>
                </div>
                <div className="bg-red-50 p-3 rounded">
                  <div className="text-xs text-red-700">Despesas Previstas</div>
                  <div className="font-bold text-red-800">{formatMoney(totalDespesas)}</div>
                </div>
              </div>
            </div>
          )}
          {funding.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Fontes de Financiamento</h3>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-2 border">Nome</th>
                    <th className="text-left p-2 border">Tipo</th>
                    <th className="text-right p-2 border">Aprovado (USD)</th>
                    <th className="text-right p-2 border">Executado (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {funding.map((f) => (
                    <tr key={f.id}>
                      <td className="p-2 border">{f.nome}</td>
                      <td className="p-2 border">{f.tipo}</td>
                      <td className="p-2 border text-right">{formatMoney(f.valor_aprovado || 0)}</td>
                      <td className="p-2 border text-right">{formatMoney(f.valor_executado || 0)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-gray-50">
                    <td className="p-2 border" colSpan={2}>Total</td>
                    <td className="p-2 border text-right">{formatMoney(totalAprovado)}</td>
                    <td className="p-2 border text-right">{formatMoney(funding.reduce((s, f) => s + (f.valor_executado || 0), 0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          {riscos.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Riscos ({riscos.length})</h3>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-2 border">Descrição</th>
                    <th className="text-left p-2 border">Prob.</th>
                    <th className="text-left p-2 border">Impacto</th>
                    <th className="text-left p-2 border">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {riscos.map((r) => (
                    <tr key={r.id}>
                      <td className="p-2 border">{r.descricao}</td>
                      <td className="p-2 border">{r.probabilidade}</td>
                      <td className="p-2 border">{r.impacto}</td>
                      <td className="p-2 border">{r.estado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {totalBeneficiarios > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Beneficiários</h3>
              <p className="text-gray-600">
                Total de beneficiários: <strong>{totalBeneficiarios.toLocaleString("pt-PT")}</strong> pessoas
              </p>
              <ul className="text-gray-600 text-xs space-y-0.5 mt-1">
                {beneficiarios.map((b) => (
                  <li key={b.id}>• {b.nome} ({b.tipo}) — {(b.numero || 1).toLocaleString("pt-PT")} pessoas</li>
                ))}
              </ul>
            </div>
          )}
          {partners.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Parceiros ({partners.length})</h3>
              <ul className="text-gray-600 space-y-1">
                {partners.map((p) => (
                  <li key={p.id}>• {p.nome} ({p.tipo}) — {p.papel || p.contacto}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="text-xs text-gray-400 border-t pt-2">
            Relatório gerado em {new Date().toLocaleDateString("pt-PT")}
          </div>
        </div>
        <div className="flex justify-end pt-2 border-t">
          <Button onClick={() => window.print()}>
            <Printer className="size-4 mr-2" />
            Imprimir / Guardar como PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
