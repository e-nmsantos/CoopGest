import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useProjectContext } from "../contexts/ProjectContext";
import { apiGet } from "../lib/apiClient";
import { toast } from "sonner";
import { ZoomIn, ZoomOut, CalendarDays, Download, Flag } from "lucide-react";

interface GanttTask {
  id: number;
  title: string;
  status: string;
  priority: string;
  data_inicio?: string;
  data_fim?: string;
  responsavel?: string;
}

interface GanttMilestone {
  id: number;
  titulo: string;
  estado: string;
  data_prevista?: string;
}

const PX_PER_DAY_OPTIONS = [16, 20, 28, 36, 48];
const DEFAULT_PX_IDX = 2; // 28
const ROW_HEIGHT = 36;
const LABEL_WIDTH = 200;
const HEADER_HEIGHT = 48;

function parseDate(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function statusColor(status: string): string {
  const s = status?.toLowerCase();
  if (s === "done" || s === "concluída" || s === "concluida") return "#22c55e";
  if (s === "in_progress" || s === "em progresso") return "#3b82f6";
  if (s === "blocked" || s === "bloqueada") return "#ef4444";
  return "#94a3b8"; // todo / default gray
}

function milestoneColor(estado: string): string {
  const s = estado?.toLowerCase();
  if (s === "concluído" || s === "concluido") return "#22c55e";
  return "#6366f1";
}

export function GanttPage() {
  const { activeProjectId, activeProject } = useProjectContext();
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [milestones, setMilestones] = useState<GanttMilestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [pxIdx, setPxIdx] = useState(DEFAULT_PX_IDX);
  const [showMilestones, setShowMilestones] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const pxPerDay = PX_PER_DAY_OPTIONS[pxIdx];

  const fetchData = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const [t, m] = await Promise.all([
        apiGet<GanttTask[]>(`/api/projects/${id}/tasks?limit=200`),
        apiGet<GanttMilestone[]>(`/api/projects/${id}/milestones`),
      ]);
      setTasks(Array.isArray(t) ? t : []);
      setMilestones(Array.isArray(m) ? m : []);
    } catch {
      toast.error("Erro ao carregar dados do Gantt");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeProjectId) {
      void fetchData(activeProjectId);
    } else {
      setTasks([]);
      setMilestones([]);
    }
  }, [activeProjectId, fetchData]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const { minDate, maxDate, tasksWithDates, tasksWithoutDates, msWithDates } = useMemo(() => {
    const tasksWithDates: GanttTask[] = [];
    const tasksWithoutDates: GanttTask[] = [];

    for (const t of tasks) {
      if (t.data_fim || t.data_inicio) {
        tasksWithDates.push(t);
      } else {
        tasksWithoutDates.push(t);
      }
    }

    const msWithDates = showMilestones
      ? milestones.filter((m) => m.data_prevista)
      : [];

    let min = addDays(today, -30);
    let max = addDays(today, 60);

    for (const t of tasksWithDates) {
      const start = parseDate(t.data_inicio) ?? parseDate(t.data_fim);
      const end = parseDate(t.data_fim) ?? parseDate(t.data_inicio);
      if (start && start < min) min = addDays(start, -7);
      if (end && end > max) max = addDays(end, 7);
    }

    for (const m of msWithDates) {
      const d = parseDate(m.data_prevista);
      if (d && d < min) min = addDays(d, -7);
      if (d && d > max) max = addDays(d, 7);
    }

    return { minDate: min, maxDate: max, tasksWithDates, tasksWithoutDates, msWithDates };
  }, [tasks, milestones, today, showMilestones]);

  const totalDays = diffDays(minDate, maxDate);
  const svgWidth = totalDays * pxPerDay;

  // Generate month headers
  const monthHeaders = useMemo(() => {
    const headers: { label: string; x: number; width: number }[] = [];
    const cur = new Date(minDate);
    cur.setDate(1);
    while (cur <= maxDate) {
      const monthStart = new Date(cur);
      const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
      const x = Math.max(0, diffDays(minDate, monthStart) * pxPerDay);
      const endX = Math.min(svgWidth, (diffDays(minDate, monthEnd) + 1) * pxPerDay);
      headers.push({
        label: cur.toLocaleDateString("pt-PT", { month: "short", year: "2-digit" }),
        x,
        width: endX - x,
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return headers;
  }, [minDate, maxDate, pxPerDay, svgWidth]);

  const todayX = diffDays(minDate, today) * pxPerDay;

  const allRows: Array<{ type: "task"; item: GanttTask } | { type: "milestone"; item: GanttMilestone }> = [
    ...tasksWithDates.map((t) => ({ type: "task" as const, item: t })),
    ...(showMilestones ? msWithDates.map((m) => ({ type: "milestone" as const, item: m })) : []),
  ];

  const svgHeight = Math.max(60, allRows.length * ROW_HEIGHT + 8);

  function scrollToToday() {
    if (scrollRef.current) {
      const offset = todayX - 200;
      scrollRef.current.scrollLeft = Math.max(0, offset);
    }
  }

  if (!activeProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <CalendarDays className="size-12 mb-3 opacity-40" />
        <p className="text-lg font-medium">Nenhum projeto selecionado</p>
        <p className="text-sm mt-1">Selecione um projeto para ver o Gantt</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gantt</h1>
          {activeProject && (
            <p className="text-sm text-slate-500 mt-0.5">{activeProject.nome}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMilestones((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors ${
              showMilestones
                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Flag className="size-4" />
            Marcos
          </button>
          <button
            onClick={() => setPxIdx((i) => Math.max(0, i - 1))}
            disabled={pxIdx === 0}
            className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            title="Menos zoom"
          >
            <ZoomOut className="size-4" />
          </button>
          <button
            onClick={() => setPxIdx((i) => Math.min(PX_PER_DAY_OPTIONS.length - 1, i + 1))}
            disabled={pxIdx === PX_PER_DAY_OPTIONS.length - 1}
            className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            title="Mais zoom"
          >
            <ZoomIn className="size-4" />
          </button>
          <button
            onClick={scrollToToday}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm"
          >
            <CalendarDays className="size-4" />
            Hoje
          </button>
          <a
            href={`/api/projects/${activeProjectId}/export/excel`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-600 text-white text-sm hover:bg-green-700 transition-colors"
          >
            <Download className="size-4" />
            Exportar Excel
          </a>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32 text-slate-500">
          <div className="animate-spin size-6 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
          A carregar...
        </div>
      )}

      {!loading && allRows.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-slate-500 border border-dashed border-slate-200 rounded-lg">
          <CalendarDays className="size-10 mb-2 opacity-40" />
          <p className="font-medium">Sem tarefas ou marcos com datas</p>
          <p className="text-sm mt-1">Adicione datas às tarefas para visualizá-las aqui</p>
        </div>
      )}

      {!loading && allRows.length > 0 && (
        <div className="flex border border-slate-200 rounded-lg overflow-hidden flex-1 min-h-0">
          {/* Left label panel */}
          <div
            className="flex-shrink-0 bg-white border-r border-slate-200 overflow-hidden"
            style={{ width: LABEL_WIDTH }}
          >
            {/* Header spacer */}
            <div
              className="border-b border-slate-200 bg-slate-50 flex items-center px-3"
              style={{ height: HEADER_HEIGHT }}
            >
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</span>
            </div>
            {/* Labels */}
            <div className="overflow-hidden">
              {allRows.map((row, i) => (
                <div
                  key={`${row.type}-${row.item.id}`}
                  className={`flex items-center px-3 border-b border-slate-100 ${
                    i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                  }`}
                  style={{ height: ROW_HEIGHT }}
                >
                  {row.type === "task" ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="size-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: statusColor(row.item.status) }}
                      />
                      <span className="text-xs text-slate-700 truncate" title={row.item.title}>
                        {row.item.title}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      <Flag
                        className="size-3 flex-shrink-0"
                        style={{ color: milestoneColor(row.item.estado) }}
                      />
                      <span className="text-xs text-slate-600 truncate italic" title={row.item.titulo}>
                        {row.item.titulo}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right scrollable SVG panel */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden" ref={scrollRef}>
            <svg
              width={svgWidth}
              height={HEADER_HEIGHT + svgHeight}
              style={{ display: "block" }}
            >
              {/* Background stripes */}
              {allRows.map((_, i) => (
                <rect
                  key={i}
                  x={0}
                  y={HEADER_HEIGHT + i * ROW_HEIGHT}
                  width={svgWidth}
                  height={ROW_HEIGHT}
                  fill={i % 2 === 0 ? "#ffffff" : "#f8fafc"}
                />
              ))}

              {/* Month header background */}
              <rect x={0} y={0} width={svgWidth} height={HEADER_HEIGHT} fill="#f1f5f9" />

              {/* Month labels & dividers */}
              {monthHeaders.map((h, i) => (
                <g key={i}>
                  <line x1={h.x} y1={0} x2={h.x} y2={HEADER_HEIGHT + svgHeight} stroke="#e2e8f0" strokeWidth={1} />
                  <text
                    x={h.x + h.width / 2}
                    y={HEADER_HEIGHT / 2 + 5}
                    textAnchor="middle"
                    fontSize={11}
                    fill="#64748b"
                    fontWeight="600"
                  >
                    {h.label}
                  </text>
                </g>
              ))}

              {/* Row separator lines */}
              {allRows.map((_, i) => (
                <line
                  key={i}
                  x1={0}
                  y1={HEADER_HEIGHT + (i + 1) * ROW_HEIGHT}
                  x2={svgWidth}
                  y2={HEADER_HEIGHT + (i + 1) * ROW_HEIGHT}
                  stroke="#f1f5f9"
                  strokeWidth={1}
                />
              ))}

              {/* Task bars & milestone diamonds */}
              {allRows.map((row, i) => {
                const y = HEADER_HEIGHT + i * ROW_HEIGHT;
                const cy = y + ROW_HEIGHT / 2;

                if (row.type === "task") {
                  const task = row.item;
                  const endDate = parseDate(task.data_fim);
                  if (!endDate) return null;
                  const startDate = parseDate(task.data_inicio) ?? addDays(endDate, -7);
                  const x1 = Math.max(0, diffDays(minDate, startDate) * pxPerDay);
                  const x2 = diffDays(minDate, endDate) * pxPerDay;
                  const barW = Math.max(4, x2 - x1);
                  const color = statusColor(task.status);

                  return (
                    <g key={`task-${task.id}`}>
                      <rect
                        x={x1}
                        y={cy - ROW_HEIGHT * 0.3}
                        width={barW}
                        height={ROW_HEIGHT * 0.6}
                        rx={3}
                        fill={color}
                        opacity={0.85}
                      />
                      {barW > 40 && task.responsavel && (
                        <text
                          x={x1 + 4}
                          y={cy + 4}
                          fontSize={9}
                          fill="white"
                          fontWeight="500"
                        >
                          {task.responsavel.split(" ")[0]}
                        </text>
                      )}
                    </g>
                  );
                } else {
                  const ms = row.item;
                  const d = parseDate(ms.data_prevista);
                  if (!d) return null;
                  const cx = diffDays(minDate, d) * pxPerDay;
                  const size = 8;
                  const color = milestoneColor(ms.estado);

                  return (
                    <g key={`ms-${ms.id}`}>
                      <polygon
                        points={`${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`}
                        fill={color}
                        opacity={0.9}
                      />
                    </g>
                  );
                }
              })}

              {/* Today line */}
              {todayX >= 0 && todayX <= svgWidth && (
                <g>
                  <line
                    x1={todayX}
                    y1={0}
                    x2={todayX}
                    y2={HEADER_HEIGHT + svgHeight}
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                  />
                  <text x={todayX + 3} y={14} fontSize={9} fill="#ef4444" fontWeight="600">
                    Hoje
                  </text>
                </g>
              )}
            </svg>
          </div>
        </div>
      )}

      {/* Tasks without dates */}
      {!loading && tasksWithoutDates.length > 0 && (
        <div className="mt-4 flex-shrink-0">
          <h3 className="text-sm font-semibold text-slate-600 mb-2">
            Tarefas sem datas ({tasksWithoutDates.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {tasksWithoutDates.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs"
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: statusColor(t.status) }}
                />
                {t.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

