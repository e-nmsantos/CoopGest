import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { ThumbsUp, ThumbsDown, Minus, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

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
  quorum: number; // Percentagem mínima de participação
  threshold: number; // Percentagem mínima de aprovação
  votes: Vote[];
  totalMembers: number;
}

interface VotingSystemProps {
  proposals: Proposal[];
  currentUserId: string;
  onVote: (proposalId: string, vote: "sim" | "nao" | "abstencao") => void;
}

export function VotingSystem({ proposals, currentUserId, onVote }: VotingSystemProps) {
  const getVoteCounts = (proposal: Proposal) => {
    const sim = proposal.votes.filter((v) => v.vote === "sim").length;
    const nao = proposal.votes.filter((v) => v.vote === "nao").length;
    const abstencao = proposal.votes.filter((v) => v.vote === "abstencao").length;
    const total = proposal.votes.length;
    const participation = (total / proposal.totalMembers) * 100;
    const approval = total > 0 ? (sim / total) * 100 : 0;

    return { sim, nao, abstencao, total, participation, approval };
  };

  const hasUserVoted = (proposal: Proposal) => {
    return proposal.votes.some((v) => v.userId === currentUserId);
  };

  const getUserVote = (proposal: Proposal) => {
    return proposal.votes.find((v) => v.userId === currentUserId)?.vote;
  };

  return (
    <div className="space-y-4">
      {proposals.map((proposal) => {
        const counts = getVoteCounts(proposal);
        const userVoted = hasUserVoted(proposal);
        const userVote = getUserVote(proposal);
        const isActive = proposal.status === "aberta";
        const quorumReached = counts.participation >= proposal.quorum;

        return (
          <Card key={proposal.id} className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900">{proposal.title}</h3>
                  <Badge
                    variant={
                      proposal.status === "aprovada"
                        ? "default"
                        : proposal.status === "rejeitada"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {proposal.status === "aberta" && "🗳️ Em votação"}
                    {proposal.status === "aprovada" && "✅ Aprovada"}
                    {proposal.status === "rejeitada" && "❌ Rejeitada"}
                    {proposal.status === "expirada" && "⏰ Expirada"}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{proposal.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>Proposta por {proposal.proposedBy}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatDistanceToNow(proposal.deadline, {
                      addSuffix: true,
                      locale: pt,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Voting Stats */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Participação</span>
                <span className="font-medium">
                  {counts.total}/{proposal.totalMembers} ({counts.participation.toFixed(0)}%)
                </span>
              </div>
              <Progress value={counts.participation} className="h-2" />

              {!quorumReached && isActive && (
                <p className="text-xs text-orange-600">
                  ⚠️ Quórum mínimo: {proposal.quorum}% (ainda não atingido)
                </p>
              )}

              {/* Vote Breakdown */}
              {counts.total > 0 && (
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700 mb-1">
                      <ThumbsUp className="size-4" />
                      <span className="text-xs font-medium">Sim</span>
                    </div>
                    <p className="text-2xl font-bold text-green-800">{counts.sim}</p>
                    <p className="text-xs text-green-600">
                      {((counts.sim / counts.total) * 100).toFixed(0)}%
                    </p>
                  </div>

                  <div className="bg-red-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700 mb-1">
                      <ThumbsDown className="size-4" />
                      <span className="text-xs font-medium">Não</span>
                    </div>
                    <p className="text-2xl font-bold text-red-800">{counts.nao}</p>
                    <p className="text-xs text-red-600">
                      {((counts.nao / counts.total) * 100).toFixed(0)}%
                    </p>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-700 mb-1">
                      <Minus className="size-4" />
                      <span className="text-xs font-medium">Abstenção</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{counts.abstencao}</p>
                    <p className="text-xs text-gray-600">
                      {((counts.abstencao / counts.total) * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Voting Buttons */}
            {isActive && !userVoted && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => onVote(proposal.id, "sim")}
                >
                  <ThumbsUp className="size-4 mr-2" />
                  Votar Sim
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1"
                  onClick={() => onVote(proposal.id, "nao")}
                >
                  <ThumbsDown className="size-4 mr-2" />
                  Votar Não
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onVote(proposal.id, "abstencao")}
                >
                  <Minus className="size-4 mr-2" />
                  Abstenção
                </Button>
              </div>
            )}

            {userVoted && (
              <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                ✓ Votou: <span className="font-semibold capitalize">{userVote}</span>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
