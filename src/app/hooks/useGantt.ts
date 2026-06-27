import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useProjectContext } from "../contexts/ProjectContext";
import { apiGet } from "../lib/apiClient";
import { toast } from "sonner";
import {
  GanttTask,
  GanttMilestone,
  GanttRow,
  PX_PER_DAY_OPTIONS,
  DEFAULT_PX_IDX,
  ROW_HEIGHT,
  parseDate,
  addDays,
  diffDays,
} from "../components/gantt/gantt.types";

export function useGantt() {
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
      void fetchData(Number(activeProjectId));
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

  const allRows: GanttRow[] = [
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

  return {
    activeProjectId,
    activeProject,
    loading,
    pxIdx,
    setPxIdx,
    showMilestones,
    setShowMilestones,
    scrollRef,
    pxPerDay,
    minDate,
    maxDate,
    tasksWithDates,
    tasksWithoutDates,
    msWithDates,
    svgWidth,
    svgHeight,
    monthHeaders,
    todayX,
    allRows,
    scrollToToday,
  };
}
