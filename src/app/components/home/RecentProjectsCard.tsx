import { FolderKanban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import type { Project } from "./home.types";

interface RecentProjectsCardProps {
  projects: Project[];
}

export function RecentProjectsCard({ projects }: RecentProjectsCardProps) {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Projetos Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        {projects.slice(0, 5).map((project) => (
          <div key={project.id} className="flex items-center mb-4">
            <div className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-lg bg-primary/10">
              <FolderKanban className="h-5 w-5 text-primary" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium leading-none">{project.name}</p>
              <p className="text-sm text-muted-foreground">{project.status}</p>
            </div>
            <div className="ml-auto font-medium">{project.progress}%</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
