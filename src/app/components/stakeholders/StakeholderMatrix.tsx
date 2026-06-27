import { MatrixData, Stakeholder } from "./stakeholders.types";
import { Quadrant } from "./Quadrant";

interface StakeholderMatrixProps {
  matrix: MatrixData | null;
  stakeholders: Stakeholder[];
  loading: boolean;
  onEdit: (sk: Stakeholder) => void;
  onOpenCreate: () => void;
}

export function StakeholderMatrix({ matrix, stakeholders, loading, onEdit, onOpenCreate }: StakeholderMatrixProps) {
  return (
    <div>
      {/* Axis labels */}
      <div className="relative">
        {/* X-axis label (Influência) */}
        <div className="flex justify-center mb-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Influência →
          </div>
        </div>
        <div className="flex gap-0">
          {/* Y-axis label (Interesse) */}
          <div className="flex items-center mr-2">
            <div
              className="text-xs font-semibold text-slate-500 uppercase tracking-widest"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              ← Interesse
            </div>
          </div>
          <div className="flex-1">
            {/* Column headers */}
            <div className="grid grid-cols-2 gap-1 mb-1">
              <div className="text-center text-xs text-slate-400 font-medium">Baixa</div>
              <div className="text-center text-xs text-slate-400 font-medium">Alta</div>
            </div>
            {/* Row: Alto interesse */}
            <div className="grid grid-cols-2 gap-1 mb-1">
              <div className="text-right text-xs text-slate-400 font-medium self-center pr-2 absolute -ml-16">
              </div>
              {/* Manter Informado — Alto interesse, Baixa influência */}
              <Quadrant
                title="Manter Informado"
                subtitle="Alto interesse, baixa influência"
                colorClass="border-green-200 bg-green-50/40"
                headerClass="text-green-700"
                stakeholders={matrix?.manter_informado ?? []}
                onEdit={onEdit}
              />
              {/* Gerir de Perto — Alto interesse, Alta influência */}
              <Quadrant
                title="Gerir de Perto"
                subtitle="Alto interesse, alta influência"
                colorClass="border-blue-200 bg-blue-50/40"
                headerClass="text-blue-700"
                stakeholders={matrix?.gerir_de_perto ?? []}
                onEdit={onEdit}
              />
            </div>
            {/* Row labels */}
            <div className="grid grid-cols-2 gap-1 -mt-1 mb-1">
              <div className="text-center text-xs text-slate-300">— Alto</div>
              <div />
            </div>
            <div className="grid grid-cols-2 gap-1 mb-1">
              <div className="text-center text-xs text-slate-300">Baixo —</div>
              <div />
            </div>
            {/* Row: Baixo interesse */}
            <div className="grid grid-cols-2 gap-1">
              {/* Monitorizar — Baixo interesse, Baixa influência */}
              <Quadrant
                title="Monitorizar"
                subtitle="Baixo interesse, baixa influência"
                colorClass="border-slate-200 bg-slate-50/40"
                headerClass="text-slate-600"
                stakeholders={matrix?.monitorizar ?? []}
                onEdit={onEdit}
              />
              {/* Manter Satisfeito — Baixo interesse, Alta influência */}
              <Quadrant
                title="Manter Satisfeito"
                subtitle="Baixo interesse, alta influência"
                colorClass="border-amber-200 bg-amber-50/40"
                headerClass="text-amber-700"
                stakeholders={matrix?.manter_satisfeito ?? []}
                onEdit={onEdit}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="font-medium">Legenda:</span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-3 rounded-full bg-green-200 border border-green-400" />
          Apoiante
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-3 rounded-full bg-slate-200 border border-slate-400" />
          Neutro
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-3 rounded-full bg-red-200 border border-red-400" />
          Oponente
        </span>
        <span className="text-slate-400 italic">Clique num stakeholder para editar</span>
      </div>

      {stakeholders.length === 0 && !loading && (
        <div className="mt-4 text-center py-8 text-slate-400 text-sm">
          Nenhum stakeholder adicionado ainda.{" "}
          <button
            onClick={onOpenCreate}
            className="text-blue-600 hover:underline font-medium"
          >
            Adicionar o primeiro
          </button>
        </div>
      )}
    </div>
  );
}
