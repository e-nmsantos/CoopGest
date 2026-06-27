import { GanttTask, statusColor } from "./gantt.types";

interface GanttTasksWithoutDatesProps {
  tasks: GanttTask[];
}

export function GanttTasksWithoutDates({ tasks }: GanttTasksWithoutDatesProps) {
  if (tasks.length === 0) return null;

  return (
    <div className="mt-4 flex-shrink-0">
      <h3 className="text-sm font-semibold text-slate-600 mb-2">
        Tarefas sem datas ({tasks.length})
      </h3>
      <div className="flex flex-wrap gap-2">
        {tasks.map((t) => (
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
  );
}
