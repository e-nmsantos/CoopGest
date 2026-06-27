export interface GanttTask {
  id: number;
  title: string;
  status: string;
  priority: string;
  data_inicio?: string;
  data_fim?: string;
  responsavel?: string;
}

export interface GanttMilestone {
  id: number;
  titulo: string;
  estado: string;
  data_prevista?: string;
}

export type GanttRow =
  | { type: "task"; item: GanttTask }
  | { type: "milestone"; item: GanttMilestone };

export const PX_PER_DAY_OPTIONS = [16, 20, 28, 36, 48];
export const DEFAULT_PX_IDX = 2;
export const ROW_HEIGHT = 36;
export const LABEL_WIDTH = 200;
export const HEADER_HEIGHT = 48;

export function parseDate(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function statusColor(status: string): string {
  const s = status?.toLowerCase();
  if (s === "done" || s === "concluída" || s === "concluida") return "#22c55e";
  if (s === "in_progress" || s === "em progresso") return "#3b82f6";
  if (s === "blocked" || s === "bloqueada") return "#ef4444";
  return "#94a3b8";
}

export function milestoneColor(estado: string): string {
  const s = estado?.toLowerCase();
  if (s === "concluído" || s === "concluido") return "#22c55e";
  return "#6366f1";
}
