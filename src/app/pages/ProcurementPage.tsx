import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Header } from "../components/layout/Header";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { toast } from "sonner";
import { useProjectContext } from "../contexts/ProjectContext";
import { apiDelete, apiGet, apiPost, apiPut } from "../lib/apiClient";
import {
  DEFAULT_ESTADOS,
  DEFAULT_TIPOS,
  emptyForm,
  money,
  ProcurementItem,
  ProcurementMeta,
} from "../components/procurement/procurement.types";
import { ProcurementForm } from "../components/procurement/ProcurementForm";
import { ProcurementTable } from "../components/procurement/ProcurementTable";

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
          <ProcurementForm
            editingId={editingId}
            form={form}
            setForm={setForm}
            submitting={submitting}
            tipos={tipos}
            estados={estados}
            onSubmit={(e) => void handleSubmit(e)}
            onCancel={cancelForm}
          />
        )}

        {/* Contracts table */}
        {loading && items.length === 0 ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <ProcurementTable
            items={items}
            loading={loading}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            onEdit={openEdit}
            onDelete={(id) => void handleDelete(id)}
            onOpenCreate={openCreate}
          />
        )}
      </div>
    </div>
  );
}
