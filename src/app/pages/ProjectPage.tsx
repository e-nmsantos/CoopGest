import { useState, useEffect } from "react";
import { Activity, AlertTriangle, Bell, Calendar, Trello, FileText, Pencil, Check, X, Printer, Download, Archive, Copy, PackageOpen, Lock, Unlock } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { BudgetSection } from "../components/project/BudgetSection";
import { Tarefas } from "../components/project/Tarefas";
import { MilestonesSection } from "../components/project/MilestonesSection";
import { ProjectTimeline } from "../components/timeline/ProjectTimeline";
import { PartnersSection } from "../components/partners/PartnersSection";
import { FundingSection } from "../components/project/FundingSection";
import { GanttChart } from "../components/project/GanttChart";
import { CommentsSection } from "../components/project/CommentsSection";
import { RisksSection } from "../components/project/RisksSection";
import { BeneficiariosSection } from "../components/project/BeneficiariosSection";
import { HoursSection } from "../components/project/HoursSection";
import { ProjectTeamSection } from "../components/project/ProjectTeamSection";
import { AnalyticsSection } from "../components/project/AnalyticsSection";
import { ProjectActivitySection } from "../components/project/ProjectActivitySection";
import { Header } from "../components/layout/Header";
import { toast } from "sonner";
import { useProjectContext } from "../contexts/ProjectContext";
import { useAuth } from "../contexts/AuthContext";
import { Chat } from "../components/project/Chat";
import { PROJECT_STATES, STATE_COLORS, type DbProject, type DbPartner, type DbTask, type DbMilestone, type DbBudgetItem, type DbFundingSource, type DbComment, type DbRisk, type DbBeneficiario, type ExecutiveReport, type ProjectPermissions, type ProjectState } from "../types/project";
import { apiGet, apiPost, apiPut, apiResponse } from "../lib/apiClient";

interface ProjectDetailPayload {
  projeto: DbProject;
  parceiros?: DbPartner[];
  tarefas?: DbTask[];
  milestones?: DbMilestone[];
  orcamento?: DbBudgetItem[];
  funding?: DbFundingSource[];
  comentarios?: DbComment[];
  riscos?: DbRisk[];
  beneficiarios?: DbBeneficiario[];
  total_beneficiarios?: number;
}

