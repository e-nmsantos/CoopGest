import { Pencil, Trash2, Users } from "lucide-react";
import { Stakeholder, posicaoBadge, interesseBadge } from "./stakeholders.types";

interface StakeholderListProps {
  stakeholders: Stakeholder[];
  onEdit: (sk: Stakeholder) => void;
  onDelete: (sk: Stakeholder) => void;
  onOpenCreate: () => void;
}

export function StakeholderList({ stakeholders, onEdit, onDelete, onOpenCreate }: StakeholderListProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {stakeholders.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Users className="size-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum stakeholder encontrado</p>
          <button
            onClick={onOpenCreate}
            className="mt-3 text-blue-600 text-sm hover:underline"
          >
            Adicionar stakeholder
          </button>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Organização</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Papel</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Interesse</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Influência</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Posição</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Ações</th>
            </tr>
          </thead>
          <tbody>
            {stakeholders.map((sk, i) => (
              <tr
                key={sk.id}
                className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                  i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                }`}
              >
                <td className="px-4 py-3 font-medium text-slate-800">{sk.nome}</td>
                <td className="px-4 py-3 text-slate-600">{sk.organizacao || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{sk.papel || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${interesseBadge(sk.interesse)}`}>
                    {sk.interesse}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${interesseBadge(sk.influencia)}`}>
                    {sk.influencia}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${posicaoBadge(sk.posicao)}`}>
                    {sk.posicao}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => onEdit(sk)}
                      className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Editar"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(sk)}
                      className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
