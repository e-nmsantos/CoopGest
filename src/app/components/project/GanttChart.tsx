interface DbMilestone {
  id: number;
  nome: string;
  data_prevista?: string;
  data_concluida?: string;
  estado?: string;
}

interface DbTask {
  id: number;
  nome: string;
  data_inicio?: string;
  data_fim?: string;
  estado?: string;
  prioridade?: string;
}

interface GanttChartProps {
  milestones: DbMilestone[];
  tasks: DbTask[];
}

function parseDate(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function GanttChart({ milestones, tasks }: GanttChartProps) {
  // Collect all dates to determine range
  const allDates: Date[] = [];

  milestones.forEach((m) => {
    const d = parseDate(m.data_prevista);
    if (d) allDates.push(d);
  });
  tasks.forEach((t) => {
    const s = parseDate(t.data_inicio);
    const e = parseDate(t.data_fim);
    if (s) allDates.push(s);
    if (e) allDates.push(e);
  });

  if (allDates.length < 2) {
    return (
      <div className="flex items-center justify-center py-16 text-center text-gray-400">
        <div>
          <div className="text-4xl mb-3">📅</div>
          <p className="text-sm">Adicione datas às tarefas e milestones para ver o Gantt</p>
        </div>
      </div>
    );
  }

  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
  // Add some padding
  minDate.setDate(1);
  maxDate.setMonth(maxDate.getMonth() + 1);
  maxDate.setDate(0);

  const totalMs = maxDate.getTime() - minDate.getTime();
  if (totalMs <= 0) return null;

  const toPercent = (date: Date) =>
    Math.max(0, Math.min(100, ((date.getTime() - minDate.getTime()) / totalMs) * 100));

  // Build month headers
  const months: { label: string; left: number; width: number }[] = [];
  const cur = new Date(minDate);
  while (cur <= maxDate) {
    const monthStart = new Date(cur.getFullYear(), cur.getMonth(), 1);
    const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
    const left = toPercent(monthStart > minDate ? monthStart : minDate);
    const right = toPercent(monthEnd < maxDate ? monthEnd : maxDate);
    months.push({ label: `${MONTH_NAMES[cur.getMonth()]} ${cur.getFullYear()}`, left, width: right - left });
    cur.setMonth(cur.getMonth() + 1);
  }

  const rows: { id: string; label: string; type: 'milestone' | 'task'; left: number; width: number; color: string; done: boolean }[] = [];

  milestones.forEach((m) => {
    const d = parseDate(m.data_prevista);
    if (!d) return;
    const left = toPercent(d);
    rows.push({
      id: `m-${m.id}`,
      label: m.nome,
      type: 'milestone',
      left: Math.max(0, left - 1),
      width: 2,
      color: m.estado === 'Concluído' ? 'bg-green-500' : 'bg-blue-500',
      done: m.estado === 'Concluído',
    });
  });

  tasks.forEach((t) => {
    const start = parseDate(t.data_inicio) || parseDate(t.data_fim);
    const end = parseDate(t.data_fim) || parseDate(t.data_inicio);
    if (!start || !end) return;
    const left = toPercent(start < end ? start : end);
    const right = toPercent(start < end ? end : start);
    const width = Math.max(right - left, 1);
    rows.push({
      id: `t-${t.id}`,
      label: t.nome,
      type: 'task',
      left,
      width,
      color: t.estado === 'Concluída' ? 'bg-green-400' : t.estado === 'Em curso' ? 'bg-yellow-400' : 'bg-gray-300',
      done: t.estado === 'Concluída',
    });
  });

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 700 }}>
        {/* Month header */}
        <div className="relative h-8 border-b border-gray-200 mb-1 flex">
          {months.map((m, i) => (
            <div
              key={i}
              className="absolute text-xs text-gray-500 font-medium border-l border-gray-200 pl-1 truncate"
              style={{ left: `${m.left}%`, width: `${m.width}%` }}
            >
              {m.label}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className="space-y-1">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-2 h-8">
              <div className="w-40 shrink-0 text-xs text-gray-700 truncate" title={row.label}>
                <span className={`mr-1 ${row.type === 'milestone' ? 'text-blue-500' : 'text-gray-400'}`}>
                  {row.type === 'milestone' ? '🔷' : '▪'}
                </span>
                {row.label}
              </div>
              <div className="flex-1 relative h-5 bg-gray-50 rounded">
                <div
                  className={`absolute h-full rounded ${row.color} ${row.done ? 'opacity-60' : 'opacity-90'}`}
                  style={{ left: `${row.left}%`, width: `${row.width}%` }}
                  title={row.label}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500 inline-block" /> Milestone pendente</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Concluído</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400 inline-block" /> Em curso</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-300 inline-block" /> Por fazer</span>
        </div>
      </div>
    </div>
  );
}
