import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Progress } from "../ui/progress";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiPost } from "../../lib/apiClient";
import { DEFAULT_CURRENCY, formatMoney } from "../../lib/currency";

interface DbFundingSource {
  id: number;
  projeto_id: number;
  nome: string;
  tipo: string;
  valor_aprovado: number;
  valor_executado: number;
  moeda?: string;
  data_inicio?: string;
  data_fim?: string;
  referencia?: string;
}

interface FundingSource {
  id: string;
  nome: string;
  tipo: string;
  valorAprovado: number;
  valorExecutado: number;
  moeda: string;
  dataInicio: string;
  dataFim: string;
  referencia: string;
}

function fromDb(f: DbFundingSource): FundingSource {
  return {
    id: String(f.id),
    nome: f.nome,
    tipo: f.tipo || "Fundo Europeu",
    valorAprovado: f.valor_aprovado || 0,
    valorExecutado: f.valor_executado || 0,
    moeda: f.moeda || DEFAULT_CURRENCY,
    dataInicio: f.data_inicio || "",
    dataFim: f.data_fim || "",
    referencia: f.referencia || "",
  };
}

const TIPOS = ["Fundo Europeu", "Fundo Nacional", "Privado", "Próprio", "Outro"];

interface FundingSectionProps {
  projectId: string;
  initialFunding?: DbFundingSource[];
}

export function FundingSection({ projectId, initialFunding = [] }: FundingSectionProps) {
  const [sources, setSources] = useState<FundingSource[]>(initialFunding.map(fromDb));
  const [form, setForm] = useState({
    nome: "",
    tipo: "Fundo Europeu",
    valorAprovado: "",
    valorExecutado: "",
    dataInicio: "",
    dataFim: "",
    referencia: "",
  });

  const totalAprovado = sources.reduce((s, f) => s + f.valorAprovado, 0);
  const totalExecutado = sources.reduce((s, f) => s + f.valorExecutado, 0);
  const pctExecutado = totalAprovado > 0 ? Math.round((totalExecutado / totalAprovado) * 100) : 0;

  const handleAdd = async () => {
    if (!form.nome.trim()) return;
    try {
      const raw = await apiPost<DbFundingSource>(`/api/projects/${projectId}/funding`, {
        nome: form.nome,
        tipo: form.tipo,
        valor_aprovado: parseFloat(form.valorAprovado) || 0,
        valor_executado: parseFloat(form.valorExecutado) || 0,
        data_inicio: form.dataInicio || null,
        data_fim: form.dataFim || null,
        referencia: form.referencia,
      });
      setSources((prev) => [...prev, fromDb(raw)]);
      setForm({ nome: "", tipo: "Fundo Europeu", valorAprovado: "", valorExecutado: "", dataInicio: "", dataFim: "", referencia: "" });
      toast.success("Fonte adicionada!");
    } catch {
      toast.error("Erro ao adicionar fonte de financiamento");
    }
  };

  const handleDelete = async (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
    try {
      await apiDelete<null>(`/api/funding/${id}`);
      toast.success("Fonte eliminada");
    } catch {
      toast.error("Erro ao eliminar fonte");
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="text-sm text-blue-700 mb-1">Total Aprovado</div>
          <div className="text-2xl font-semibold text-blue-800">{formatMoney(totalAprovado)}</div>
        </Card>
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="text-sm text-green-700 mb-1">Total Executado</div>
          <div className="text-2xl font-semibold text-green-800">{formatMoney(totalExecutado)}</div>
        </Card>
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="text-sm text-yellow-700 mb-1">Saldo Disponível</div>
          <div className="text-2xl font-semibold text-yellow-800">{formatMoney(totalAprovado - totalExecutado)}</div>
        </Card>
        <Card className="p-4 bg-purple-50 border-purple-200">
          <div className="text-sm text-purple-700 mb-1">% Executado</div>
          <div className="text-2xl font-semibold text-purple-800">{pctExecutado}%</div>
          <Progress value={pctExecutado} className="mt-2 h-1.5" />
        </Card>
      </div>

      {/* Formulário */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Adicionar Fonte de Financiamento</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <Input
            placeholder="Nome da fonte *"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
          <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            placeholder="Referência / Nº contrato"
            value={form.referencia}
            onChange={(e) => setForm({ ...form, referencia: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Input
            type="number"
            placeholder="Valor aprovado (USD)"
            value={form.valorAprovado}
            onChange={(e) => setForm({ ...form, valorAprovado: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Valor executado (USD)"
            value={form.valorExecutado}
            onChange={(e) => setForm({ ...form, valorExecutado: e.target.value })}
          />
          <Input
            type="date"
            placeholder="Data início"
            value={form.dataInicio}
            onChange={(e) => setForm({ ...form, dataInicio: e.target.value })}
          />
          <Input
            type="date"
            placeholder="Data fim"
            value={form.dataFim}
            onChange={(e) => setForm({ ...form, dataFim: e.target.value })}
          />
        </div>
        <Button onClick={handleAdd} disabled={!form.nome.trim()}>Adicionar Fonte</Button>
      </Card>

      {/* Lista */}
      {sources.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Sem fontes de financiamento registadas</div>
      ) : (
        <div className="space-y-3">
          {sources.map((src) => {
            const pct = src.valorAprovado > 0
              ? Math.round((src.valorExecutado / src.valorAprovado) * 100)
              : 0;
            return (
              <Card key={src.id} className="p-4 group">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-gray-900">{src.nome}</span>
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{src.tipo}</span>
                      {src.moeda && src.moeda !== DEFAULT_CURRENCY && (
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">{src.moeda}</span>
                      )}
                      {src.referencia && (
                        <span className="text-xs text-gray-500">Ref: {src.referencia}</span>
                      )}
                    </div>
                    <div className="flex gap-6 text-sm text-gray-600 mb-2">
                      <span>Aprovado: <strong>{formatMoney(src.valorAprovado, src.moeda)}</strong></span>
                      <span>Executado: <strong>{formatMoney(src.valorExecutado, src.moeda)}</strong></span>
                      <span>Saldo: <strong>{formatMoney(src.valorAprovado - src.valorExecutado, src.moeda)}</strong></span>
                      {src.dataInicio && src.dataFim && (
                        <span className="text-gray-400">{src.dataInicio} → {src.dataFim}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-2 flex-1 max-w-xs" />
                      <span className="text-xs text-gray-500">{pct}% executado</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                    onClick={() => handleDelete(src.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
