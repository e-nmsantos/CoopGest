import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { PROJECT_STATUS_META } from "./home.constants";
import type { ProjectStatusItem } from "./home.types";

interface ProjectsOverviewCardProps {
  projectStatusData: ProjectStatusItem[];
  totalProjects: number;
  activeProjects: number;
}

export function ProjectsOverviewCard({ projectStatusData, totalProjects, activeProjects }: ProjectsOverviewCardProps) {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Visão Geral dos Projetos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-3xl font-bold text-foreground">{totalProjects}</div>
            <p className="text-sm text-muted-foreground">
              {activeProjects} em curso, distribuídos por estado do projeto.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Cada barra representa o número de projetos nesse estado.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectStatusData} margin={{ top: 18, right: 12, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                  cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
                  formatter={(value, _name, item) => [
                    `${value} projeto${Number(value) === 1 ? "" : "s"} (${item.payload.percentage}%)`,
                    "Total",
                  ]}
                  labelFormatter={(label) => `${label} - ${PROJECT_STATUS_META[label]?.label ?? "Estado"}`}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {projectStatusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                  <LabelList dataKey="value" position="top" fill="#334155" fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {projectStatusData.map((item) => (
              <div key={item.name} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.percentage}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
