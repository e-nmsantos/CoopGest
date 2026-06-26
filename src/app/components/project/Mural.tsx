import { Card } from "../ui/card";
import { Clock, FileEdit, MessageSquare, Users } from "lucide-react";

interface Activity {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  icon: typeof FileEdit;
}

const activities: Activity[] = [
  {
    id: "1",
    user: "João",
    action: "editou:",
    target: "Guia Solo v2",
    time: "10 min atrás",
    icon: FileEdit,
  },
  {
    id: "2",
    user: "Maria",
    action: "comentou em:",
    target: "Plano de Irrigação",
    time: "1 hora atrás",
    icon: MessageSquare,
  },
  {
    id: "3",
    user: "Pedro",
    action: "adicionou:",
    target: "3 novos membros",
    time: "2 horas atrás",
    icon: Users,
  },
];

export function Mural() {
  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const Icon = activity.icon;
        return (
          <Card key={activity.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Icon className="size-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-semibold">{activity.user}</span>{" "}
                  <span className="text-gray-600">{activity.action}</span>
                </p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {activity.target}
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                  <Clock className="size-3" />
                  <span>{activity.time}</span>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
