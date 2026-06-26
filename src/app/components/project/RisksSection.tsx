import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Trash2, Pencil, Check, X, ChevronDown, ChevronUp } from "lucide-react";
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
  dono?: string;
  proxima_revisao?: string;
  plano_contingencia?: string;
  score?: number;
  nivel_risco?: string;
  criado_em?: string;
}

interface RisksSectionProps {
  projectId: string;
  initialRisks?: DbRisk[];
}

const PROBABILIDADES = ["Baixo", "Médio", "Alto", "Muito Alto"];
const IMPACTOS = ["Baixo", "Médio", "Alto", "Muito Alto"];
const ESTADOS = ["Identificado", "Em análise", "Em mitigação", "Mitigado", "Concretizado", "Aceite"];

const NIVEL_COLORS: Record<string, string> = {
  Baixo: "border-l-4 border-green-400 bg-green-50",
  Médio: "border-l-4 border-yellow-400 bg-yellow-50",
  Alto: "border-l-4 border-orange-400 bg-orange-50",
  Crítico: "border-l-4 border-red-500 bg-red-50",
};

const NIVEL_BADGE: Record<string, "outline" | "secondary" | "destructive"> = {
  Baixo: "outline",
  Médio: "secondary",
  Alto: "destructive",
  Crítico: "destructive",
};

function riskNivel(prob: string, imp: string): string {
  const ORDER = ["Baixo", "Médio", "Alto", "Muito Alto"];
  const p = ORDER.indexOf(prob) + 1;
  const i = ORDER.indexOf(imp) + 1;
  const score = p * i;
  if (score <= 2) return "Baixo";
  if (score <= 6) return "Médio";
  if (score <= 9) return "Alto";
  return "Crítico";
}

