import { LayoutDashboard, FolderKanban, Users, Vote, Target, BookUser, FolderOpen, UserCog, CalendarDays, LayoutList, Shield, X, Layers, ListChecks, Banknote, Lightbulb, ShoppingCart, LayoutGrid, GitBranch, GanttChart, Network, ScanSearch, ClipboardCheck } from "lucide-react";
import { Link, useLocation } from "react-router";
import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useSidebar } from "../../contexts/SidebarContext";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Visão Geral",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
      { icon: FolderKanban, label: "Projetos", path: "/projetos" },
      { icon: ListChecks, label: "O Meu Trabalho", path: "/meu-trabalho" },
      { icon: LayoutGrid, label: "Portfólio", path: "/portfolio" },
    ],
  },
  {
    title: "Estratégia & Impacto",
    items: [
      { icon: Target, label: "Impacto (LFA)", path: "/impacto" },
      { icon: GitBranch, label: "Teoria da Mudança", path: "/teoria-mudanca" },
      { icon: ScanSearch, label: "Análise de Contexto", path: "/analise-contexto" },
      { icon: ClipboardCheck, label: "Plano de Avaliação", path: "/plano-avaliacao" },
      { icon: Network, label: "Stakeholders", path: "/stakeholders" },
    ],
  },
  {
    title: "Operações & Prazos",
    items: [
      { icon: GanttChart, label: "Gantt", path: "/gantt" },
      { icon: CalendarDays, label: "Calendário", path: "/calendario" },
      { icon: LayoutList, label: "Recursos", path: "/recursos" },
      { icon: FolderOpen, label: "Documentos", path: "/documentos" },
    ],
  },
  {
    title: "Finanças & Contratos",
    items: [
      { icon: Banknote, label: "Finanças", path: "/financas" },
      { icon: ShoppingCart, label: "Contratos", path: "/contratos" },
    ],
  },
  {
    title: "Pessoas & Aprendizagem",
    items: [
      { icon: Users, label: "Parceiros", path: "/parceiros" },
      { icon: Vote, label: "Votações", path: "/votacoes" },
      { icon: BookUser, label: "Competências", path: "/competencias" },
      { icon: Layers, label: "MethodKit", path: "/methodkit" },
      { icon: Lightbulb, label: "Lições Aprendidas", path: "/licoes" },
    ],
  },
];

const adminMenuItems: NavItem[] = [
  { icon: UserCog, label: "Utilizadores", path: "/utilizadores" },
  { icon: Shield, label: "Auditoria", path: "/auditoria" },
];

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { isOpen, close } = useSidebar();

  useEffect(() => {
    close();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderLink = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;
    return (
      <li key={item.path}>
        <Link
          to={item.path}
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isActive
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-300 hover:bg-slate-700/60 hover:text-white"
          }`}
        >
          <Icon className="size-4 shrink-0" />
          <span className="truncate">{item.label}</span>
        </Link>
      </li>
    );
  };

  const navContent = (
    <div className="space-y-4">
      {navGroups.map((group) => (
        <div key={group.title} className="space-y-1">
          <div className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {group.title}
          </div>
          <ul className="space-y-0.5">
            {group.items.map(renderLink)}
          </ul>
        </div>
      ))}

      {user?.papel === "admin" && (
        <div className="space-y-1 pt-1 border-t border-slate-700/60">
          <div className="px-3 pt-2 text-[11px] font-bold text-amber-400/90 uppercase tracking-wider">
            Administração
          </div>
          <ul className="space-y-0.5">
            {adminMenuItems.map(renderLink)}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop — sempre visível, inline styles para garantir funcionamento */}
      <aside
        className="hidden bg-slate-800 text-white md:flex"
        style={{
          width: "256px",
          minWidth: "256px",
          height: "100vh",
          flexDirection: "column",
          flexShrink: 0,
          overflowY: "auto",
        }}
      >
        <div className="p-6">
          <div className="flex items-center gap-2">
            <div className="size-8 bg-blue-500 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-lg font-semibold">CoopGest</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {navContent}
        </nav>
      </aside>

      {/* Mobile — overlay por cima */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <aside
            className="bg-slate-800 text-white"
            style={{
              width: "256px",
              height: "100vh",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              flexShrink: 0,
            }}
          >
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold text-sm">C</span>
                </div>
                <span className="text-lg font-semibold">CoopGest</span>
              </div>
              <button onClick={close} className="text-slate-400 hover:text-white p-1">
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 pb-4">
              {navContent}
            </nav>
          </aside>
          <div className="flex-1 bg-black/50" onClick={close} />
        </div>
      )}
    </>
  );
}
