import { TIPOS, AREAS } from "./licoes.types";

interface Props {
  filterTipo: string;
  filterArea: string;
  onTipoChange: (v: string) => void;
  onAreaChange: (v: string) => void;
}

export function LicoesFilters({ filterTipo, filterArea, onTipoChange, onAreaChange }: Props) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <div className="flex gap-1">
        {["all", ...TIPOS].map((t) => (
          <button
            key={t}
            onClick={() => onTipoChange(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterTipo === t
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t === "all" ? "Todas" : t}
          </button>
        ))}
      </div>
      <div className="flex gap-1 flex-wrap">
        {["all", ...AREAS].map((a) => (
          <button
            key={a}
            onClick={() => onAreaChange(a)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterArea === a
                ? "bg-slate-700 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {a === "all" ? "Todas as áreas" : a}
          </button>
        ))}
      </div>
    </div>
  );
}
