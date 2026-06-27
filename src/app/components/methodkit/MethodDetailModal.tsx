import { X, CheckSquare } from "lucide-react";
import { Button } from "../ui/button";
import type { MKCard, CategoryMeta } from "./methodkit.types";

interface MethodDetailModalProps {
  card: MKCard;
  categoryMeta: CategoryMeta | undefined;
  isSelected: boolean;
  onToggle: (id: string) => void;
  onClose: () => void;
  getGuideQuestions: (id: string) => string[];
}

export function MethodDetailModal({
  card,
  categoryMeta,
  isSelected,
  onToggle,
  onClose,
  getGuideQuestions,
}: MethodDetailModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{card.icon}</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{card.titlePt}</h2>
              <p className="text-sm text-gray-400">{card.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="size-5" />
          </button>
        </div>

        <div className="mb-4">
          <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full border ${categoryMeta?.color ?? ""}`}>
            {categoryMeta?.label}
          </span>
        </div>

        <p className="text-gray-700 text-sm leading-relaxed mb-6">{card.description}</p>

        <div className="bg-gray-50 rounded-lg p-3 mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Perguntas guia</p>
          <ul className="text-sm text-gray-700 space-y-1">
            {getGuideQuestions(card.id).map((q, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-gray-400 mt-0.5">→</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1"
            variant={isSelected ? "default" : "outline"}
            onClick={() => onToggle(card.id)}
          >
            <CheckSquare className="size-4 mr-2" />
            {isSelected ? "Remover da seleção" : "Selecionar cartão"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
