import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Vote, Clock } from "lucide-react";
import { useState } from "react";

interface Poll {
  id: string;
  title: string;
  description: string;
  endDate: string;
  votes: { sim: number; nao: number };
  userVoted: boolean;
}

const initialPolls: Poll[] = [
  {
    id: "1",
    title: "Orçamento Março",
    description: "Aprovar orçamento de €5.000 para expansão",
    endDate: "Termina em 2 dias",
    votes: { sim: 12, nao: 3 },
    userVoted: false,
  },
  {
    id: "2",
    title: "Nova Parceria",
    description: "Parceria com Universidade Verde",
    endDate: "Termina em 5 dias",
    votes: { sim: 8, nao: 2 },
    userVoted: false,
  },
];

export function Assembleia() {
  const [polls, setPolls] = useState(initialPolls);

  const handleVote = (pollId: string, vote: "sim" | "nao") => {
    setPolls(polls.map(poll => 
      poll.id === pollId
        ? {
            ...poll,
            votes: {
              ...poll.votes,
              [vote]: poll.votes[vote] + 1,
            },
            userVoted: true,
          }
        : poll
    ));
  };

  return (
    <div className="space-y-3">
      {polls.map((poll) => (
        <Card key={poll.id} className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Vote className="size-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">{poll.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{poll.description}</p>
              
              <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                <Clock className="size-3" />
                <span>{poll.endDate}</span>
              </div>

              {!poll.userVoted ? (
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    onClick={() => handleVote(poll.id, "sim")}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Sim
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleVote(poll.id, "nao")}
                  >
                    Não
                  </Button>
                </div>
              ) : (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 font-medium">
                      Sim: {poll.votes.sim}
                    </span>
                    <span className="text-red-600 font-medium">
                      Não: {poll.votes.nao}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Voto registrado ✓</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
