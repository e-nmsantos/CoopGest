import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Calendar, CheckCircle2, FileText, Users, TrendingUp, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface TimelineEvent {
  id: string;
  type: "milestone" | "decision" | "task" | "meeting" | "budget" | "member";
  title: string;
  description?: string;
  date: Date;
  user: string;
  metadata?: {
    impact?: string;
    votesFor?: number;
    votesAgainst?: number;
    amount?: number;
  };
}

interface ProjectTimelineProps {
  events: TimelineEvent[];
}

const eventIcons = {
  milestone: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100" },
  decision: { icon: FileText, color: "text-purple-600", bg: "bg-purple-100" },
  task: { icon: CheckCircle2, color: "text-blue-600", bg: "bg-blue-100" },
  meeting: { icon: Users, color: "text-orange-600", bg: "bg-orange-100" },
  budget: { icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-100" },
  member: { icon: Users, color: "text-pink-600", bg: "bg-pink-100" },
};

const eventLabels = {
  milestone: "Milestone",
  decision: "Decisão",
  task: "Tarefa",
  meeting: "Reunião",
  budget: "Orçamento",
  member: "Equipa",
};

export function ProjectTimeline({ events }: ProjectTimelineProps) {
  const sortedEvents = [...events].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="relative">
      {/* Timeline Line */}
      <div className="absolute left-[29px] top-8 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-6">
        {sortedEvents.map((event, index) => {
          const config = eventIcons[event.type];
          const Icon = config.icon;

          return (
            <div key={event.id} className="relative pl-16">
              {/* Timeline Dot */}
              <div className={`absolute left-0 top-2 ${config.bg} p-3 rounded-full`}>
                <Icon className={`size-5 ${config.color}`} />
              </div>

              <Card className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{eventLabels[event.type]}</Badge>
                      <span className="text-xs text-gray-500">
                        {format(event.date, "d 'de' MMMM 'às' HH:mm", { locale: pt })}
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900">{event.title}</h4>
                  </div>
                </div>

                {event.description && (
                  <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                )}

                {/* Event Metadata */}
                {event.metadata && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    {event.metadata.impact && (
                      <div className="bg-green-50 p-2 rounded text-sm">
                        <span className="font-medium text-green-800">Impacto: </span>
                        <span className="text-green-700">{event.metadata.impact}</span>
                      </div>
                    )}
                    {event.metadata.votesFor !== undefined && (
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-green-600">
                          ✓ {event.metadata.votesFor} votos a favor
                        </span>
                        <span className="text-red-600">
                          ✗ {event.metadata.votesAgainst} contra
                        </span>
                      </div>
                    )}
                    {event.metadata.amount !== undefined && (
                      <div className="text-sm font-medium text-gray-700">
                        Valor: {event.metadata.amount.toFixed(2)} €
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-2 text-xs text-gray-500">
                  Por {event.user}
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      {sortedEvents.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Sem eventos registados</p>
        </Card>
      )}
    </div>
  );
}
