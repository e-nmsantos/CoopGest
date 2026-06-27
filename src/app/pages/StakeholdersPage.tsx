import { useState, useEffect, useCallback } from "react";
import { useProjectContext } from "../contexts/ProjectContext";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/apiClient";
import { toast } from "sonner";
import { Plus, Users, Grid3X3, List } from "lucide-react";
import {
  Stakeholder,
  MatrixData,
  View,
  EMPTY_FORM,
} from "../components/stakeholders/stakeholders.types";
import { StakeholderForm } from "../components/stakeholders/StakeholderForm";
import { StakeholderMatrix } from "../components/stakeholders/StakeholderMatrix";
import { StakeholderList } from "../components/stakeholders/StakeholderList";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

export function StakeholdersPage() {
  const { activeProjectId, activeProject } = useProjectContext();
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [matrix, setMatrix] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("matriz");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<Stakeholder, "id" | "criado_por">>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteSk, setConfirmDeleteSk] = useState<Stakeholder | null>(null);

  const fetchData = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const [sks, mat] = await Promise.all([
        apiGet<Stakeholder[]>(`/api/projects/${id}/stakeholders`),
        apiGet<MatrixData>(`/api/projects/${id}/stakeholders/matrix`),
      ]);
      setStakeholders(Array.isArray(sks) ? sks : []);
      setMatrix(mat && typeof mat === "object" ? mat : null);
    } catch {
      toast.error("Erro ao carregar stakeholders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeProjectId) {
      void fetchData(Number(activeProjectId));
    } else {
      setStakeholders([]);
      setMatrix(null);
    }
  }, [activeProjectId, fetchData]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(sk: Stakeholder) {
    setForm({
      nome: sk.nome,
      organizacao: sk.organizacao,
      papel: sk.papel,
      interesse: sk.interesse,
      influencia: sk.influencia,
      posicao: sk.posicao,
      estrategia: sk.estrategia,
      contacto: sk.contacto,
      notas: sk.notas,
    });
    setEditingId(sk.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!activeProjectId) return;
    if (!form.nome.trim()) {
      toast.error("O nome é obrigatório");
      return;
    }
    setSaving(true);
    try {
      if (editingId !== null) {
        await apiPut(`/api/projects/${activeProjectId}/stakeholders/${editingId}`, form);
        toast.success("Stakeholder atualizado");
      } else {
        await apiPost(`/api/projects/${activeProjectId}/stakeholders`, form);
        toast.success("Stakeholder criado");
      }
      cancelForm();
      await fetchData(Number(activeProjectId));
    } catch {
      toast.error("Erro ao guardar stakeholder");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(sk: Stakeholder) {
    if (!activeProjectId) return;
    try {
      await apiDelete(`/api/projects/${activeProjectId}/stakeholders/${sk.id}`);
      toast.success("Stakeholder eliminado");
      await fetchData(Number(activeProjectId));
    } catch {
      toast.error("Erro ao eliminar stakeholder");
    }
  }

  // Summary counts
  const apoiantes = stakeholders.filter((s) => s.posicao === "Apoiante").length;
  const neutros = stakeholders.filter((s) => s.posicao === "Neutro").length;
  const oponentes = stakeholders.filter((s) => s.posicao === "Oponente").length;

  if (!activeProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <Users className="size-12 mb-3 opacity-40" />
        <p className="text-lg font-medium">Nenhum projeto selecionado</p>
        <p className="text-sm mt-1">Selecione um projeto para gerir stakeholders</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Stakeholders</h1>
          {activeProject && (
            <p className="text-sm text-slate-500 mt-0.5">{activeProject.name}</p>
          )}
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="size-4" />
          Adicionar Stakeholder
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-slate-800">{stakeholders.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Total</div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-700">{apoiantes}</div>
          <div className="text-xs text-green-600 mt-0.5">Apoiantes</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-slate-600">{neutros}</div>
          <div className="text-xs text-slate-500 mt-0.5">Neutros</div>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-700">{oponentes}</div>
          <div className="text-xs text-red-600 mt-0.5">Oponentes</div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <StakeholderForm
          editingId={editingId}
          form={form}
          setForm={setForm}
          saving={saving}
          onSave={() => void handleSave()}
          onCancel={cancelForm}
        />
      )}

      {/* View toggle */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setView("matriz")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            view === "matriz"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Grid3X3 className="size-4" />
          Matriz
        </button>
        <button
          onClick={() => setView("lista")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            view === "lista"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <List className="size-4" />
          Lista
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32 text-slate-500">
          <div className="animate-spin size-6 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
          A carregar...
        </div>
      )}

      {/* Matriz view */}
      {!loading && view === "matriz" && (
        <StakeholderMatrix
          matrix={matrix}
          stakeholders={stakeholders}
          loading={loading}
          onEdit={openEdit}
          onOpenCreate={openCreate}
        />
      )}

      {/* Lista view */}
      {!loading && view === "lista" && (
        <StakeholderList
          stakeholders={stakeholders}
          onEdit={openEdit}
          onDelete={(sk) => setConfirmDeleteSk(sk)}
          onOpenCreate={openCreate}
        />
      )}

      <AlertDialog open={confirmDeleteSk !== null} onOpenChange={(open) => { if (!open) setConfirmDeleteSk(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar stakeholder</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que quer eliminar &quot;{confirmDeleteSk?.nome}&quot;? Esta acção não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => { if (confirmDeleteSk) { void handleDelete(confirmDeleteSk); setConfirmDeleteSk(null); } }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