function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(';'),
    ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(';')),
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ProjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setActiveProjectId } = useProjectContext();
  const { user } = useAuth();
  const [project, setProject] = useState<DbProject | null>(null);
  const [partners, setPartners] = useState<DbPartner[]>([]);
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [milestones, setMilestones] = useState<DbMilestone[]>([]);
  const [budget, setBudget] = useState<DbBudgetItem[]>([]);
  const [funding, setFunding] = useState<DbFundingSource[]>([]);
  const [comentarios, setComentarios] = useState<DbComment[]>([]);
  const [riscos, setRiscos] = useState<DbRisk[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<DbBeneficiario[]>([]);
  const [totalBeneficiarios, setTotalBeneficiarios] = useState(0);
  const [executiveReport, setExecutiveReport] = useState<ExecutiveReport | null>(null);
  const [permissions, setPermissions] = useState<ProjectPermissions | null>(null);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Inline editing state
  const [editingField, setEditingField] = useState<"descricao" | "objetivos" | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (field: "descricao" | "objetivos") => {
    setEditingField(field);
    setEditValue(project?.[field] || "");
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const saveEdit = async () => {
    if (!editingField || !id) return;
    try {
      const updated = await apiPut<DbProject>(`/api/projects/${id}`, { [editingField]: editValue });
      setProject(updated);
      setEditingField(null);
      toast.success("Projeto atualizado!");
    } catch {
      toast.error("Erro ao guardar alterações");
    }
  };

  const notifyExecutiveActions = async () => {
    if (!id) return;
    setNotifyLoading(true);
    try {
      const payload = await apiPost<{ created?: number }>(`/api/projects/${id}/executive-report/notify`);
      toast.success(`${payload.created || 0} notificação(ões) criada(s)`);
    } catch {
      toast.error("Erro ao criar notificações");
    } finally {
      setNotifyLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      setActiveProjectId(String(id));
    }
  }, [id, setActiveProjectId]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    setLoading(true);
    setProject(null);
    setPartners([]);
    setTasks([]);
    setMilestones([]);
    setBudget([]);
    setFunding([]);
    setComentarios([]);
    setRiscos([]);
    setBeneficiarios([]);
    setTotalBeneficiarios(0);
    setExecutiveReport(null);
    setPermissions(null);
    setEditingField(null);
    setEditValue("");

    Promise.all([
      apiGet<ProjectDetailPayload | null>(`/api/projects/${id}`, { signal: controller.signal }).catch(() => null),
      apiGet<ExecutiveReport | null>(`/api/projects/${id}/executive-report`, { signal: controller.signal }).catch(() => null),
      apiGet<ProjectPermissions | null>(`/api/projects/${id}/permissions`, { signal: controller.signal }).catch(() => null),
    ])
      .then(([data, report, projectPermissions]) => {
        if (!data || controller.signal.aborted) return;
        setProject(data.projeto);
        setPartners(data.parceiros || []);
        setTasks(data.tarefas || []);
        setMilestones(data.milestones || []);
        setBudget(data.orcamento || []);
        setFunding(data.funding || []);
        setComentarios(data.comentarios || []);
        setRiscos(data.riscos || []);
        setBeneficiarios(data.beneficiarios || []);
        setTotalBeneficiarios(data.total_beneficiarios || 0);
        setExecutiveReport(report);
        setPermissions(projectPermissions);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        toast.error("Erro ao carregar projeto");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [id]);

  const frontendPartners = partners.map((p) => ({
    id: String(p.id),
    name: p.nome,
    type: p.tipo || "",
    country: p.pais || "",
    contactPerson: p.contacto || "",
    email: p.email || "",
    phone: p.telefone || "",
    role: p.papel || "",
    contribution: p.descricao || "",
  }));

  const fallbackDate = project?.data_inicio ? new Date(project.data_inicio) : new Date();

  const timelineEvents = [
    ...milestones
      .filter((m) => m.estado === "Concluído")
      .map((m) => ({
        id: `milestone-${m.id}`,
        type: "milestone" as const,
        title: m.nome,
        description: m.descricao,
        date: new Date(m.data_concluida || m.data_prevista || fallbackDate),
        user: "Equipa",
      })),
    ...tasks
      .filter((t) => t.estado === "Concluída")
      .map((t) => ({
        id: `task-${t.id}`,
        type: "task" as const,
        title: t.nome,
        description: t.descricao,
        date: new Date(t.data_fim || t.criado_em || fallbackDate),
        user: t.responsavel || "Equipa",
      })),
    ...budget.map((b) => ({
      id: `budget-${b.id}`,
      type: "budget" as const,
      title: `${b.tipo}: ${b.categoria}`,
      description: b.descricao,
      date: fallbackDate,
      user: "Administração",
      metadata: { amount: b.valor_previsto },
    })),
    ...partners.map((p) => ({
      id: `partner-${p.id}`,
      type: "member" as const,
      title: `Parceiro: ${p.nome}`,
      description: p.papel || p.tipo || "",
      date: fallbackDate,
      user: p.contacto || "",
    })),
  ].filter((e) => !isNaN(e.date.getTime()));

  const dateRange = [project?.data_inicio, project?.data_fim].filter(Boolean).join(" ~ ");

  const totalAprovado = funding.reduce((s, f) => s + (f.valor_aprovado || 0), 0);
  const totalDespesas = budget.filter((b) => b.tipo === "Despesa").reduce((s, b) => s + (b.valor_previsto || 0), 0);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">A carregar projeto...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <Header projectName={project?.nome || "Projeto"} showBackButton />

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="p-6">
          {/* Project Actions */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="size-4" />
                <span>{dateRange || "Datas não definidas"}</span>
              </div>
              {/* Status dropdown */}
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
              {/* Export Report Dialog */}
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
                              {budget.filter(b => b.tipo === "Receita").reduce((s, b) => s + b.valor_previsto, 0).toFixed(2)} €
                            </div>
                          </div>
                          <div className="bg-red-50 p-3 rounded">
                            <div className="text-xs text-red-700">Despesas Previstas</div>
                            <div className="font-bold text-red-800">{totalDespesas.toFixed(2)} €</div>
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
                              <th className="text-right p-2 border">Aprovado (€)</th>
                              <th className="text-right p-2 border">Executado (€)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {funding.map((f) => (
                              <tr key={f.id}>
                                <td className="p-2 border">{f.nome}</td>
                                <td className="p-2 border">{f.tipo}</td>
                                <td className="p-2 border text-right">{(f.valor_aprovado || 0).toFixed(2)}</td>
                                <td className="p-2 border text-right">{(f.valor_executado || 0).toFixed(2)}</td>
                              </tr>
                            ))}
                            <tr className="font-bold bg-gray-50">
                              <td className="p-2 border" colSpan={2}>Total</td>
                              <td className="p-2 border text-right">{totalAprovado.toFixed(2)}</td>
                              <td className="p-2 border text-right">{funding.reduce((s, f) => s + (f.valor_executado || 0), 0).toFixed(2)}</td>
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
                          Total de beneficiários: <strong>{totalBeneficiarios.toLocaleString('pt-PT')}</strong> pessoas
                        </p>
                        <ul className="text-gray-600 text-xs space-y-0.5 mt-1">
                          {beneficiarios.map((b) => (
                            <li key={b.id}>• {b.nome} ({b.tipo}) — {(b.numero || 1).toLocaleString('pt-PT')} pessoas</li>
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

              {/* CSV Export */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="size-4 mr-2" />
                    Exportar CSV
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => downloadCSV(
                    tasks.map((t) => ({ Nome: t.nome, Estado: t.estado || '', Prioridade: t.prioridade || '', Responsável: t.responsavel || '', Prazo: t.data_fim || '' })),
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

              {/* Project actions dropdown */}
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

          {executiveReport && (
            <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6 mb-6">
              <Card className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50">
                      <Activity className="size-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Saúde Executiva</h3>
                      <p className="text-xs text-gray-500">{executiveReport.health.status}</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{executiveReport.health.score}%</div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">Tarefas</div>
                    <div className="font-semibold text-gray-900">{executiveReport.summary.progresso_tarefas}%</div>
                  </div>
                  <div className="rounded-md bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">Financeiro</div>
                    <div className="font-semibold text-gray-900">{executiveReport.finance.execucao_financeira}%</div>
                  </div>
                  <div className="rounded-md bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">Impacto</div>
                    <div className="font-semibold text-gray-900">{executiveReport.summary.impacto_execucao}%</div>
                  </div>
                  <div className="rounded-md bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">Beneficiários</div>
                    <div className="font-semibold text-gray-900">{executiveReport.summary.beneficiarios.toLocaleString("pt-PT")}</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">Ações Recomendadas</h3>
                    <p className="text-xs text-gray-500">Geradas automaticamente a partir de tarefas, prazos, riscos, orçamento e impacto.</p>
                  </div>
                  <Button variant="outline" size="sm" disabled={notifyLoading} onClick={notifyExecutiveActions}>
                    <Bell className="size-4 mr-2" />
                    {notifyLoading ? "A notificar..." : "Notificar equipa"}
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {executiveReport.recommendations.map((item) => (
                    <Link key={`${item.kind}-${item.title}`} to={item.url} className="rounded-md border border-gray-200 p-3 transition-colors hover:bg-gray-50">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-gray-900">{item.title}</span>
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
                      <p className="text-xs text-gray-600">{item.description}</p>
                    </Link>
                  ))}
                </div>

                {(executiveReport.summary.tarefas_atrasadas > 0 || executiveReport.summary.riscos_altos > 0 || executiveReport.summary.milestones_atrasados > 0) && (
                  <div className="mt-4 flex items-center gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                    <AlertTriangle className="size-4" />
                    <span>
                      {executiveReport.summary.tarefas_atrasadas} tarefa(s) atrasada(s), {executiveReport.summary.milestones_atrasados} milestone(s) atrasado(s), {executiveReport.summary.riscos_altos} risco(s) alto(s).
                    </span>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Description & Objectives */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {(["descricao", "objetivos"] as const).map((field) => (
              <Card key={field} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">
                    {field === "descricao" ? "Descrição" : "Objetivos"}
                  </h3>
                  {editingField === field ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={saveEdit}>
                        <Check className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-gray-500 hover:text-gray-700" onClick={cancelEdit}>
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-gray-400 hover:text-gray-600" onClick={() => startEdit(field)}>
                      <Pencil className="size-3.5" />
                    </Button>
                  )}
                </div>
                {editingField === field ? (
                  <Textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={4}
                    className="text-sm"
                    autoFocus
                  />
                ) : (
                  <p className="text-gray-600 text-sm whitespace-pre-line">
                    {project?.[field] || (field === "descricao" ? "Sem descrição" : "Sem objetivos definidos")}
                  </p>
                )}
              </Card>
            ))}
          </div>

          {/* Tabs Section */}
          <Tabs key={id} defaultValue="tarefas" className="w-full">
            <TabsList className="mb-6 flex-wrap h-auto gap-1">
              <TabsTrigger value="tarefas">📋 Tarefas</TabsTrigger>
              <TabsTrigger value="milestones">🏁 Milestones</TabsTrigger>
              <TabsTrigger value="gantt">📊 Gantt</TabsTrigger>
              <TabsTrigger value="equipa">👤 Equipa</TabsTrigger>
              <TabsTrigger value="horas">⏱ Horas</TabsTrigger>
              <TabsTrigger value="parceiros">🤝 Parceiros</TabsTrigger>
              <TabsTrigger value="timeline">📅 Timeline</TabsTrigger>
              <TabsTrigger value="orcamento">💰 Orçamento</TabsTrigger>
              <TabsTrigger value="financiamento">💶 Financiamento</TabsTrigger>
              <TabsTrigger value="riscos">⚠️ Riscos</TabsTrigger>
              <TabsTrigger value="beneficiarios">👥 Beneficiários</TabsTrigger>
              <TabsTrigger value="chat">💬 Chat</TabsTrigger>
              <TabsTrigger value="comentarios">💬 Comentários</TabsTrigger>
              <TabsTrigger value="analytics">📈 Analytics</TabsTrigger>
              <TabsTrigger value="atividade">Atividade</TabsTrigger>
            </TabsList>

            <TabsContent value="tarefas" className="mt-0">
              <Tarefas projectId={String(id)} initialTasks={tasks} />
            </TabsContent>

            <TabsContent value="milestones" className="mt-0">
              <MilestonesSection projectId={String(id)} initialMilestones={milestones} />
            </TabsContent>

            <TabsContent value="gantt" className="mt-0">
              <Card className="p-6">
                <GanttChart milestones={milestones} tasks={tasks} />
              </Card>
            </TabsContent>

            <TabsContent value="equipa" className="mt-0">
              <ProjectTeamSection projectId={String(id)} />
            </TabsContent>

            <TabsContent value="horas" className="mt-0">
              <HoursSection projectId={String(id)} tasks={tasks} />
            </TabsContent>

            <TabsContent value="parceiros" className="mt-0">
              <PartnersSection partners={frontendPartners} />
            </TabsContent>

            <TabsContent value="timeline" className="mt-0">
              <ProjectTimeline events={timelineEvents} />
            </TabsContent>

            <TabsContent value="orcamento" className="mt-0">
              <BudgetSection projectId={String(id)} initialItems={budget} />
            </TabsContent>

            <TabsContent value="financiamento" className="mt-0">
              <FundingSection projectId={String(id)} initialFunding={funding} />
            </TabsContent>

            <TabsContent value="riscos" className="mt-0">
              <Card className="p-6">
                <RisksSection projectId={String(id)} initialRisks={riscos} />
              </Card>
            </TabsContent>

            <TabsContent value="beneficiarios" className="mt-0">
              <BeneficiariosSection projectId={String(id)} initialBeneficiarios={beneficiarios} />
            </TabsContent>

            <TabsContent value="chat" className="mt-0">
              <Card>
                {user ? <Chat projectId={String(id)} currentUser={{ name: user.nome || user.username }} /> : <div>A carregar...</div>}
              </Card>
            </TabsContent>

            <TabsContent value="comentarios" className="mt-0">
              <Card className="p-6">
                <CommentsSection projectId={String(id)} initialComments={comentarios} />
              </Card>
            </TabsContent>

            <TabsContent value="atividade" className="mt-0">
              <ProjectActivitySection projectId={String(id)} />
            </TabsContent>

            <TabsContent value="analytics" className="mt-0">
              <AnalyticsSection projectId={String(id)} tasks={tasks} budget={budget} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
