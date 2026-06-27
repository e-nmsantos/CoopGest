import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { type MetricForm as MetricFormState, initialMetricForm } from "./impactTypes";

interface MetricFormProps {
  form: MetricFormState;
  setForm: React.Dispatch<React.SetStateAction<MetricFormState>>;
  editingId: number | null;
  setEditingId: (id: number | null) => void;
  isSubmitting: boolean;
  handleSubmit: (e: React.FormEvent) => void;
}

export function MetricForm({
  form,
  setForm,
  editingId,
  setEditingId,
  isSubmitting,
  handleSubmit,
}: MetricFormProps) {
  return (
    <Card className="p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {editingId ? "Editar Métrica" : "Nova Métrica de Impacto"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="metric-name">Nome</Label>
          <Input
            id="metric-name" required
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Ex: Pessoas formadas"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label>Valor atual</Label>
            <Input type="number" step="0.01" required value={form.current}
              onChange={(e) => setForm((p) => ({ ...p, current: e.target.value }))} />
          </div>
          <div>
            <Label>Meta</Label>
            <Input type="number" step="0.01" required value={form.target}
              onChange={(e) => setForm((p) => ({ ...p, target: e.target.value }))} />
          </div>
          <div>
            <Label>Unidade</Label>
            <Input value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} placeholder="pessoas, %, ton" />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.category} onValueChange={(v: "social" | "ambiental" | "economico") => setForm((p) => ({ ...p, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="ambiental">Ambiental</SelectItem>
                <SelectItem value="economico">Económico</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>ODS (separados por vírgula)</Label>
            <Input value={form.sdg} onChange={(e) => setForm((p) => ({ ...p, sdg: e.target.value }))} placeholder="4,8,13" />
          </div>
          {editingId && (
            <div>
              <Label>Notas desta atualização</Label>
              <Input value={form.notas_medicao}
                onChange={(e) => setForm((p) => ({ ...p, notas_medicao: e.target.value }))}
                placeholder="Contexto opcional" />
            </div>
          )}
        </div>
        <div className="flex gap-2 justify-end">
          {editingId && (
            <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(initialMetricForm); }}>Cancelar</Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "A guardar..." : editingId ? "Guardar" : "Criar"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
