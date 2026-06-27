import { useState, useEffect } from "react";
import { Header } from "../components/layout/Header";
import { VotingSystem } from "../components/voting/VotingSystem";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useProjectContext } from "../contexts/ProjectContext";
import { apiGet, apiPost } from "../lib/apiClient";

interface Vote {
  userId: string;
  userName: string;
  vote: "sim" | "nao" | "abstencao";
  timestamp: Date;
}

interface Proposal {
  id: string;
  title: string;
  description: string;
  proposedBy: string;
  createdAt: Date;
  deadline: Date;
  status: "aberta" | "aprovada" | "rejeitada" | "expirada";
  quorum: number;
  threshold: number;
  votes: Vote[];
  totalMembers: number;
}

function parseProposal(raw: Record<string, unknown>): Proposal {
  const votes = Array.isArray(raw.votes)
    ? (raw.votes as Array<Record<string, unknown>>).map((v) => ({
        userId: String(v.userId),
        userName: String(v.userName),
        vote: v.vote as Vote["vote"],
        timestamp: new Date(String(v.timestamp)),
      }))
    : [];
  return {
    id: String(raw.id),
    title: String(raw.title || ""),
    description: String(raw.description || ""),
    proposedBy: String(raw.proposedBy || ""),
    createdAt: new Date(String(raw.createdAt || new Date())),
    deadline: new Date(String(raw.deadline || new Date())),
    status: (raw.status as Proposal["status"]) || "aberta",
    quorum: Number(raw.quorum) || 50,
    threshold: Number(raw.threshold) || 66,
    votes,
    totalMembers: Number(raw.totalMembers) || 1,
  };
}

export function VotingPage() {
  const { user } = useAuth();
  const { activeProject, activeProjectId } = useProjectContext();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    deadline: "",
    quorum: "50",
    threshold: "66",
  });

  const loadProposals = async () => {
    if (!activeProjectId) {
      setProposals([]);
      setLoading(false);
      return;
    }

    try {
      const data = await apiGet<Record<string, unknown>[]>(`/api/votacoes?projeto_id=${encodeURIComponent(activeProjectId)}`);
      setProposals(data.map(parseProposal));
    } catch {
      toast.error("Erro ao carregar votações");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadProposals();
  }, [activeProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVote = async (proposalId: string, vote: "sim" | "nao" | "abstencao") => {
    try {
      await apiPost<null>(`/api/votacoes/${proposalId}/votar`, { vote });
      // Recarregar para obter contagens actualizadas
      await loadProposals();
      toast.success("Voto registado com sucesso!");
    } catch {
      toast.error("Erro ao registar voto");
    }
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await apiPost<Record<string, unknown>>("/api/votacoes", {
        title: form.title,
        description: form.description,
        deadline: form.deadline,
        quorum: parseInt(form.quorum),
        threshold: parseInt(form.threshold),
        projeto_id: activeProjectId ? Number(activeProjectId) : null,
      });
      setProposals((prev) => [parseProposal(created), ...prev]);
      setForm({ title: "", description: "", deadline: "", quorum: "50", threshold: "66" });
      setDialogOpen(false);
      toast.success("Proposta criada com sucesso!");
    } catch {
      toast.error("Erro ao criar proposta");
    }
  };

  // Minimum deadline: today
  const today = new Date().toISOString().split("T")[0];

  if (!activeProjectId) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
        <Header showBackButton />
        <div className="flex-1 min-h-0 overflow-auto p-6">
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            Escolha um projeto ativo no topo para ver apenas as votações desse projeto.
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
            <h1 className="text-2xl font-semibold text-gray-900">
              Sistema de Votação Democrática
            </h1>
            <p className="text-gray-600 mt-1">Participe nas decisões de {activeProject?.name || "projeto ativo"}</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4 mr-2" />
                Nova Proposta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nova Proposta de Votação</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateProposal} className="space-y-4">
                <div>
                  <Label htmlFor="v-title">Título *</Label>
                  <Input
                    id="v-title"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Ex: Aprovação do orçamento anual"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="v-desc">Descrição</Label>
                  <Textarea
                    id="v-desc"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Descreva a proposta em detalhe..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="v-deadline">Prazo de votação *</Label>
                  <Input
                    id="v-deadline"
                    type="date"
                    required
                    min={today}
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="v-quorum">Quórum mínimo (%)</Label>
                    <Input
                      id="v-quorum"
                      type="number"
                      min={1}
                      max={100}
                      value={form.quorum}
                      onChange={(e) => setForm({ ...form, quorum: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="v-threshold">Aprovação mínima (%)</Label>
                    <Input
                      id="v-threshold"
                      type="number"
                      min={1}
                      max={100}
                      value={form.threshold}
                      onChange={(e) => setForm({ ...form, threshold: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Criar Proposta</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">A carregar votações...</div>
        ) : (
          <VotingSystem
            proposals={proposals}
            currentUserId={user?.username || ""}
            onVote={handleVote}
          />
        )}
      </div>
    </div>
  );
}
