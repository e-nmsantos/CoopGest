import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiPost, apiPut } from "../../lib/apiClient";

interface DbRisk {
  id: number;
  projeto_id: number;
  descricao: string;
  probabilidade?: string;
  impacto?: string;
  estado?: string;
  mitigacao?: string;
  criado_em?: string;
}

interface RisksSectionProps {
  projectId: string;
  initialRisks?: DbRisk[];
}

const LEVELS = ['Baixo', 'Médio', 'Alto'];
const ESTADOS = ['Identificado', 'Em mitigação', 'Resolvido'];

function riskColor(probabilidade: string, impacto: string) {
  const score = (LEVELS.indexOf(probabilidade) + 1) * (LEVELS.indexOf(impacto) + 1);
  if (score >= 6) return 'border-l-4 border-red-400 bg-red-50';
  if (score >= 3) return 'border-l-4 border-yellow-400 bg-yellow-50';
  return 'border-l-4 border-green-400 bg-green-50';
}

function badgeVariant(nivel: string): 'destructive' | 'secondary' | 'outline' {
  if (nivel === 'Alto') return 'destructive';
  if (nivel === 'Médio') return 'secondary';
  return 'outline';
}

export function RisksSection({ projectId, initialRisks = [] }: RisksSectionProps) {
  const [risks, setRisks] = useState<DbRisk[]>(initialRisks);
  const [form, setForm] = useState({ descricao: '', probabilidade: 'Médio', impacto: 'Médio', mitigacao: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ estado: '', mitigacao: '' });

  const handleAdd = async () => {
    if (!form.descricao.trim()) return;
    try {
      const raw = await apiPost<DbRisk>(`/api/projects/${projectId}/risks`, form);
      setRisks((prev) => [...prev, raw]);
      setForm({ descricao: '', probabilidade: 'Médio', impacto: 'Médio', mitigacao: '' });
      toast.success('Risco adicionado');
    } catch {
      toast.error('Erro ao adicionar risco');
    }
  };

  const handleDelete = async (id: number) => {
    setRisks((prev) => prev.filter((r) => r.id !== id));
    try {
      await apiDelete<null>(`/api/risks/${id}`);
      toast.success('Risco eliminado');
    } catch {
      toast.error('Erro ao eliminar risco');
    }
  };

  const startEdit = (risk: DbRisk) => {
    setEditingId(risk.id);
    setEditForm({ estado: risk.estado || 'Identificado', mitigacao: risk.mitigacao || '' });
  };

  const saveEdit = async (id: number) => {
    try {
      const updated = await apiPut<DbRisk>(`/api/risks/${id}`, editForm);
      setRisks((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setEditingId(null);
      toast.success('Risco atualizado');
    } catch {
      toast.error('Erro ao atualizar risco');
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulário */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 text-sm">Adicionar Risco</h3>
        <Input
          placeholder="Descrição do risco *"
          value={form.descricao}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Select value={form.probabilidade} onValueChange={(v) => setForm({ ...form, probabilidade: v })}>
            <SelectTrigger><SelectValue placeholder="Probabilidade" /></SelectTrigger>
            <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={form.impacto} onValueChange={(v) => setForm({ ...form, impacto: v })}>
            <SelectTrigger><SelectValue placeholder="Impacto" /></SelectTrigger>
            <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
          </Select>
          <Input
            placeholder="Mitigação (opcional)"
            value={form.mitigacao}
            onChange={(e) => setForm({ ...form, mitigacao: e.target.value })}
            className="col-span-2"
          />
        </div>
        <Button onClick={handleAdd} disabled={!form.descricao.trim()}>Adicionar Risco</Button>
      </div>

      {/* Lista */}
      {risks.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">Sem riscos registados</div>
      ) : (
        <div className="space-y-3">
          {risks.map((risk) => (
            <div key={risk.id} className={`rounded-lg p-4 group ${riskColor(risk.probabilidade || 'Baixo', risk.impacto || 'Baixo')}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-2">{risk.descricao}</p>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500">Prob:</span>
                    <Badge variant={badgeVariant(risk.probabilidade || 'Baixo')}>{risk.probabilidade || 'Baixo'}</Badge>
                    <span className="text-xs text-gray-500">Impacto:</span>
                    <Badge variant={badgeVariant(risk.impacto || 'Baixo')}>{risk.impacto || 'Baixo'}</Badge>
                    <Badge variant={risk.estado === 'Resolvido' ? 'outline' : 'secondary'}>{risk.estado || 'Identificado'}</Badge>
                  </div>

                  {editingId === risk.id ? (
                    <div className="flex gap-2 mt-2">
                      <Select value={editForm.estado} onValueChange={(v) => setEditForm({ ...editForm, estado: v })}>
                        <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{ESTADOS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input
                        className="h-8 text-xs"
                        placeholder="Mitigação"
                        value={editForm.mitigacao}
                        onChange={(e) => setEditForm({ ...editForm, mitigacao: e.target.value })}
                      />
                      <Button size="sm" variant="ghost" onClick={() => saveEdit(risk.id)}><Check className="size-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="size-4" /></Button>
                    </div>
                  ) : (
                    risk.mitigacao && (
                      <p className="text-xs text-gray-600 mt-1">
                        <span className="font-medium">Mitigação:</span> {risk.mitigacao}
                      </p>
                    )
                  )}
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(risk)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => handleDelete(risk.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
