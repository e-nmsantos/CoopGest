import { Lightbulb } from "lucide-react";
import { Card } from "../ui/card";
import { Licao } from "./licoes.types";
import { LicaoCard } from "./LicaoCard";

interface Props {
  isLoading: boolean;
  licoes: Licao[];
  filtered: Licao[];
  onEdit: (l: Licao) => void;
  onDelete: (id: number) => void;
}

export function LicoesList({ isLoading, licoes, filtered, onEdit, onDelete }: Props) {
  if (isLoading) {
    return <Card className="p-8 text-center text-gray-400">A carregar...</Card>;
  }

  if (filtered.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Lightbulb className="mx-auto mb-3 text-gray-300" size={36} />
        <p className="text-gray-500 text-sm">
          {licoes.length === 0
            ? "Ainda não há lições aprendidas registadas. Regista a primeira!"
            : "Nenhuma lição corresponde aos filtros selecionados."}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map((l) => (
        <LicaoCard key={l.id} licao={l} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
