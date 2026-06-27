import React from "react";
import { X } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { emptyForm, MOEDAS } from "./procurement.types";

interface ProcurementFormProps {
  editingId: number | null;
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  submitting: boolean;
  tipos: string[];
  estados: string[];
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function ProcurementForm({
  editingId,
  form,
  setForm,
  submitting,
  tipos,
  estados,
  onSubmit,
  onCancel,
}: ProcurementFormProps) {
  return (
    <Card className="p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">
          {editingId ? "Editar contrato" : "Novo contrato"}
        </h2>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="size-4" />
        </Button>
      </div>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        {/* Row 1: title (required) */}
        <div>
          <Label htmlFor="pc-titulo">Título *</Label>
          <Input
            id="pc-titulo"
            required
            value={form.titulo}
            onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
            placeholder="Ex: Prestação de serviços de formação"
          />
        </div>

        {/* Row 2: tipo, estado, moeda */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Tipo</Label>
            <Select
              value={form.tipo}
              onValueChange={(v) => setForm((p) => ({ ...p, tipo: v }))}
            >
              <SelectTrigger><SelectValue placeholder="Selecionar tipo" /></SelectTrigger>
              <SelectContent>
                {tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Estado</Label>
            <Select
              value={form.estado}
              onValueChange={(v) => setForm((p) => ({ ...p, estado: v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {estados.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Moeda</Label>
            <Select
              value={form.moeda}
              onValueChange={(v) => setForm((p) => ({ ...p, moeda: v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MOEDAS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 3: valores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="pc-val-est">Valor estimado</Label>
            <Input
              id="pc-val-est"
              type="number"
              min="0"
              step="0.01"
              value={form.valor_estimado}
              onChange={(e) => setForm((p) => ({ ...p, valor_estimado: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="pc-val-real">Valor real</Label>
            <Input
              id="pc-val-real"
              type="number"
              min="0"
              step="0.01"
              value={form.valor_real}
              onChange={(e) => setForm((p) => ({ ...p, valor_real: e.target.value }))}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Row 4: dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="pc-lancamento">Data de lançamento</Label>
            <Input
              id="pc-lancamento"
              type="date"
              value={form.data_lancamento}
              onChange={(e) => setForm((p) => ({ ...p, data_lancamento: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="pc-adjudicacao">Data de adjudicação</Label>
            <Input
              id="pc-adjudicacao"
              type="date"
              value={form.data_adjudicacao}
              onChange={(e) => setForm((p) => ({ ...p, data_adjudicacao: e.target.value }))}
            />
          </div>
        </div>

        {/* Row 5: fornecedor, referência */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="pc-fornecedor">Fornecedor</Label>
            <Input
              id="pc-fornecedor"
              value={form.fornecedor}
              onChange={(e) => setForm((p) => ({ ...p, fornecedor: e.target.value }))}
              placeholder="Ex: Empresa XYZ, Lda."
            />
          </div>
          <div>
            <Label htmlFor="pc-ref">Número de referência</Label>
            <Input
              id="pc-ref"
              value={form.numero_referencia}
              onChange={(e) => setForm((p) => ({ ...p, numero_referencia: e.target.value }))}
              placeholder="Ex: PC-2025-001"
            />
          </div>
        </div>

        {/* Row 6: descrição */}
        <div>
          <Label htmlFor="pc-desc">Descrição</Label>
          <Textarea
            id="pc-desc"
            value={form.descricao}
            onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
            rows={2}
            className="text-sm"
            placeholder="Descrição do contrato ou serviço"
          />
        </div>

        {/* Row 7: notas */}
        <div>
          <Label htmlFor="pc-notas">Notas</Label>
          <Textarea
            id="pc-notas"
            value={form.notas}
            onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
            rows={2}
            className="text-sm"
            placeholder="Observações internas"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "A guardar..." : editingId ? "Guardar alterações" : "Criar contrato"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
