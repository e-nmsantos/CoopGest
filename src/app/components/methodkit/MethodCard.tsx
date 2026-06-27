import { Card } from "../ui/card";
import type { MKCard, CategoryMeta } from "./methodkit.types";

interface MethodCardProps {
  card: MKCard;
  categoryMeta: CategoryMeta | undefined;
  isSelected: boolean;
  onToggle: (id: string) => void;
  onOpenDetail: (card: MKCard) => void;
}

export function MethodCard({ card, categoryMeta, isSelected, onToggle, onOpenDetail }: MethodCardProps) {
  return (
    <Card
      onClick={() => onOpenDetail(card)}
      className={`p-4 cursor-pointer transition-all hover:shadow-md relative ${
        isSelected ? "ring-2 ring-violet-500 bg-violet-50" : "bg-white hover:bg-gray-50"
      }`}
    >
      {/* Select toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(card.id); }}
        className={`absolute top-3 right-3 size-5 rounded border flex items-center justify-center transition-colors ${
          isSelected
            ? "bg-violet-500 border-violet-500 text-white"
            : "bg-white border-gray-300 hover:border-violet-400"
        }`}
      >
        {isSelected && <span className="text-[10px] font-bold">✓</span>}
      </button>

      <div className="text-2xl mb-2">{card.icon}</div>
      <div className="pr-6">
        <p className="font-semibold text-gray-900 text-sm leading-tight">{card.titlePt}</p>
        <p className="text-xs text-gray-400 mb-2">{card.title}</p>
        <p className="text-xs text-gray-600 line-clamp-3">{card.description}</p>
      </div>
      <div className="mt-3">
        <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border ${categoryMeta?.color ?? ""}`}>
          {categoryMeta?.label}
        </span>
      </div>
    </Card>
  );
}
