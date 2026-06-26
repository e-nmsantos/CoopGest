import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/apiClient";
import { useAuth } from "./AuthContext";

interface ApiProject {
  id: number;
  nome: string;
  estado?: string;
}

export interface ProjectScopeSummary {
  id: string;
  name: string;
  status: string;
}

interface ProjectContextValue {
  projects: ProjectScopeSummary[];
  projectsLoading: boolean;
  activeProjectId: string | null;
  activeProject: ProjectScopeSummary | null;
  setActiveProjectId: (projectId: string | null) => void;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

const STORAGE_KEY = "coopgest.activeProjectId";

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectScopeSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return window.localStorage.getItem(STORAGE_KEY);
  });

  const refreshProjects = async () => {
    if (!user) {
      setProjects([]);
      return;
    }

    setProjectsLoading(true);
    try {
      const data = await apiGet<ApiProject[]>("/api/projects");
      setProjects(
        data.map((project) => ({
          id: String(project.id),
          name: project.nome,
          status: project.estado || "",
        }))
      );
    } finally {
      setProjectsLoading(false);
    }
  };

  useEffect(() => {
    void refreshProjects();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setActiveProjectIdState(null);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      return;
    }

    if (projects.length === 0) {
      setActiveProjectIdState(null);
      return;
    }

    const hasActiveProject = activeProjectId && projects.some((project) => project.id === activeProjectId);
    if (hasActiveProject) {
      return;
    }

    setActiveProjectIdState(projects[0].id);
  }, [activeProjectId, projects, user]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (activeProjectId) {
      window.localStorage.setItem(STORAGE_KEY, activeProjectId);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [activeProjectId]);

  const setActiveProjectId = (projectId: string | null) => {
    setActiveProjectIdState(projectId);
  };

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [activeProjectId, projects]
  );

  const value = useMemo(
    () => ({
      projects,
      projectsLoading,
      activeProjectId,
      activeProject,
      setActiveProjectId,
      refreshProjects,
    }),
    [projects, projectsLoading, activeProjectId, activeProject]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjectContext must be used within a ProjectProvider");
  }
  return context;
}
