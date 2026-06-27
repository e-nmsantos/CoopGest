import { ZoomIn, ZoomOut, CalendarDays, Download, Flag } from "lucide-react";
import { PX_PER_DAY_OPTIONS } from "./gantt.types";

interface GanttHeaderProps {
  projectName?: string;
  activeProjectId: number | string;
  pxIdx: number;
  setPxIdx: (fn: (i: number) => number) => void;
  showMilestones: boolean;
  setShowMilestones: (fn: (v: boolean) => boolean) => void;
  scrollToToday: () => void;
}

export function GanttHeader({
  projectName,
  activeProjectId,
  pxIdx,
  setPxIdx,
  showMilestones,
  setShowMilestones,
  scrollToToday,
}: GanttHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4 flex-shrink-0">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Gantt</h1>
        {projectName && (
          <p className="text-sm text-slate-500 mt-0.5">{projectName}</p>
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
  );
}
