import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPost } from "../../lib/apiClient";

interface TeamMember {
  id: number;
  user_id: number;
  user_nome: string;
  username: string;
  papel: string;
}

interface AvailableUser {
  id: number;
  nome: string;
  username: string;
}

interface ProjectTeamSectionProps {
  projectId: string;
}

const papelColors: Record<string, string> = {
  coordenador: "bg-purple-100 text-purple-700",
  membro: "bg-blue-100 text-blue-700",
  observador: "bg-gray-100 text-gray-600",
};

export function ProjectTeamSection({ projectId }: ProjectTeamSectionProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [users, setUsers] = useState<AvailableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedPapel, setSelectedPapel] = useState("membro");

  useEffect(() => {
    Promise.all([
      apiGet<TeamMember[]>(`/api/projects/${projectId}/team`).catch(() => []),
      apiGet<AvailableUser[]>("/api/auth/users").catch(() => []),
    ]).then(([team, allUsers]) => {
      setMembers(Array.isArray(team) ? team : []);
      setUsers(Array.isArray(allUsers) ? allUsers : []);
    }).catch(() => toast.error("Erro ao carregar equipa"))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleAdd = async () => {
    if (!selectedUser) return;
    try {
      const created = await apiPost<TeamMember>(`/api/projects/${projectId}/team`, { user_id: parseInt(selectedUser), papel: selectedPapel });
      setMembers(prev => [...prev, created]);
      setSelectedUser("");
      toast.success("Membro adicionado à equipa!");
    } catch {
      toast.error("Erro ao adicionar membro (já pode estar na equipa)");
    }
  };

  const handleRemove = async (userId: number) => {
    setMembers(prev => prev.filter(m => m.user_id !== userId));
    try {
      await apiDelete<null>(`/api/projects/${projectId}/team/${userId}`);
      toast.success("Membro removido da equipa");
    } catch {
      toast.error("Erro ao remover membro");
    }
  };

  const memberUserIds = new Set(members.map(m => m.user_id));
  const availableUsers = users.filter(u => !memberUserIds.has(u.id));

  const getInitials = (nome: string) => nome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

  if (loading) {
    return <div className="text-center py-8 text-gray-400 text-sm">A carregar equipa...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Equipa do Projeto ({members.length} membros)</h3>
      </div>

      {/* Members list */}
      {members.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500 text-sm">Nenhum membro adicionado ao projeto</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {members.map(m => (
            <Card key={m.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                  {getInitials(m.user_nome)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{m.user_nome}</p>
                  <p className="text-xs text-gray-500">@{m.username}</p>
                </div>
                <Badge className={papelColors[m.papel] || "bg-gray-100 text-gray-600"}>
                  {m.papel}
                </Badge>
                <Button
                  variant="ghost" size="sm"
                  className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0 shrink-0"
                  onClick={() => handleRemove(m.user_id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add member form */}
      {availableUsers.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Adicionar membro</p>
          <div className="flex gap-3">
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              className="flex-1 text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white"
            >
              <option value="">Selecionar utilizador...</option>
              {availableUsers.map(u => (
                <option key={u.id} value={u.id}>{u.nome} (@{u.username})</option>
              ))}
            </select>
            <select
              value={selectedPapel}
              onChange={e => setSelectedPapel(e.target.value)}
              className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white"
            >
              <option value="coordenador">Coordenador</option>
              <option value="membro">Membro</option>
              <option value="observador">Observador</option>
            </select>
            <Button size="sm" onClick={handleAdd} disabled={!selectedUser}>
              <UserPlus className="size-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
