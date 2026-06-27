import { useState } from "react";
import { Header } from "../components/layout/Header";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Search, LayoutGrid, CheckSquare, Printer, RotateCcw } from "lucide-react";
import { MethodCard } from "../components/methodkit/MethodCard";
import { MethodDetailModal } from "../components/methodkit/MethodDetailModal";
import { useMethodKit, CARDS } from "../hooks/useMethodKit";
import { getGuideQuestions } from "../components/methodkit/methodkit.data";
import type { MKCard, CategoryMeta } from "../components/methodkit/methodkit.types";

// ────────────────────────────────────────────────────────────
// Category definitions
// ────────────────────────────────────────────────────────────
const CATEGORIES: CategoryMeta[] = [
  { id: "estrategia", label: "Estratégia & Visão", color: "bg-violet-100 text-violet-700 border-violet-200" },
  { id: "stakeholders", label: "Partes Interessadas", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "equipa", label: "Equipa & Organização", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { id: "planeamento", label: "Planeamento", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { id: "recursos", label: "Recursos", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { id: "comunicacao", label: "Comunicação", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { id: "risco", label: "Risco & Qualidade", color: "bg-red-100 text-red-700 border-red-200" },
  { id: "avaliacao", label: "Monitorização & Avaliação", color: "bg-pink-100 text-pink-700 border-pink-200" },
  { id: "entrega", label: "Entrega & Impacto", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export function MethodKitPage() {
  const {
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    selectedCards,
    workshopMode,
    setWorkshopMode,
    filteredCards,
    toggleCard,
    resetSelection,
  } = useMethodKit();

  const [detailCard, setDetailCard] = useState<MKCard | null>(null);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <Header projectName="MethodKit for Projects" />

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">

          {/* Intro */}
          <div className="mb-6 bg-violet-50 border border-violet-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🃏</span>
              <div>
                <h2 className="font-semibold text-violet-900 mb-1">MethodKit for Projects</h2>
                <p className="text-sm text-violet-700">
                  56 cartões que cobrem os aspetos chave de qualquer projeto. Use-os para <strong>discutir</strong>, <strong>priorizar</strong>, <strong>planear</strong> e <strong>estruturar</strong> o trabalho em equipa.
                  Selecione os cartões relevantes para o seu projeto e use o modo Workshop para focar a conversa.
                </p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-3 mb-4 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Pesquisar cartões..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant={workshopMode ? "default" : "outline"}
                size="sm"
                onClick={() => setWorkshopMode((v) => !v)}
                disabled={selectedCards.size === 0 && !workshopMode}
              >
                <LayoutGrid className="size-4 mr-1.5" />
                Workshop ({selectedCards.size})
              </Button>
              {selectedCards.size > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer className="size-4 mr-1.5" />
                    Imprimir
                  </Button>
                  <Button variant="ghost" size="sm" onClick={resetSelection} className="text-red-500 hover:text-red-600">
                    <RotateCcw className="size-4 mr-1.5" />
                    Limpar
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedCategory === null
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              }`}
            >
              Todos ({CARDS.length})
            </button>
            {CATEGORIES.map((cat) => {
              const count = CARDS.filter((c) => c.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedCategory === cat.id
                      ? cat.color + " font-semibold"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Workshop mode header */}
          {workshopMode && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 flex items-center gap-2 text-sm text-amber-800">
              <CheckSquare className="size-4" />
              <span>Modo Workshop — a mostrar apenas os {selectedCards.size} cartões selecionados</span>
            </div>
          )}

          {/* Cards grid */}
          {filteredCards.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg">Nenhum cartão encontrado</p>
              {workshopMode && <p className="text-sm mt-1">Selecione cartões antes de entrar no modo Workshop</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredCards.map((card) => (
                <MethodCard
                  key={card.id}
                  card={card}
                  categoryMeta={CATEGORY_MAP[card.category]}
                  isSelected={selectedCards.has(card.id)}
                  onToggle={toggleCard}
                  onOpenDetail={setDetailCard}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {detailCard && (
        <MethodDetailModal
          card={detailCard}
          categoryMeta={CATEGORY_MAP[detailCard.category]}
          isSelected={selectedCards.has(detailCard.id)}
          onToggle={toggleCard}
          onClose={() => setDetailCard(null)}
          getGuideQuestions={getGuideQuestions}
        />
      )}
    </div>
  );
}
