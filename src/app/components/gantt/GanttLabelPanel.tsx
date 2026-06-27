import { Flag } from "lucide-react";
import { GanttRow, ROW_HEIGHT, LABEL_WIDTH, HEADER_HEIGHT, statusColor, milestoneColor } from "./gantt.types";

interface GanttLabelPanelProps {
  allRows: GanttRow[];
}

export function GanttLabelPanel({ allRows }: GanttLabelPanelProps) {
  return (
    <div
      className="flex-shrink-0 bg-white border-r border-slate-200 overflow-hidden"
      style={{ width: LABEL_WIDTH }}
    >
      <div
        className="border-b border-slate-200 bg-slate-50 flex items-center px-3"
        style={{ height: HEADER_HEIGHT }}
      >
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</span>
      </div>
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
  );
}
