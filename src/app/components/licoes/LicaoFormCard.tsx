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
import { LicaoForm, TIPOS, IMPACTOS, AREAS, FASES } from "./licoes.types";

interface Props {
  form: LicaoForm;
  setForm: React.Dispatch<React.SetStateAction<LicaoForm>>;
  editingId: number | null;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancelEdit: () => void;
}

export function LicaoFormCard({ form, setForm, editingId, isSubmitting, onSubmit, onCancelEdit }: Props) {
  return (
    <Card className="p-6 mb-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        {editingId ? "Editar lição" : "Registar lição aprendida"}
      </h2>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        <div>
          <Label htmlFor="titulo">Título *</Label>
          <Input
            id="titulo"
            required
            value={form.titulo}
            onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
            placeholder="Ex: Envolvimento precoce das comunidades melhora a adesão"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm((p) => ({ ...p, tipo: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Impacto</Label>
            <Select value={form.impacto} onValueChange={(v) => setForm((p) => ({ ...p, impacto: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {IMPACTOS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Área</Label>
            <Select value={form.area} onValueChange={(v) => setForm((p) => ({ ...p, area: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fase do projeto</Label>
            <Select value={form.fase_projeto} onValueChange={(v) => setForm((p) => ({ ...p, fase_projeto: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FASES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Descrição</Label>
          <Textarea
            value={form.descricao}
            onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
            placeholder="O que aconteceu? Qual foi o contexto? Quais foram os fatores?"
            rows={3}
            className="text-sm"
          />
        </div>

        <div>
          <Label>Recomendação para projetos futuros</Label>
          <Textarea
            value={form.recomendacao}
            onChange={(e) => setForm((p) => ({ ...p, recomendacao: e.target.value }))}
            placeholder="O que deve ser feito de forma diferente (ou igual) em projetos futuros?"
            rows={2}
            className="text-sm"
          />
        </div>

        <div className="flex justify-end gap-2">
          {editingId && (
            <Button type="button" variant="outline" onClick={onCancelEdit}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "A guardar..." : editingId ? "Guardar alterações" : "Registar lição"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
