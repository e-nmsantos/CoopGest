import { useState, useEffect } from "react";
import { Header } from "../components/layout/Header";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Users, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { apiGet } from "../lib/apiClient";

interface PersonTask {
  id: number;
  nome: string;
  estado: string;
  prioridade: string;
  data_fim?: string;
  projeto_id: number;
  projeto_nome: string;
}

interface PersonData {
  responsavel: string;
  tarefas: PersonTask[];
  abertas: number;
}

const prioColors: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-blue-100 text-blue-700",
};

export function RecursosPage() {
  const [data, setData] = useState<PersonData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<PersonData[]>("/api/recursos")
      .then(setData)
      .catch(() => toast.error("Erro ao carregar recursos"))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <Header />
      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Recursos e Carga de Trabalho</h1>
          <p className="text-gray-600 mt-1">Vista transversal de tarefas por responsável, em todos os projetos</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">A carregar...</div>
        ) : data.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="size-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma tarefa atribuída encontrada</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map(person => {
              const overdueCount = person.tarefas.filter(t =>
                t.data_fim && new Date(t.data_fim) < today && t.estado !== "Concluída"
              ).length;

              return (
                <Card key={person.responsavel} className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {person.responsavel.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{person.responsavel}</p>
                      <p className="text-xs text-gray-500">{person.abertas} tarefas abertas</p>
                    </div>
                    {overdueCount > 0 && (
                      <div className="flex items-center gap-1 text-red-600 text-xs font-medium shrink-0">
                        <AlertCircle className="size-3.5" />
                        {overdueCount} atrasada{overdueCount !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {person.tarefas.slice(0, 5).map(t => {
                      const isOverdue = !!(t.data_fim && new Date(t.data_fim) < today && t.estado !== "Concluída");
                      return (
                        <div key={t.id} className={`flex items-center gap-2 text-xs rounded-lg px-2 py-1.5 ${isOverdue ? "bg-red-50" : "bg-gray-50"}`}>
                          <Badge className={`shrink-0 text-[10px] py-0 px-1.5 ${prioColors[t.prioridade] || "bg-gray-100 text-gray-600"}`}>
                            {t.prioridade || "—"}
                          </Badge>
                          <span className={`flex-1 truncate ${isOverdue ? "text-red-700" : "text-gray-700"}`}>
                            {t.nome}
                          </span>
                          <span className="text-gray-400 shrink-0 truncate max-w-20">{t.projeto_nome}</span>
                        </div>
                      );
                    })}
                    {person.tarefas.length > 5 && (
                      <p className="text-xs text-gray-400 text-center pt-1">
                        +{person.tarefas.length - 5} mais tarefas
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
