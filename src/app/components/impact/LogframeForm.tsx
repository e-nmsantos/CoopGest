import { Button } from "../ui/button";
import { Card } from "../ui/card";
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
import {
  type LogframeForm as LogframeFormState,
  NIVEIS,
  ESTADOS_LFA,
  FREQUENCIAS,
  initialLogframeForm,
} from "./impactTypes";

interface LogframeFormProps {
  logframeForm: LogframeFormState;
  setLogframeForm: React.Dispatch<React.SetStateAction<LogframeFormState>>;
  editingLogframeId: number | null;
  setEditingLogframeId: (id: number | null) => void;
  isLogframeSubmitting: boolean;
  handleLogframeSubmit: (e: React.FormEvent) => void;
}

export function LogframeForm({
  logframeForm,
  setLogframeForm,
  editingLogframeId,
  setEditingLogframeId,
  isLogframeSubmitting,
  handleLogframeSubmit,
}: LogframeFormProps) {
  return (
    <Card className="p-6 mb-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {editingLogframeId ? "Editar indicador" : "Quadro Lógico — novo indicador"}
        </h2>
        <p className="text-sm text-gray-500">
          Estruture os indicadores por nível (Impacto → Resultado → Produção → Atividade) conforme a metodologia LFA.
        </p>
      </div>

      <form onSubmit={handleLogframeSubmit} className="space-y-4">
        {/* Level + State + Frequency */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Nível LFA</Label>
            <Select
              value={logframeForm.nivel}
              onValueChange={(v) => setLogframeForm((p) => ({ ...p, nivel: v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NIVEIS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Situação</Label>
            <Select
              value={logframeForm.estado}
              onValueChange={(v) => setLogframeForm((p) => ({ ...p, estado: v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ESTADOS_LFA.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Frequência de medição</Label>
            <Select
              value={logframeForm.frequencia_medicao}
              onValueChange={(v) => setLogframeForm((p) => ({ ...p, frequencia_medicao: v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FREQUENCIAS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Outcome + Indicator */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="logframe-result">Resultado esperado</Label>
            <Input
              id="logframe-result"
              required
              value={logframeForm.resultado}
              onChange={(e) => setLogframeForm((p) => ({ ...p, resultado: e.target.value }))}
              placeholder="Ex: Jovens aumentam competências digitais"
            />
          </div>
          <div>
            <Label htmlFor="logframe-indicator">Indicador</Label>
            <Input
              id="logframe-indicator"
              required
              value={logframeForm.indicador}
              onChange={(e) => setLogframeForm((p) => ({ ...p, indicador: e.target.value }))}
              placeholder="Ex: % de participantes que concluem formação"
            />
          </div>
        </div>

        {/* Values row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <Label>Baseline</Label>
            <Input
              type="number" step="0.01"
              value={logframeForm.baseline}
              onChange={(e) => setLogframeForm((p) => ({ ...p, baseline: e.target.value }))}
            />
          </div>
          <div>
            <Label>Meta</Label>
            <Input
              type="number" step="0.01"
              value={logframeForm.meta}
              onChange={(e) => setLogframeForm((p) => ({ ...p, meta: e.target.value }))}
            />
          </div>
          <div>
            <Label>Valor atual</Label>
            <Input
              type="number" step="0.01"
              value={logframeForm.valor_atual}
              onChange={(e) => setLogframeForm((p) => ({ ...p, valor_atual: e.target.value }))}
            />
          </div>
          <div>
            <Label>Unidade</Label>
            <Input
              value={logframeForm.unidade}
              onChange={(e) => setLogframeForm((p) => ({ ...p, unidade: e.target.value }))}
              placeholder="%"
            />
          </div>
          <div>
            <Label>Próxima revisão</Label>
            <Input
              type="date"
              value={logframeForm.proxima_revisao}
              onChange={(e) => setLogframeForm((p) => ({ ...p, proxima_revisao: e.target.value }))}
            />
          </div>
        </div>

        {/* Source + Responsible */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Fonte de verificação</Label>
            <Input
              value={logframeForm.fonte_verificacao}
              onChange={(e) => setLogframeForm((p) => ({ ...p, fonte_verificacao: e.target.value }))}
              placeholder="Ex: lista de presenças, inquérito, relatório"
            />
          </div>
          <div>
            <Label>Responsável pela medição</Label>
            <Input
              value={logframeForm.responsavel_medicao}
              onChange={(e) => setLogframeForm((p) => ({ ...p, responsavel_medicao: e.target.value }))}
              placeholder="Ex: Coordenador M&E"
            />
          </div>
        </div>

        {/* Pressupostos — 5th column of LFA */}
        <div>
          <Label>Pressupostos / Riscos externos</Label>
          <Textarea
            value={logframeForm.pressupostos}
            onChange={(e) => setLogframeForm((p) => ({ ...p, pressupostos: e.target.value }))}
            placeholder="Ex: o contexto político permanece estável; os parceiros mantêm o compromisso"
            rows={2}
            className="text-sm"
          />
        </div>

        {editingLogframeId && (
          <div>
            <Label>Notas desta atualização</Label>
            <Input
              value={logframeForm.notas_medicao}
              onChange={(e) => setLogframeForm((p) => ({ ...p, notas_medicao: e.target.value }))}
              placeholder="Opcional — contexto sobre a alteração do valor"
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          {editingLogframeId && (
            <Button type="button" variant="outline" onClick={() => { setEditingLogframeId(null); setLogframeForm(initialLogframeForm); }}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isLogframeSubmitting}>
            {isLogframeSubmitting ? "A guardar..." : editingLogframeId ? "Guardar alterações" : "Adicionar indicador"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
