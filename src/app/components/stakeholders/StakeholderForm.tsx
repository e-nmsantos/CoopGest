import React from "react";
import { Stakeholder } from "./stakeholders.types";

interface StakeholderFormProps {
  editingId: number | null;
  form: Omit<Stakeholder, "id" | "criado_por">;
  setForm: React.Dispatch<React.SetStateAction<Omit<Stakeholder, "id" | "criado_por">>>;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function StakeholderForm({ editingId, form, setForm, saving, onSave, onCancel }: StakeholderFormProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800 mb-4">
        {editingId !== null ? "Editar Stakeholder" : "Novo Stakeholder"}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Nome <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nome do stakeholder"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Organização</label>
          <input
            type="text"
            value={form.organizacao}
            onChange={(e) => setForm((f) => ({ ...f, organizacao: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Organização"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Papel</label>
          <input
            type="text"
            value={form.papel}
            onChange={(e) => setForm((f) => ({ ...f, papel: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Papel no projeto"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Interesse</label>
          <select
            value={form.interesse}
            onChange={(e) =>
              setForm((f) => ({ ...f, interesse: e.target.value as Stakeholder["interesse"] }))
            }
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Alto">Alto</option>
            <option value="Médio">Médio</option>
            <option value="Baixo">Baixo</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Influência</label>
          <select
            value={form.influencia}
            onChange={(e) =>
              setForm((f) => ({ ...f, influencia: e.target.value as Stakeholder["influencia"] }))
            }
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Alto">Alto</option>
            <option value="Médio">Médio</option>
            <option value="Baixo">Baixo</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Posição</label>
          <select
            value={form.posicao}
            onChange={(e) =>
              setForm((f) => ({ ...f, posicao: e.target.value as Stakeholder["posicao"] }))
            }
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Apoiante">Apoiante</option>
            <option value="Neutro">Neutro</option>
            <option value="Oponente">Oponente</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Contacto</label>
          <input
            type="text"
            value={form.contacto}
            onChange={(e) => setForm((f) => ({ ...f, contacto: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Email / telefone"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">Estratégia de Envolvimento</label>
          <textarea
            value={form.estrategia}
            onChange={(e) => setForm((f) => ({ ...f, estrategia: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Como envolver este stakeholder?"
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-slate-700 mb-1">Notas</label>
          <textarea
            value={form.notas}
            onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Notas adicionais..."
          />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "A guardar..." : editingId !== null ? "Atualizar" : "Criar"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-slate-200 text-slate-600 rounded-md text-sm hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
