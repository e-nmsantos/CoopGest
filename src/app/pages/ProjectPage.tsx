import { useParams } from "react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card } from "../components/ui/card";
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
import { useAuth } from "../contexts/AuthContext";
import { Chat } from "../components/project/Chat";
import { useProject } from "../hooks/useProject";
import { ProjectActionsBar } from "../components/project/ProjectActionsBar";
import { ExecutiveDashboard } from "../components/project/ExecutiveDashboard";
import { ProjectDescriptionCards } from "../components/project/ProjectDescriptionCards";
import { ErrorBoundary } from "../components/ui/ErrorBoundary";

export function ProjectPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const project = useProject(id);

  if (project.loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">A carregar projeto...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <Header projectName={project.project?.nome || "Projeto"} showBackButton />

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="p-6">
          <ProjectActionsBar
            id={String(id)}
            project={project.project}
            permissions={project.permissions}
            tasks={project.tasks}
            budget={project.budget}
            funding={project.funding}
            milestones={project.milestones}
            riscos={project.riscos}
            beneficiarios={project.beneficiarios}
            partners={project.partners}
            executiveReport={project.executiveReport}
            dateRange={project.dateRange}
            totalAprovado={project.totalAprovado}
            totalDespesas={project.totalDespesas}
            totalBeneficiarios={project.totalBeneficiarios}
            setProject={project.setProject}
            navigate={project.navigate}
          />

          {project.executiveReport && (
            <ExecutiveDashboard
              executiveReport={project.executiveReport}
              notifyLoading={project.notifyLoading}
              onNotify={project.notifyExecutiveActions}
            />
          )}

          <ProjectDescriptionCards
            project={project.project}
            editingField={project.editingField}
            editValue={project.editValue}
            setEditValue={project.setEditValue}
            onStartEdit={project.startEdit}
            onSave={project.saveEdit}
            onCancel={project.cancelEdit}
          />

          <Tabs key={id} defaultValue="tarefas" className="w-full">
            <TabsList className="mb-6 flex-wrap h-auto gap-1">
              <TabsTrigger value="tarefas" aria-label="Tarefas"><span aria-hidden="true">📋</span> Tarefas</TabsTrigger>
              <TabsTrigger value="milestones" aria-label="Milestones"><span aria-hidden="true">🏁</span> Milestones</TabsTrigger>
              <TabsTrigger value="gantt" aria-label="Gantt"><span aria-hidden="true">📊</span> Gantt</TabsTrigger>
              <TabsTrigger value="equipa" aria-label="Equipa"><span aria-hidden="true">👤</span> Equipa</TabsTrigger>
              <TabsTrigger value="horas" aria-label="Horas"><span aria-hidden="true">⏱</span> Horas</TabsTrigger>
              <TabsTrigger value="parceiros" aria-label="Parceiros"><span aria-hidden="true">🤝</span> Parceiros</TabsTrigger>
              <TabsTrigger value="timeline" aria-label="Timeline"><span aria-hidden="true">📅</span> Timeline</TabsTrigger>
              <TabsTrigger value="orcamento" aria-label="Orçamento"><span aria-hidden="true">💰</span> Orçamento</TabsTrigger>
              <TabsTrigger value="financiamento" aria-label="Financiamento"><span aria-hidden="true">💶</span> Financiamento</TabsTrigger>
              <TabsTrigger value="riscos" aria-label="Riscos"><span aria-hidden="true">⚠️</span> Riscos</TabsTrigger>
              <TabsTrigger value="beneficiarios" aria-label="Beneficiários"><span aria-hidden="true">👥</span> Beneficiários</TabsTrigger>
              <TabsTrigger value="chat" aria-label="Chat"><span aria-hidden="true">💬</span> Chat</TabsTrigger>
              <TabsTrigger value="comentarios" aria-label="Comentários"><span aria-hidden="true">💬</span> Comentários</TabsTrigger>
              <TabsTrigger value="analytics" aria-label="Analytics"><span aria-hidden="true">📈</span> Analytics</TabsTrigger>
              <TabsTrigger value="atividade">Atividade</TabsTrigger>
            </TabsList>

            <TabsContent value="tarefas" className="mt-0">
              <ErrorBoundary>
                <Tarefas projectId={String(id)} initialTasks={project.tasks} />
              </ErrorBoundary>
            </TabsContent>
            <TabsContent value="milestones" className="mt-0">
              <ErrorBoundary>
                <MilestonesSection projectId={String(id)} initialMilestones={project.milestones} />
              </ErrorBoundary>
            </TabsContent>
            <TabsContent value="gantt" className="mt-0">
              <ErrorBoundary>
                <Card className="p-6">
                  <GanttChart milestones={project.milestones} tasks={project.tasks} />
                </Card>
              </ErrorBoundary>
            </TabsContent>
            <TabsContent value="equipa" className="mt-0">
              <ErrorBoundary>
                <ProjectTeamSection projectId={String(id)} />
              </ErrorBoundary>
            </TabsContent>
            <TabsContent value="horas" className="mt-0">
              <ErrorBoundary>
                <HoursSection projectId={String(id)} tasks={project.tasks} />
              </ErrorBoundary>
            </TabsContent>
            <TabsContent value="parceiros" className="mt-0">
              <ErrorBoundary>
                <PartnersSection partners={project.frontendPartners} />
              </ErrorBoundary>
            </TabsContent>
            <TabsContent value="timeline" className="mt-0">
              <ErrorBoundary>
                <ProjectTimeline events={project.timelineEvents} />
              </ErrorBoundary>
            </TabsContent>
            <TabsContent value="orcamento" className="mt-0">
              <ErrorBoundary>
                <BudgetSection projectId={String(id)} initialItems={project.budget} />
              </ErrorBoundary>
            </TabsContent>
            <TabsContent value="financiamento" className="mt-0">
              <ErrorBoundary>
                <FundingSection projectId={String(id)} initialFunding={project.funding} />
              </ErrorBoundary>
            </TabsContent>
            <TabsContent value="riscos" className="mt-0">
              <ErrorBoundary>
                <Card className="p-6">
                  <RisksSection projectId={String(id)} initialRisks={project.riscos} />
                </Card>
              </ErrorBoundary>
            </TabsContent>
            <TabsContent value="beneficiarios" className="mt-0">
              <ErrorBoundary>
                <BeneficiariosSection projectId={String(id)} initialBeneficiarios={project.beneficiarios} />
              </ErrorBoundary>
            </TabsContent>
            <TabsContent value="chat" className="mt-0">
              <ErrorBoundary>
                <Card>
                  {user ? <Chat projectId={String(id)} currentUser={{ name: user.nome || user.username }} /> : <div>A carregar...</div>}
                </Card>
              </ErrorBoundary>
            </TabsContent>
            <TabsContent value="comentarios" className="mt-0">
              <ErrorBoundary>
                <Card className="p-6">
                  <CommentsSection projectId={String(id)} initialComments={project.comentarios} />
                </Card>
              </ErrorBoundary>
            </TabsContent>
            <TabsContent value="atividade" className="mt-0">
              <ErrorBoundary>
                <ProjectActivitySection projectId={String(id)} />
              </ErrorBoundary>
            </TabsContent>
            <TabsContent value="analytics" className="mt-0">
              <ErrorBoundary>
                <AnalyticsSection projectId={String(id)} tasks={project.tasks} budget={project.budget} />
              </ErrorBoundary>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
