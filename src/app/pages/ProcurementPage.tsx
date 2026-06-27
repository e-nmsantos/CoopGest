import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";
import { Header } from "../components/layout/Header";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { useProjectContext } from "../contexts/ProjectContext";
import { apiDelete, apiGet, apiPost, apiPut } from "../lib/apiClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProcurementItem {
  id: number;
  titulo: string;
  descricao: string;
  tipo: string;
  valor_estimado: number;
  valor_real: number;
  moeda: string;
  estado: string;
  data_lancamento: string;
  data_adjudicacao: string;
  fornecedor: string;
  numero_referencia: string;
  notas: string;
  criado_por: string;
  criado_em: string;
}

interface ProcurementMeta {
  tipos: string[];
  estados: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MOEDAS = ["EUR", "USD", "GBP", "CHF", "XOF", "AOA", "MZN", "CVE", "STN", "BRL", "JPY", "CAD", "AUD"];

const DEFAULT_TIPOS = ["Serviços", "Bens", "Obras", "Consultoria", "Formação", "Outro"];
const DEFAULT_ESTADOS = [
  "A identificar",
  "Em preparação",
  "A concurso",
  "Adjudicado",
  "Em execução",
  "Concluído",
  "Cancelado",
];

const ESTADO_COLORS: Record<string, string> = {
  "A identificar": "bg-gray-100 text-gray-700",
  "Em preparação": "bg-yellow-100 text-yellow-800",
  "A concurso": "bg-blue-100 text-blue-800",
  Adjudicado: "bg-indigo-100 text-indigo-800",
  "Em execução": "bg-orange-100 text-orange-800",
  Concluído: "bg-green-100 text-green-800",
  Cancelado: "bg-red-100 text-red-800",
};

const emptyForm = {
  titulo: "",
  descricao: "",
  tipo: "",
  valor_estimado: "",
  valor_real: "",
  moeda: "EUR",
  estado: "A identificar",
  data_lancamento: "",
  data_adjudicacao: "",
  fornecedor: "",
  numero_referencia: "",
  notas: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const moneyFmt = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

function money(v: number, moeda?: string) {
  if (!v && v !== 0) return "—";
  if (moeda && moeda !== "EUR") {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: moeda,
      minimumFractionDigits: 2,
    }).format(Number(v));
  }
  return moneyFmt.format(Number(v));
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ProcurementPage() {
  const { activeProject, activeProjectId } = useProjectContext();

  const [items, setItems] = useState<ProcurementItem[]>([]);
  const [meta, setMeta] = useState<ProcurementMeta>({ tipos: DEFAULT_TIPOS, estados: DEFAULT_ESTADOS });
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Load data
  const loadItems = async () => {
    if (!activeProjectId) { setItems([]); return; }
    setLoading(true);
    try {
      const data = await apiGet<ProcurementItem[]>(`/api/projects/${activeProjectId}/procurement`);
      setItems(data);
    } catch {
      toast.error("Não foi possível carregar os contratos");
    } finally {
      setLoading(false);
    }
  };

  const loadMeta = async () => {
    if (!activeProjectId) return;
    try {
      const data = await apiGet<ProcurementMeta>(`/api/projects/${activeProjectId}/procurement/meta`);
      setMeta(data);
    } catch {
      // silently fall back to defaults
    }
  };

  useEffect(() => {
    void loadItems();
    void loadMeta();
  }, [activeProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Form helpers
  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openEdit = (item: ProcurementItem) => {
    setEditingId(item.id);
    setForm({
      titulo: item.titulo ?? "",
      descricao: item.descricao ?? "",
      tipo: item.tipo ?? "",
      valor_estimado: item.valor_estimado != null ? String(item.valor_estimado) : "",
      valor_real: item.valor_real != null ? String(item.valor_real) : "",
      moeda: item.moeda ?? "EUR",
      estado: item.estado ?? "A identificar",
      data_lancamento: item.data_lancamento ?? "",
      data_adjudicacao: item.data_adjudicacao ?? "",
      fornecedor: item.fornecedor ?? "",
      numero_referencia: item.numero_referencia ?? "",
      notas: item.notas ?? "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId) return;
    if (!form.titulo.trim()) {
      toast.error("O título é obrigatório");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        valor_estimado: form.valor_estimado ? parseFloat(form.valor_estimado) : null,
        valor_real: form.valor_real ? parseFloat(form.valor_real) : null,
      };
      if (editingId) {
        await apiPut<ProcurementItem>(
          `/api/projects/${activeProjectId}/procurement/${editingId}`,
          payload
        );
        toast.success("Contrato atualizado");
      } else {
        await apiPost<ProcurementItem>(
          `/api/projects/${activeProjectId}/procurement`,
          payload
        );
        toast.success("Contrato criado");
      }
      cancelForm();
      await loadItems();
    } catch {
      toast.error("Não foi possível guardar o contrato");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!activeProjectId) return;
    try {
      await apiDelete<null>(`/api/projects/${activeProjectId}/procurement/${id}`);
      toast.success("Contrato eliminado");
      if (expandedId === id) setExpandedId(null);
      await loadItems();
    } catch {
      toast.error("Não foi possível eliminar o contrato");
    }
  };

  // Summary
  const totalEstimado = items.reduce((s, i) => s + (i.valor_estimado ?? 0), 0);
  const totalReal = items.reduce((s, i) => s + (i.valor_real ?? 0), 0);
  const execPct = totalEstimado > 0 ? Math.round((totalReal / totalEstimado) * 100) : 0;

  if (!activeProjectId) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
        <Header showBackButton />
        <div className="flex-1 min-h-0 overflow-auto p-6">
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            Seleciona um projeto ativo no topo para gerir contratos e procurement.
          </div>
        </div>
      </div>
    );
  }

  const tipos = meta.tipos?.length ? meta.tipos : DEFAULT_TIPOS;
  const estados = meta.estados?.length ? meta.estados : DEFAULT_ESTADOS;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <Header showBackButton />

      <div className="flex-1 min-h-0 overflow-auto p-6">
        {/* Page header */}
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Gestão de Contratos</h1>
            <p className="text-gray-600 mt-1">{activeProject?.name}</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="size-4 mr-2" />
            Novo contrato
          </Button>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total de contratos</p>
            <p className="text-3xl font-bold text-gray-900">{items.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Valor estimado</p>
            <p className="text-xl font-bold text-gray-900">{money(totalEstimado)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Valor real</p>
            <p className="text-xl font-bold text-gray-900">{money(totalReal)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Execução</p>
            <p className="text-3xl font-bold text-gray-900">{execPct}%</p>
            <div className="mt-1 h-1.5 rounded-full bg-gray-100">
              <div
                className={`h-1.5 rounded-full ${execPct > 100 ? "bg-red-500" : execPct >= 75 ? "bg-amber-500" : "bg-blue-500"}`}
                style={{ width: `${Math.min(execPct, 100)}%` }}
              />
            </div>
          </Card>
        </div>

        {/* Inline form */}
        {showForm && (
          <Card className="p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">
                {editingId ? "Editar contrato" : "Novo contrato"}
              </h2>
              <Button variant="ghost" size="sm" onClick={cancelForm}>
                <X className="size-4" />
              </Button>
            </div>
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
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
                <Button type="button" variant="outline" onClick={cancelForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "A guardar..." : editingId ? "Guardar alterações" : "Criar contrato"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Contracts table */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4 gap-3">
            <h2 className="font-semibold text-gray-900">Contratos</h2>
            <Badge variant="outline">{items.length}</Badge>
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-gray-500">A carregar...</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Ainda não existem contratos.{" "}
              <button
                onClick={openCreate}
                className="text-blue-600 hover:underline"
              >
                Criar o primeiro
              </button>
              .
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm text-left">
                <thead className="border-b text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="py-2 pr-3 w-6"></th>
                    <th className="py-2 pr-3">Título</th>
                    <th className="py-2 pr-3">Tipo</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2 pr-3 text-right">Valor Est.</th>
                    <th className="py-2 pr-3">Fornecedor</th>
                    <th className="py-2 pr-3">Adj.</th>
                    <th className="py-2 pr-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => {
                    const isExpanded = expandedId === item.id;
                    return (
                      <React.Fragment key={item.id}>
                        <tr className="hover:bg-gray-50">
                          <td className="py-3 pr-3">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : item.id)}
                              className="text-gray-400 hover:text-gray-700"
                            >
                              {isExpanded ? (
                                <ChevronDown className="size-4" />
                              ) : (
                                <ChevronRight className="size-4" />
                              )}
                            </button>
                          </td>
                          <td className="py-3 pr-3 font-medium text-gray-900 max-w-[200px] truncate">
                            {item.titulo}
                          </td>
                          <td className="py-3 pr-3 text-gray-600">{item.tipo || "—"}</td>
                          <td className="py-3 pr-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                ESTADO_COLORS[item.estado] ?? "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {item.estado}
                            </span>
                          </td>
                          <td className="py-3 pr-3 text-right text-gray-700 font-medium">
                            {item.valor_estimado != null ? money(item.valor_estimado, item.moeda) : "—"}
                          </td>
                          <td className="py-3 pr-3 text-gray-600 max-w-[140px] truncate">
                            {item.fornecedor || "—"}
                          </td>
                          <td className="py-3 pr-3 text-gray-500 text-xs">
                            {item.data_adjudicacao || "—"}
                          </td>
                          <td className="py-3 pr-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(item)}
                                title="Editar"
                              >
                                <Pencil className="size-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => void handleDelete(item.id)}
                                title="Eliminar"
                              >
                                <Trash2 className="size-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-gray-50">
                            <td colSpan={8} className="px-4 py-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  {item.descricao && (
                                    <div className="mb-2">
                                      <span className="text-xs font-semibold text-gray-500 uppercase">Descrição</span>
                                      <p className="text-gray-700 mt-0.5">{item.descricao}</p>
                                    </div>
                                  )}
                                  {item.notas && (
                                    <div className="mb-2">
                                      <span className="text-xs font-semibold text-gray-500 uppercase">Notas</span>
                                      <p className="text-gray-700 mt-0.5">{item.notas}</p>
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-1.5 text-gray-600">
                                  {item.numero_referencia && (
                                    <p>
                                      <span className="font-medium">Referência:</span> {item.numero_referencia}
                                    </p>
                                  )}
                                  {item.data_lancamento && (
                                    <p>
                                      <span className="font-medium">Lançamento:</span> {item.data_lancamento}
                                    </p>
                                  )}
                                  {item.valor_real != null && (
                                    <p>
                                      <span className="font-medium">Valor real:</span>{" "}
                                      {money(item.valor_real, item.moeda)}
                                    </p>
                                  )}
                                  {item.moeda && item.moeda !== "EUR" && (
                                    <p>
                                      <span className="font-medium">Moeda:</span> {item.moeda}
                                    </p>
                                  )}
                                  {item.criado_por && (
                                    <p className="text-xs text-gray-400">
                                      Criado por {item.criado_por}
                                      {item.criado_em && ` em ${new Date(item.criado_em).toLocaleDateString("pt-PT")}`}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
