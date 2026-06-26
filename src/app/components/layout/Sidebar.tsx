import { LayoutDashboard, FolderKanban, Users, Vote, Target, BookUser, FolderOpen, UserCog, CalendarDays, LayoutList, Shield, X, Layers, ListChecks, Banknote, Lightbulb, ShoppingCart, LayoutGrid, GitBranch } from "lucide-react";
import { Link, useLocation } from "react-router";
import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useSidebar } from "../../contexts/SidebarContext";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: FolderKanban, label: "Projetos", path: "/projetos" },
  { icon: ListChecks, label: "O Meu Trabalho", path: "/meu-trabalho" },
  { icon: Users, label: "Parceiros", path: "/parceiros" },
  { icon: Vote, label: "Votações", path: "/votacoes" },
  { icon: FolderOpen, label: "Documentos", path: "/documentos" },
  { icon: CalendarDays, label: "Calendário", path: "/calendario" },
  { icon: LayoutList, label: "Recursos", path: "/recursos" },
  { icon: Banknote, label: "Financas", path: "/financas" },
  { icon: LayoutGrid, label: "Portfólio", path: "/portfolio" },
  { icon: Target, label: "Impacto", path: "/impacto" },
  { icon: GitBranch, label: "Teoria Mudança", path: "/teoria-mudanca" },
  { icon: Lightbulb, label: "Lições", path: "/licoes" },
  { icon: ShoppingCart, label: "Contratos", path: "/contratos" },
  { icon: BookUser, label: "Competências", path: "/competencias" },
  { icon: Layers, label: "MethodKit", path: "/methodkit" },
];

const adminMenuItems = [
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

  const renderLink = (item: { icon: React.ElementType; label: string; path: string }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;
    return (
      <li key={item.path}>
        <Link
          to={item.path}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
            isActive
              ? "bg-slate-700 text-white"
              : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
          }`}
        >
          <Icon className="size-5" />
          <span>{item.label}</span>
        </Link>
      </li>
    );
  };

  const navItems = (
    <ul className="space-y-1">
      {menuItems.map(renderLink)}
      {user?.papel === "admin" && (
        <>
          <li className="pt-2">
            <div className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">Admin</div>
          </li>
          {adminMenuItems.map(renderLink)}
        </>
      )}
    </ul>
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
          {navItems}
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
              {navItems}
            </nav>
          </aside>
          <div className="flex-1 bg-black/50" onClick={close} />
        </div>
      )}
    </>
  );
}