export function RisksSection({ projectId, initialRisks = [] }: RisksSectionProps) {
  const [risks, setRisks] = useState<DbRisk[]>(initialRisks);
  const [form, setForm] = useState({
    descricao: "",
    probabilidade: "Médio",
    impacto: "Médio",
    mitigacao: "",
    dono: "",
    proxima_revisao: "",
    plano_contingencia: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    estado: "",
    mitigacao: "",
    dono: "",
    proxima_revisao: "",
    plano_contingencia: "",
    probabilidade: "Médio",
    impacto: "Médio",
  });
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleAdd = async () => {
    if (!form.descricao.trim()) return;
    try {
      const raw = await apiPost<DbRisk>(`/api/projects/${projectId}/risks`, form);
      setRisks((prev) => [...prev, raw]);
      setForm({ descricao: "", probabilidade: "Médio", impacto: "Médio", mitigacao: "", dono: "", proxima_revisao: "", plano_contingencia: "" });
      toast.success("Risco adicionado");
    } catch {
      toast.error("Erro ao adicionar risco");
    }
  };

  const handleDelete = async (id: number) => {
    setRisks((prev) => prev.filter((r) => r.id !== id));
    try {
      await apiDelete<null>(`/api/risks/${id}`);
      toast.success("Risco eliminado");
    } catch {
      toast.error("Erro ao eliminar risco");
    }
  };

  const startEdit = (risk: DbRisk) => {
    setEditingId(risk.id);
    setEditForm({
      estado: risk.estado || "Identificado",
      mitigacao: risk.mitigacao || "",
      dono: risk.dono || "",
      proxima_revisao: risk.proxima_revisao || "",
      plano_contingencia: risk.plano_contingencia || "",
      probabilidade: risk.probabilidade || "Médio",
      impacto: risk.impacto || "Médio",
    });
  };

  const saveEdit = async (id: number) => {
    try {
      const updated = await apiPut<DbRisk>(`/api/risks/${id}`, editForm);
      setRisks((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setEditingId(null);
      toast.success("Risco atualizado");
    } catch {
      toast.error("Erro ao atualizar risco");
    }
  };

  // Sort by descending risk score
  const sortedRisks = [...risks].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // Summary by level
  const summary = sortedRisks.reduce<Record<string, number>>((acc, r) => {
    const n = r.nivel_risco ?? riskNivel(r.probabilidade ?? "Médio", r.impacto ?? "Médio");
    acc[n] = (acc[n] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      {risks.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {(["Crítico", "Alto", "Médio", "Baixo"] as const).map((n) =>
            summary[n] ? (
              <div key={n} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                n === "Crítico" ? "bg-red-100 text-red-800" :
                n === "Alto" ? "bg-orange-100 text-orange-800" :
                n === "Médio" ? "bg-yellow-100 text-yellow-800" :
                "bg-green-100 text-green-800"
              }`}>
                <span>{summary[n]}</span>
                <span>{n}{summary[n] > 1 ? "s" : ""}</span>
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Form */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 text-sm">Adicionar Risco</h3>
        <Input
          placeholder="Descrição do risco *"
          value={form.descricao}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Probabilidade</p>
            <Select value={form.probabilidade} onValueChange={(v) => setForm({ ...form, probabilidade: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PROBABILIDADES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Impacto</p>
            <Select value={form.impacto} onValueChange={(v) => setForm({ ...form, impacto: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{IMPACTOS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Dono</p>
            <Input
              placeholder="Responsável"
              value={form.dono}
              onChange={(e) => setForm({ ...form, dono: e.target.value })}
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Próxima revisão</p>
            <Input
              type="date"
              value={form.proxima_revisao}
              onChange={(e) => setForm({ ...form, proxima_revisao: e.target.value })}
            />
          </div>
        </div>
        <Input
          placeholder="Medida de mitigação (opcional)"
          value={form.mitigacao}
          onChange={(e) => setForm({ ...form, mitigacao: e.target.value })}
        />
        <Input
          placeholder="Plano de contingência (opcional)"
          value={form.plano_contingencia}
          onChange={(e) => setForm({ ...form, plano_contingencia: e.target.value })}
        />
        <Button onClick={() => void handleAdd()} disabled={!form.descricao.trim()}>
          Adicionar Risco
        </Button>
      </div>

      {/* List */}
      {risks.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">Sem riscos registados</div>
      ) : (
        <div className="space-y-3">
          {sortedRisks.map((risk) => {
            const nivel = risk.nivel_risco ?? riskNivel(risk.probabilidade ?? "Médio", risk.impacto ?? "Médio");
            const isOverdue = risk.proxima_revisao && new Date(risk.proxima_revisao) < new Date() && risk.estado !== "Mitigado";
            const isExpanded = expandedId === risk.id;

            return (
              <div key={risk.id} className={`rounded-lg group ${NIVEL_COLORS[nivel] ?? NIVEL_COLORS["Médio"]}`}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 mb-2">{risk.descricao}</p>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant={NIVEL_BADGE[nivel] ?? "secondary"}>{nivel}</Badge>
                        <span className="text-xs text-gray-500">Prob: <strong>{risk.probabilidade}</strong></span>
                        <span className="text-xs text-gray-500">Impacto: <strong>{risk.impacto}</strong></span>
                        <Badge variant={risk.estado === "Mitigado" ? "outline" : "secondary"}>{risk.estado || "Identificado"}</Badge>
                        {risk.dono && <span className="text-xs text-gray-500">Dono: <strong>{risk.dono}</strong></span>}
                        {isOverdue && (
                          <span className="text-xs text-red-600 font-medium">⚠ Revisão em atraso ({risk.proxima_revisao})</span>
                        )}
                        {risk.proxima_revisao && !isOverdue && (
                          <span className="text-xs text-gray-400">Revisão: {risk.proxima_revisao}</span>
                        )}
                      </div>

                      {editingId === risk.id ? (
                        <div className="space-y-2 mt-2">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <Select value={editForm.estado} onValueChange={(v) => setEditForm({ ...editForm, estado: v })}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>{ESTADOS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={editForm.probabilidade} onValueChange={(v) => setEditForm({ ...editForm, probabilidade: v })}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>{PROBABILIDADES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={editForm.impacto} onValueChange={(v) => setEditForm({ ...editForm, impacto: v })}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>{IMPACTOS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                            </Select>
                            <Input className="h-8 text-xs" placeholder="Dono" value={editForm.dono}
                              onChange={(e) => setEditForm({ ...editForm, dono: e.target.value })} />
                          </div>
                          <Input className="h-8 text-xs" placeholder="Próxima revisão" type="date"
                            value={editForm.proxima_revisao}
                            onChange={(e) => setEditForm({ ...editForm, proxima_revisao: e.target.value })} />
                          <Input className="h-8 text-xs" placeholder="Mitigação" value={editForm.mitigacao}
                            onChange={(e) => setEditForm({ ...editForm, mitigacao: e.target.value })} />
                          <Input className="h-8 text-xs" placeholder="Plano de contingência" value={editForm.plano_contingencia}
                            onChange={(e) => setEditForm({ ...editForm, plano_contingencia: e.target.value })} />
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => void saveEdit(risk.id)}><Check className="size-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="size-4" /></Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {risk.mitigacao && (
                            <p className="text-xs text-gray-600">
                              <span className="font-medium">Mitigação:</span> {risk.mitigacao}
                            </p>
                          )}
                          {risk.plano_contingencia && (
                            <p className="text-xs text-gray-600">
                              <span className="font-medium">Contingência:</span> {risk.plano_contingencia}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="ghost" onClick={() => setExpandedId(isExpanded ? null : risk.id)}>
                        {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => startEdit(risk)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => void handleDelete(risk.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t bg-white/60 px-4 py-3 text-xs text-gray-600 space-y-1 rounded-b-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div><span className="text-gray-400">Probabilidade</span><br /><strong>{risk.probabilidade}</strong></div>
                      <div><span className="text-gray-400">Impacto</span><br /><strong>{risk.impacto}</strong></div>
                      <div><span className="text-gray-400">Nível de risco</span><br /><strong>{nivel}</strong></div>
                      <div><span className="text-gray-400">Estado</span><br /><strong>{risk.estado}</strong></div>
                    </div>
                    {risk.dono && <div><span className="text-gray-400">Dono: </span><strong>{risk.dono}</strong></div>}
                    {risk.proxima_revisao && <div><span className="text-gray-400">Próxima revisão: </span><strong className={isOverdue ? "text-red-600" : ""}>{risk.proxima_revisao}</strong></div>}
                    {risk.mitigacao && <div><span className="text-gray-400">Mitigação: </span>{risk.mitigacao}</div>}
                    {risk.plano_contingencia && <div><span className="text-gray-400">Contingência: </span>{risk.plano_contingencia}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
