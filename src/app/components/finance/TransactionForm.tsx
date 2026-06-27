import React from "react";
import { Pencil, Plus, X } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { FinanceProject, FinanceTransaction, MOEDAS } from "./finance.types";

interface TransactionFormProps {
  form: {
    projeto_id: string;
    tipo: "Receita" | "Despesa";
    categoria: string;
    descricao: string;
    entidade: string;
    referencia: string;
    valor: string;
    moeda: string;
    taxa_cambio: string;
    data_movimento: string;
    estado: string;
  };
  setForm: React.Dispatch<React.SetStateAction<{
    projeto_id: string;
    tipo: "Receita" | "Despesa";
    categoria: string;
    descricao: string;
    entidade: string;
    referencia: string;
    valor: string;
    moeda: string;
    taxa_cambio: string;
    data_movimento: string;
    estado: string;
  }>>;
  editingTransaction: FinanceTransaction | null;
  attachment: File | null;
  setAttachment: (f: File | null) => void;
  projects: FinanceProject[];
  categories: string[];
  onSubmit: () => void;
  onCancel: () => void;
}

export function TransactionForm({
  form,
  setForm,
  editingTransaction,
  attachment,
  setAttachment,
  projects,
  categories,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        {editingTransaction ? <Pencil className="size-5 text-blue-600" /> : <Plus className="size-5 text-blue-600" />}
        <h2 className="font-semibold text-gray-900">{editingTransaction ? "Editar movimento" : "Novo movimento"}</h2>
      </div>
      {editingTransaction && (
        <div className="mb-4 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
          A editar: <span className="font-semibold">{editingTransaction.descricao}</span>
        </div>
      )}
      <div className="space-y-3">
        <select
          value={form.projeto_id}
          onChange={(event) => setForm((prev) => ({ ...prev, projeto_id: event.target.value }))}
          className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
        >
          <option value="">Projeto</option>
          {projects.map((project) => (
            <option key={project.id} value={String(project.id)}>
              {project.nome}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={form.tipo}
            onChange={(event) => setForm((prev) => ({ ...prev, tipo: event.target.value as "Receita" | "Despesa" }))}
            className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
          >
            <option value="Despesa">Despesa</option>
            <option value="Receita">Receita</option>
          </select>
          <Input
            type="date"
            value={form.data_movimento}
            onChange={(event) => setForm((prev) => ({ ...prev, data_movimento: event.target.value }))}
          />
        </div>
        <input
          list="finance-categories"
          value={form.categoria}
          onChange={(event) => setForm((prev) => ({ ...prev, categoria: event.target.value }))}
          placeholder="Categoria"
          className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
        />
        <datalist id="finance-categories">
          {categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
        <Input
          placeholder="Descricao"
          value={form.descricao}
          onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Fornecedor/doador"
            value={form.entidade}
            onChange={(event) => setForm((prev) => ({ ...prev, entidade: event.target.value }))}
          />
          <Input
            placeholder="Referencia"
            value={form.referencia}
            onChange={(event) => setForm((prev) => ({ ...prev, referencia: event.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Valor"
            value={form.valor}
            onChange={(event) => setForm((prev) => ({ ...prev, valor: event.target.value }))}
          />
          <select
            value={form.moeda}
            onChange={(event) => setForm((prev) => ({ ...prev, moeda: event.target.value }))}
            className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
          >
            {MOEDAS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {form.moeda !== "EUR" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">Taxa {form.moeda}/EUR</span>
            <Input
              type="number"
              min="0.0001"
              step="0.0001"
              placeholder="Taxa câmbio"
              value={form.taxa_cambio}
              onChange={(event) => setForm((prev) => ({ ...prev, taxa_cambio: event.target.value }))}
            />
          </div>
        )}
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Comprovativo
          </span>
          <input
            key={editingTransaction ? `edit-${editingTransaction.id}` : "new"}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={(event) => setAttachment(event.target.files?.[0] || null)}
            className="block w-full rounded-md border border-gray-300 bg-white text-sm text-gray-600 file:mr-3 file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700"
          />
          {attachment && (
            <span className="mt-1 block truncate text-xs text-gray-500">{attachment.name}</span>
          )}
          {editingTransaction?.anexo_nome && !attachment && (
            <span className="mt-1 block truncate text-xs text-gray-500">
              Atual: {editingTransaction.anexo_nome}. Escolha outro ficheiro para substituir.
            </span>
          )}
        </label>
        <Button onClick={onSubmit} className="w-full">
          {editingTransaction ? "Guardar alterações" : "Registar movimento"}
        </Button>
        {editingTransaction && (
          <Button variant="outline" onClick={onCancel} className="w-full">
            <X className="mr-2 size-4" />
            Cancelar edição
          </Button>
        )}
      </div>
    </Card>
  );
}
