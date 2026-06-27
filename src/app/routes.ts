import { createBrowserRouter } from "react-router";
import { RootLayout } from "./pages/RootLayout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";

export const router = createBrowserRouter([
  { path: "/login", Component: LoginPage },
  { path: "/registo", Component: RegisterPage },
  {
    path: "/forgot-password",
    lazy: async () => {
      const { ForgotPasswordPage } = await import("./pages/ForgotPasswordPage");
      return { Component: ForgotPasswordPage };
    },
  },
  {
    path: "/reset-password",
    lazy: async () => {
      const { ResetPasswordPage } = await import("./pages/ResetPasswordPage");
      return { Component: ResetPasswordPage };
    },
  },
  {
    path: "/feedback/:token",
    lazy: async () => {
      const { FeedbackPage } = await import("./pages/FeedbackPage");
      return { Component: FeedbackPage };
    },
  },
  {
    path: "/",
    Component: RootLayout,
    children: [
      {
        index: true,
        lazy: async () => {
          const { HomePage } = await import("./pages/HomePage");
          return { Component: HomePage };
        },
      },
      {
        path: "projetos",
        lazy: async () => {
          const { ProjectsListPage } = await import("./pages/ProjectsListPage");
          return { Component: ProjectsListPage };
        },
      },
      {
        path: "meu-trabalho",
        lazy: async () => {
          const { MyWorkPage } = await import("./pages/MyWorkPage");
          return { Component: MyWorkPage };
        },
      },
      {
        path: "projeto/:id",
        lazy: async () => {
          const { ProjectPage } = await import("./pages/ProjectPage");
          return { Component: ProjectPage };
        },
      },
      {
        path: "projeto/:id/kanban",
        lazy: async () => {
          const { KanbanPage } = await import("./pages/KanbanPage");
          return { Component: KanbanPage };
        },
      },
      {
        path: "parceiros",
        lazy: async () => {
          const { ParceirosPage } = await import("./pages/ParceirosPage");
          return { Component: ParceirosPage };
        },
      },
      {
        path: "votacoes",
        lazy: async () => {
          const { VotingPage } = await import("./pages/VotingPage");
          return { Component: VotingPage };
        },
      },
      {
        path: "documentos",
        lazy: async () => {
          const { DocumentsPage } = await import("./pages/DocumentsPage");
          return { Component: DocumentsPage };
        },
      },
      {
        path: "calendario",
        lazy: async () => {
          const { CalendarPage } = await import("./pages/CalendarPage");
          return { Component: CalendarPage };
        },
      },
      {
        path: "recursos",
        lazy: async () => {
          const { RecursosPage } = await import("./pages/RecursosPage");
          return { Component: RecursosPage };
        },
      },
      {
        path: "financas",
        lazy: async () => {
          const { FinancePage } = await import("./pages/FinancePage");
          return { Component: FinancePage };
        },
      },
      {
        path: "impacto",
        lazy: async () => {
          const { ImpactPage } = await import("./pages/ImpactPage");
          return { Component: ImpactPage };
        },
      },
      {
        path: "licoes",
        lazy: async () => {
          const { LicoesPage } = await import("./pages/LicoesPage");
          return { Component: LicoesPage };
        },
      },
      {
        path: "competencias",
        lazy: async () => {
          const { SkillsPage } = await import("./pages/SkillsPage");
          return { Component: SkillsPage };
        },
      },
      {
        path: "methodkit",
        lazy: async () => {
          const { MethodKitPage } = await import("./pages/MethodKitPage");
          return { Component: MethodKitPage };
        },
      },
      {
        path: "utilizadores",
        lazy: async () => {
          const { UsersPage } = await import("./pages/UsersPage");
          return { Component: UsersPage };
        },
      },
      {
        path: "auditoria",
        lazy: async () => {
          const { AuditPage } = await import("./pages/AuditPage");
          return { Component: AuditPage };
        },
      },
      {
        path: "portfolio",
        lazy: async () => {
          const { PortfolioPage } = await import("./pages/PortfolioPage");
          return { Component: PortfolioPage };
        },
      },
      {
        path: "teoria-mudanca",
        lazy: async () => {
          const { TeoriaPage } = await import("./pages/TeoriaPage");
          return { Component: TeoriaPage };
        },
      },
      {
        path: "contratos",
        lazy: async () => {
          const { ProcurementPage } = await import("./pages/ProcurementPage");
          return { Component: ProcurementPage };
        },
      },
      {
        path: "gantt",
        lazy: async () => {
          const { GanttPage } = await import("./pages/GanttPage");
          return { Component: GanttPage };
        },
      },
      {
        path: "stakeholders",
        lazy: async () => {
          const { StakeholdersPage } = await import("./pages/StakeholdersPage");
          return { Component: StakeholdersPage };
        },
      },
      {
        path: "perfil",
        lazy: async () => {
          const { ProfilePage } = await import("./pages/ProfilePage");
          return { Component: ProfilePage };
        },
      },
      {
        path: "notificacoes",
        lazy: async () => {
          const { NotificationsPage } = await import("./pages/NotificationsPage");
          return { Component: NotificationsPage };
        },
      },
    ],
  },
]);
