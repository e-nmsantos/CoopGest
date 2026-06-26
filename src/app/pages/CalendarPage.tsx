import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Header } from "../components/layout/Header";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { useProjectContext } from "../contexts/ProjectContext";
import { apiGet } from "../lib/apiClient";

interface CalendarEvent {
  id: number;
  nome: string;
  data: string;
  estado: string;
  projeto_id: number;
  projeto_nome: string;
  tipo: "milestone" | "tarefa";
  overdue: boolean;
  prioridade?: string;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function generateIcal(milestones: CalendarEvent[], tarefas: CalendarEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CoopGest//CoopGest//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  [...milestones, ...tarefas].forEach(e => {
    const dateStr = (e.data || "").substring(0, 10).replace(/-/g, "");
    if (!dateStr) return;
    lines.push("BEGIN:VEVENT");
    lines.push(`DTSTART;VALUE=DATE:${dateStr}`);
    lines.push(`DTEND;VALUE=DATE:${dateStr}`);
    lines.push(`SUMMARY:${e.nome.replace(/,/g, "\\,")} (${e.projeto_nome})`);
    lines.push(`DESCRIPTION:${e.tipo === "milestone" ? "Milestone" : "Tarefa"} - ${e.projeto_nome}`);
    lines.push(`UID:${e.tipo}-${e.id}@coopgest`);
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function CalendarPage() {
  const navigate = useNavigate();
  const { activeProject, activeProjectId } = useProjectContext();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-based
  const [milestones, setMilestones] = useState<CalendarEvent[]>([]);
  const [tarefas, setTarefas] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  useEffect(() => {
    if (!activeProjectId) {
      setMilestones([]);
      setTarefas([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    apiGet<{ milestones?: CalendarEvent[]; tarefas?: CalendarEvent[] }>(`/api/calendar?month=${monthStr}&projeto_id=${encodeURIComponent(activeProjectId)}`)
      .then((data) => {
        setMilestones(data.milestones || []);
        setTarefas(data.tarefas || []);
      })
      .catch(() => toast.error('Erro ao carregar calendário'))
      .finally(() => setLoading(false));
  }, [activeProjectId, monthStr]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Merge events by date
  const eventsByDate: Record<string, CalendarEvent[]> = {};
  [...milestones, ...tarefas].forEach((e) => {
    const d = e.data?.substring(0, 10);
    if (!d) return;
    if (!eventsByDate[d]) eventsByDate[d] = [];
    eventsByDate[d].push(e);
  });

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const totalEvents = milestones.length + tarefas.length;

  const exportIcal = () => {
    const content = generateIcal(milestones, tarefas);
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calendario-${activeProjectId || "sem-projeto"}-${monthStr}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!activeProjectId) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
        <Header showBackButton />
        <div className="flex-1 min-h-0 overflow-auto p-6">
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            Escolha um projeto ativo no topo para abrir o calendário isolado desse projeto.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <Header showBackButton />
      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Calendário</h1>
            <p className="text-gray-600 mt-1">Milestones e prazos de {activeProject?.name || "projeto ativo"}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportIcal} title="Exportar para calendário (.ics)">
              <Download className="size-4 mr-1" />
              Exportar .ics
            </Button>
            <Button variant="outline" size="sm" onClick={prevMonth}><ChevronLeft className="size-4" /></Button>
            <span className="font-semibold text-gray-900 w-40 text-center">{MONTHS[month - 1]} {year}</span>
            <Button variant="outline" size="sm" onClick={nextMonth}><ChevronRight className="size-4" /></Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mb-4 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
            {milestones.length} milestone{milestones.length !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" />
            {tarefas.length} tarefa{tarefas.length !== 1 ? 's' : ''} com prazo
          </span>
          {totalEvents === 0 && !loading && (
            <span className="text-gray-400">Sem eventos neste mês</span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">A carregar...</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-gray-200">
              {WEEKDAYS.map((d) => (
                <div key={d} className="p-3 text-xs font-semibold text-gray-500 text-center">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                if (!day) {
                  return <div key={`empty-${i}`} className="min-h-[90px] border-b border-r border-gray-100 bg-gray-50/50" />;
                }
                const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = dayStr === todayStr;
                const dayEvents = eventsByDate[dayStr] || [];

                return (
                  <div
                    key={day}
                    className={`min-h-[90px] border-b border-r border-gray-100 p-1.5 ${isToday ? 'bg-blue-50' : ''}`}
                  >
                    <div className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full
                      ${isToday ? 'bg-blue-500 text-white' : 'text-gray-700'}`}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((e) => (
                        <div
                          key={`${e.tipo}-${e.id}`}
                          className={`text-xs px-1.5 py-0.5 rounded cursor-pointer truncate leading-4 ${
                            e.overdue
                              ? 'bg-red-100 text-red-700'
                              : e.tipo === 'milestone'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                          title={`${e.nome} — ${e.projeto_nome}`}
                          onClick={() => navigate(`/projeto/${e.projeto_id}`)}
                        >
                          {e.tipo === 'milestone' ? '🔷' : '▪'} {e.nome}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-400 px-1">+{dayEvents.length - 3} mais</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-6 mt-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 inline-block" /> Milestone</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 inline-block" /> Tarefa com prazo</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block" /> Em atraso</span>
        </div>
      </div>
    </div>
  );
}
