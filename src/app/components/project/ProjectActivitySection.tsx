import { useEffect, useState } from "react";
import type { ElementType } from "react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { Activity, AlertTriangle, CheckCircle2, Clock, MessageSquare, Shield, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { apiGet } from "../../lib/apiClient";

interface ActivityEntry {
  id: number;
  user_nome: string;
  acao: string;
  entidade: string;
  entidade_id?: number;
  detalhes?: string;
  criado_em: string;
}

const entityIcons: Record<string, ElementType> = {
  tarefa: CheckCircle2,
  milestone: Clock,
  comentario: MessageSquare,
  chat: MessageSquare,
  risco: AlertTriangle,
  equipa: UserPlus,
  projeto: Activity,
  horas: Clock,
  orcamento: Shield,
};

const actionStyles: Record<string, string> = {
  criado: "bg-green-100 text-green-700 border-green-200",
  criada: "bg-green-100 text-green-700 border-green-200",
  atualizada: "bg-blue-100 text-blue-700 border-blue-200",
  atualizado: "bg-blue-100 text-blue-700 border-blue-200",
  eliminado: "bg-red-100 text-red-700 border-red-200",
  eliminada: "bg-red-100 text-red-700 border-red-200",
  comentou: "bg-indigo-100 text-indigo-700 border-indigo-200",
  enviou_mensagem: "bg-indigo-100 text-indigo-700 border-indigo-200",
  adicionou_membro: "bg-purple-100 text-purple-700 border-purple-200",
  removeu_membro: "bg-orange-100 text-orange-700 border-orange-200",
  registou_horas: "bg-sky-100 text-sky-700 border-sky-200",
};

function styleFor(action: string) {
  return actionStyles[action] || "bg-gray-100 text-gray-700 border-gray-200";
}

export function ProjectActivitySection({ projectId }: { projectId: string }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActivity = () => {
    setLoading(true);
    apiGet<unknown>(`/api/projects/${projectId}/activity?limit=120`)
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Erro ao carregar atividade"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (loading) {
    return <div className="text-center py-12 text-gray-400">A carregar atividade...</div>;
  }

  if (entries.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Activity className="size-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Sem atividade registada</p>
        <p className="text-sm text-gray-500 mt-1">As próximas alterações do projeto vão aparecer aqui.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Atividade do projeto</h3>
          <p className="text-sm text-gray-500">Alterações, comentários, equipa e decisões operacionais.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadActivity}>
          Atualizar
        </Button>
      </div>
      <div className="divide-y">
        {entries.map((entry) => {
          const Icon = entityIcons[entry.entidade] || Activity;
          return (
            <div key={entry.id} className="flex gap-4 px-6 py-4 hover:bg-gray-50">
              <div className="size-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <Icon className="size-4 text-gray-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-gray-900 text-sm">{entry.user_nome}</span>
                  <Badge className={styleFor(entry.acao)}>{entry.acao.replace(/_/g, " ")}</Badge>
                  <span className="text-sm text-gray-600">
                    {entry.entidade}{entry.entidade_id ? ` #${entry.entidade_id}` : ""}
                  </span>
                </div>
                {entry.detalhes && <p className="text-sm text-gray-500 mt-1 truncate">{entry.detalhes}</p>}
              </div>
              <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">
                {formatDistanceToNow(new Date(entry.criado_em), { addSuffix: true, locale: pt })}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
