import { MethodCard } from "./MethodCard";
import type { MKCard, CategoryMeta } from "./methodkit.types";

interface MethodCategorySectionProps {
  category: CategoryMeta;
  cards: MKCard[];
  selectedCards: Set<string>;
  onToggle: (id: string) => void;
  onOpenDetail: (card: MKCard) => void;
}

export function MethodCategorySection({
  category,
  cards,
  selectedCards,
  onToggle,
  onOpenDetail,
}: MethodCategorySectionProps) {
  if (cards.length === 0) return null;

  return (
    <div>
      <h3 className={`text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-md inline-block mb-3 border ${category.color}`}>
        {category.label}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <MethodCard
            key={card.id}
            card={card}
            categoryMeta={category}
            isSelected={selectedCards.has(card.id)}
            onToggle={onToggle}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>
    </div>
  );
}
