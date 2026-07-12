import { useState, useEffect, useRef } from "react";
import { ArrowLeft, FolderKanban, Menu, Search, X } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { useSidebar } from "../../contexts/SidebarContext";
import { NotificationBell } from "./NotificationBell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useProjectContext } from "../../contexts/ProjectContext";
import { apiGet } from "../../lib/apiClient";

interface SearchResult {
  projetos: Array<{ id: number; nome: string; estado: string }>;
  tarefas: Array<{ id: number; nome: string; estado: string; projeto_id: number; projeto_nome: string }>;
  parceiros: Array<{ id: number; nome: string; tipo: string }>;
}

interface HeaderProps {
  projectName?: string;
  showBackButton?: boolean;
}

export function Header({ projectName, showBackButton }: HeaderProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toggle: toggleSidebar } = useSidebar();
  const { activeProject, activeProjectId, projects, projectsLoading, setActiveProjectId } = useProjectContext();

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) { setResults(null); return; }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await apiGet<SearchResult>(`/api/search?q=${encodeURIComponent(query)}`));
      } catch { /* ignore */ } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false); setQuery(""); setResults(null);
      }
    };
    if (searchOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchOpen]);

  const hasResults = results && (results.projetos.length + results.tarefas.length + results.parceiros.length) > 0;

  const handleProjectChange = (nextProjectId: string) => {
    setActiveProjectId(nextProjectId);
    navigate(`/projeto/${nextProjectId}`);
  };

  return (
    <header className="bg-white border-b px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="md:hidden" onClick={toggleSidebar}>
            <Menu className="size-5" />
          </Button>
          {showBackButton && (
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-md transition-colors">
              <ArrowLeft className="size-5 text-gray-600" />
            </button>
          )}
          {projectName && (
            <h1 className="text-2xl font-semibold text-gray-900">{projectName}</h1>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="w-[min(520px,calc(100vw-2rem))] rounded-md border border-blue-200 bg-blue-50 px-3 py-2 shadow-sm">
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
              <FolderKanban className="size-3" />
              Projeto ativo
            </div>
            <Select value={activeProjectId ?? undefined} onValueChange={handleProjectChange}>
              <SelectTrigger className="h-11 border-blue-200 bg-white px-3 text-base font-semibold text-blue-950 shadow-none [&>span]:truncate">
                <SelectValue placeholder={projectsLoading ? "A carregar projeto..." : "Escolher projeto ativo"} />
              </SelectTrigger>
              <SelectContent
                sideOffset={12}
                className="z-[9999] max-h-80 w-[var(--radix-select-trigger-width)] border-blue-200 bg-white shadow-2xl"
              >
                {projects.map((project) => (
                  <SelectItem
                    key={project.id}
                    value={project.id}
                    className="min-h-11 bg-white py-2.5 pr-10 text-base text-slate-900 focus:bg-blue-50 focus:text-blue-950 data-[state=checked]:bg-blue-50"
                  >
                    <span className="block max-w-[440px] truncate">{project.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeProject && (
              <div className="sr-only">
                Está a trabalhar em: <span className="font-semibold">{activeProject.name}</span>
              </div>
            )}
          </div>

          {/* Global search */}
          <div ref={searchRef} className="relative">
            {searchOpen ? (
              <div className="flex items-center gap-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                  <Input
                    autoFocus
                    placeholder="Pesquisar projetos, tarefas, parceiros..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-8 w-72 h-8 text-sm"
                  />
                  {searching && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">…</span>}
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setSearchOpen(false); setQuery(""); setResults(null); }}>
                  <X className="size-3.5" />
                </Button>

                {query.length >= 2 && (
                  <div className="absolute right-0 top-10 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-auto">
                    {!hasResults && !searching ? (
                      <div className="p-3 text-sm text-gray-400 text-center">Sem resultados para "{query}"</div>
                    ) : (
                      <div className="py-1">
                        {results && results.projetos.length > 0 && (
                          <div>
                            <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Projetos</div>
                            {results.projetos.map((p) => (
                              <button key={p.id} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
                                onClick={() => { navigate(`/projeto/${p.id}`); setSearchOpen(false); setQuery(""); }}>
                                <span className="text-sm text-gray-900">{p.nome}</span>
                                <span className="text-xs text-gray-400">{p.estado}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {results && results.tarefas.length > 0 && (
                          <div>
                            <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tarefas</div>
                            {results.tarefas.map((t) => (
                              <button key={t.id} className="w-full text-left px-3 py-2 hover:bg-gray-50"
                                onClick={() => { navigate(`/projeto/${t.projeto_id}`); setSearchOpen(false); setQuery(""); }}>
                                <div className="text-sm text-gray-900">{t.nome}</div>
                                <div className="text-xs text-gray-400">{t.projeto_nome}</div>
                              </button>
                            ))}
                          </div>
                        )}
                        {results && results.parceiros.length > 0 && (
                          <div>
                            <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Parceiros</div>
                            {results.parceiros.map((p) => (
                              <button key={p.id} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
                                onClick={() => { navigate("/parceiros"); setSearchOpen(false); setQuery(""); }}>
                                <span className="text-sm text-gray-900">{p.nome}</span>
                                <span className="text-xs text-gray-400">{p.tipo}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setSearchOpen(true)} title="Pesquisar (Ctrl+K)">
                <Search className="size-4" />
              </Button>
            )}
          </div>

          <NotificationBell />

          {user && (
            <div className="flex items-center gap-2">
              <Link to="/perfil" className="text-sm text-gray-600 hidden sm:block hover:text-gray-900 hover:underline" title="O meu perfil">
                {user.nome}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
