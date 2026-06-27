import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useProjectContext } from "../contexts/ProjectContext";
import { apiDelete, apiGet, apiPost, apiPut } from "../lib/apiClient";
import { Licao, LicaoForm, initialForm } from "../components/licoes/licoes.types";

export function useLicoes() {
  const { activeProjectId } = useProjectContext();
  const [licoes, setLicoes] = useState<Licao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<LicaoForm>(initialForm);
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterArea, setFilterArea] = useState<string>("all");

  const loadLicoes = async () => {
    if (!activeProjectId) return;
    setIsLoading(true);
    try {
      const data = await apiGet<Licao[]>(`/api/projects/${activeProjectId}/lessons`);
      setLicoes(data);
    } catch {
      toast.error("Não foi possível carregar as lições aprendidas");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLicoes();
  }, [activeProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId) return;
    setIsSubmitting(true);
    try {
      if (editingId) {
        await apiPut<Licao>(`/api/projects/${activeProjectId}/lessons/${editingId}`, form);
        toast.success("Lição atualizada");
      } else {
        await apiPost<Licao>(`/api/projects/${activeProjectId}/lessons`, form);
        toast.success("Lição registada");
      }
      setForm(initialForm);
      setEditingId(null);
      setShowForm(false);
      await loadLicoes();
    } catch {
      toast.error("Não foi possível guardar a lição");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (l: Licao) => {
    setForm({
      titulo: l.titulo,
      descricao: l.descricao,
      area: l.area,
      fase_projeto: l.fase_projeto,
      tipo: l.tipo,
      impacto: l.impacto,
      recomendacao: l.recomendacao,
    });
    setEditingId(l.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (!activeProjectId) return;
    try {
      await apiDelete(`/api/projects/${activeProjectId}/lessons/${id}`);
      toast.success("Lição eliminada");
      await loadLicoes();
    } catch {
      toast.error("Não foi possível eliminar");
    }
  };

  const handleToggleForm = () => {
    setShowForm((v) => !v);
    if (editingId) {
      setEditingId(null);
      setForm(initialForm);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(initialForm);
    setShowForm(false);
  };

  const filtered = licoes.filter((l) => {
    if (filterTipo !== "all" && l.tipo !== filterTipo) return false;
    if (filterArea !== "all" && l.area !== filterArea) return false;
    return true;
  });

  const counts = {
    positivas: licoes.filter((l) => l.tipo === "Positiva").length,
    negativas: licoes.filter((l) => l.tipo === "Negativa").length,
    neutras: licoes.filter((l) => l.tipo === "Neutra").length,
  };

  return {
    licoes,
    isLoading,
    showForm,
    editingId,
    isSubmitting,
    form,
    setForm,
    filterTipo,
    setFilterTipo,
    filterArea,
    setFilterArea,
    filtered,
    counts,
    handleSubmit,
    handleEdit,
    handleDelete,
    handleToggleForm,
    handleCancelEdit,
  };
}
