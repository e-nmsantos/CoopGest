import { Calendar, Trello, FileText, Download, Archive, Copy, PackageOpen, Lock, Unlock } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { ExportReportDialog } from "./ExportReportDialog";
import { PROJECT_STATES, STATE_COLORS, type DbProject, type DbPartner, type DbTask, type DbMilestone, type DbBudgetItem, type DbFundingSource, type DbRisk, type DbBeneficiario, type ExecutiveReport, type ProjectPermissions, type ProjectState } from "../../types/project";
import { apiPost, apiPut, apiResponse } from "../../lib/apiClient";

interface Props {
  id: string;
  project: DbProject | null;
  permissions: ProjectPermissions | null;
  tasks: DbTask[];
  budget: DbBudgetItem[];
  funding: DbFundingSource[];
  milestones: DbMilestone[];
  riscos: DbRisk[];
  beneficiarios: DbBeneficiario[];
  partners: DbPartner[];
  executiveReport: ExecutiveReport | null;
  dateRange: string;
  totalAprovado: number;
  totalDespesas: number;
  totalBeneficiarios: number;
  setProject: React.Dispatch<React.SetStateAction<DbProject | null>>;
  navigate: (path: string) => void;
}

function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(";"),
    ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(";")),
  ].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ProjectActionsBar({
  id, project, permissions, tasks, budget, funding, milestones, riscos,
  beneficiarios, partners, executiveReport, dateRange, totalAprovado, totalDespesas,
  totalBeneficiarios, setProject, navigate,
}: Props) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="size-4" />
          <span>{dateRange || "Datas não definidas"}</span>
        </div>
        <select
          value={project?.estado || "Em curso"}
          disabled={permissions ? !permissions.can_manage : false}
          onChange={async (e) => {
            const estado = e.target.value as ProjectState;
            try {
              const updated = await apiPut<DbProject>(`/api/projects/${id}`, { estado });
              setProject(updated);
              toast.success(`Estado: ${estado}`);
            } catch {
              toast.error("Erro ao atualizar estado");
            }
          }}
          className={`text-xs font-medium px-2.5 py-1 rounded-full border cursor-pointer ${STATE_COLORS[project?.estado || "Em curso"] || "bg-gray-100 text-gray-600"}`}
        >
          {PROJECT_STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {project?.privado ? (
          <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
            <Lock className="size-3" /> Privado
          </span>
        ) : null}
        {permissions?.role && (
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
            Papel: {permissions.role}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <ExportReportDialog
          project={project}
          executiveReport={executiveReport}
          milestones={milestones}
          budget={budget}
          funding={funding}
          riscos={riscos}
          beneficiarios={beneficiarios}
          partners={partners}
          totalDespesas={totalDespesas}
          totalAprovado={totalAprovado}
          totalBeneficiarios={totalBeneficiarios}
          dateRange={dateRange}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download className="size-4 mr-2" />
              Exportar CSV
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => downloadCSV(
              tasks.map((t) => ({ Nome: t.nome, Estado: t.estado || "", Prioridade: t.prioridade || "", Responsável: t.responsavel || "", Prazo: t.data_fim || "" })),
              `tarefas-${project?.nome || id}.csv`
            )}>
              Tarefas (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => downloadCSV(
              budget.map((b) => ({ Tipo: b.tipo, Categoria: b.categoria, Descrição: b.descricao, Previsto: b.valor_previsto, Real: b.valor_real })),
              `orcamento-${project?.nome || id}.csv`
            )}>
              Orçamento (CSV)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Link to="/documentos">
          <Button variant="outline">
            <FileText className="size-4 mr-2" />
            Documentos
          </Button>
        </Link>
        <Link to={`/projeto/${id}/kanban`}>
          <Button variant="outline">
            <Trello className="size-4 mr-2" />
            Ver Kanban
          </Button>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={permissions ? !permissions.can_manage : false}>
              Ações
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={async () => {
              try {
                const data = await apiPost<{ arquivado?: boolean }>(`/api/projects/${id}/archive`);
                toast.success(data.arquivado ? "Projeto arquivado" : "Projeto restaurado");
              } catch {
                toast.error("Erro ao arquivar projeto");
              }
            }}>
              <Archive className="size-4 mr-2" />
              Arquivar / Restaurar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={async () => {
              try {
                const data = await apiPost<{ id: number | string }>(`/api/projects/${id}/duplicate`);
                toast.success("Projeto duplicado!");
                navigate(`/projeto/${data.id}`);
              } catch {
                toast.error("Erro ao duplicar projeto");
              }
            }}>
              <Copy className="size-4 mr-2" />
              Duplicar Projeto
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={async () => {
              try {
                const res = await apiResponse(`/api/projects/${id}/export`);
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `projeto-${id}.json`;
                a.click();
                URL.revokeObjectURL(url);
              } catch {
                toast.error("Erro ao exportar projeto");
              }
            }}>
              <PackageOpen className="size-4 mr-2" />
              Exportar Dados (JSON)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={async () => {
              const newPrivado = project?.privado ? 0 : 1;
              try {
                await apiPut<DbProject>(`/api/projects/${id}`, { privado: newPrivado });
                setProject(p => p ? { ...p, privado: newPrivado } : p);
                toast.success(newPrivado ? "Projeto tornado privado" : "Projeto tornado público");
              } catch {
                toast.error("Erro ao alterar visibilidade");
              }
            }}>
              {project?.privado ? <Unlock className="size-4 mr-2" /> : <Lock className="size-4 mr-2" />}
              {project?.privado ? "Tornar Público" : "Tornar Privado"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
