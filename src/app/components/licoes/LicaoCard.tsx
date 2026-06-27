import { Pencil, Trash2, Minus } from "lucide-react";
import { Licao, TIPO_CONFIG, IMPACTO_CONFIG, AREA_COLORS } from "./licoes.types";

interface Props {
  licao: Licao;
  onEdit: (l: Licao) => void;
  onDelete: (id: number) => void;
}

export function LicaoCard({ licao: l, onEdit, onDelete }: Props) {
  const tc = TIPO_CONFIG[l.tipo];
  const ic = IMPACTO_CONFIG[l.impacto];
  const TipoIcon = tc?.icon ?? Minus;

  return (
    <div className={`rounded-lg border p-4 ${tc?.bg ?? ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <TipoIcon className={`mt-0.5 flex-shrink-0 ${tc?.color}`} size={18} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">{l.titulo}</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ic?.bg} ${ic?.color}`}>
                Impacto {l.impacto}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${AREA_COLORS[l.area] ?? "bg-gray-100 text-gray-600"}`}>
                {l.area}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {l.fase_projeto}
              </span>
              {l.criado_por && (
                <span className="text-xs text-gray-400">por {l.criado_por}</span>
              )}
            </div>
            {l.descricao && (
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">{l.descricao}</p>
            )}
            {l.recomendacao && (
              <div className="mt-2 pl-3 border-l-2 border-blue-300">
                <p className="text-xs font-medium text-blue-700 mb-0.5">Recomendação</p>
                <p className="text-sm text-gray-700">{l.recomendacao}</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(l)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => void onDelete(l.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
