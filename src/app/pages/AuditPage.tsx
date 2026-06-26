import { useState, useEffect } from "react";
import { Header } from "../components/layout/Header";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Shield, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { apiGet } from "../lib/apiClient";

interface AuditEntry {
  id: number;
  user_nome: string;
  acao: string;
  entidade: string;
  entidade_id?: number;
  detalhes?: string;
  criado_em: string;
}

const entityIcons: Record<string, string> = {
  projeto: "📁",
  tarefa: "✅",
  milestone: "🏁",
  votacao: "🗳️",
  utilizador: "👤",
  parceiro: "🤝",
};

const actionColors: Record<string, string> = {
  criado: "text-green-600 bg-green-50",
  atualizado: "text-blue-600 bg-blue-50",
  eliminado: "text-red-600 bg-red-50",
  arquivado: "text-gray-600 bg-gray-50",
  duplicado: "text-purple-600 bg-purple-50",
  movido: "text-orange-600 bg-orange-50",
  concluido: "text-emerald-600 bg-emerald-50",
  votado: "text-indigo-600 bg-indigo-50",
  convidado: "text-teal-600 bg-teal-50",
};

export function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEntidade, setFilterEntidade] = useState("");

  useEffect(() => {
    apiGet<AuditEntry[]>("/api/audit?limit=200")
      .then(setEntries)
      .catch(() => toast.error("Erro ao carregar auditoria"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = entries.filter(e => {
    if (filterEntidade && e.entidade !== filterEntidade) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.user_nome.toLowerCase().includes(q) || e.acao.toLowerCase().includes(q) || (e.detalhes || "").toLowerCase().includes(q);
    }
    return true;
  });

  const uniqueEntidades = [...new Set(entries.map(e => e.entidade))];

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <Header />
      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Log de Auditoria</h1>
            <p className="text-gray-600 mt-1">Histórico completo de ações no sistema</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Pesquisar ações, utilizadores..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={filterEntidade}
            onChange={e => setFilterEntidade(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white"
          >
            <option value="">Todas as entidades</option>
            {uniqueEntidades.map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">A carregar...</div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Shield className="size-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum evento encontrado</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y">
              {filtered.map(entry => {
                const icon = entityIcons[entry.entidade] || "📋";
                const colorClass = Object.entries(actionColors).find(([k]) => entry.acao.toLowerCase().includes(k))?.[1] || "text-gray-600 bg-gray-50";
                return (
                  <div key={entry.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50">
                    <span className="text-xl shrink-0 mt-0.5">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 text-sm">{entry.user_nome}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorClass}`}>
                          {entry.acao}
                        </span>
                        <span className="text-sm text-gray-600">
                          {entry.entidade}{entry.entidade_id ? ` #${entry.entidade_id}` : ""}
                        </span>
                      </div>
                      {entry.detalhes && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{entry.detalhes}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">
                      {formatDistanceToNow(new Date(entry.criado_em), { addSuffix: true, locale: pt })}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
