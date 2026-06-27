import { Stakeholder, posicaoBadge } from "./stakeholders.types";

interface QuadrantProps {
  title: string;
  subtitle: string;
  colorClass: string;
  headerClass: string;
  stakeholders: Stakeholder[];
  onEdit: (sk: Stakeholder) => void;
}

export function Quadrant({ title, subtitle, colorClass, headerClass, stakeholders, onEdit }: QuadrantProps) {
  return (
    <div className={`rounded-lg border-2 ${colorClass} p-4 min-h-[180px]`}>
      <div className={`text-xs font-bold uppercase tracking-wide mb-0.5 ${headerClass}`}>{title}</div>
      <div className="text-xs text-slate-500 mb-3">{subtitle}</div>
      <div className="flex flex-wrap gap-1.5">
        {stakeholders.length === 0 && (
          <span className="text-xs text-slate-400 italic">Nenhum stakeholder</span>
        )}
        {stakeholders.map((sk) => (
          <button
            key={sk.id}
            onClick={() => onEdit(sk)}
            title={sk.organizacao || sk.nome}
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-opacity hover:opacity-80 ${posicaoBadge(sk.posicao)}`}
          >
            {sk.nome}
          </button>
        ))}
      </div>
    </div>
  );
}
