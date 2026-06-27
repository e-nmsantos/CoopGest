import { Header } from "../components/layout/Header";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Lightbulb, Plus } from "lucide-react";
import { useProjectContext } from "../contexts/ProjectContext";
import { useLicoes } from "../hooks/useLicoes";
import { LicaoFormCard } from "../components/licoes/LicaoFormCard";
import { LicoesSummary } from "../components/licoes/LicoesSummary";
import { LicoesFilters } from "../components/licoes/LicoesFilters";
import { LicoesList } from "../components/licoes/LicoesList";

export function LicoesPage() {
  const { activeProject } = useProjectContext();
  const {
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
  } = useLicoes();

  if (!activeProject) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
          <Card className="p-8 text-center text-gray-500">
            <Lightbulb className="mx-auto mb-3 text-gray-300" size={40} />
            <p>Seleciona um projeto para ver as suas lições aprendidas.</p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Lightbulb className="text-amber-500" size={26} />
              Lições Aprendidas
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{activeProject.name}</p>
          </div>
          <Button onClick={handleToggleForm}>
            {showForm && !editingId ? (
              "Cancelar"
            ) : (
              <>
                <Plus size={16} className="mr-1" />
                Nova lição
              </>
            )}
          </Button>
        </div>

        {licoes.length > 0 && <LicoesSummary counts={counts} />}

        {showForm && (
          <LicaoFormCard
            form={form}
            setForm={setForm}
            editingId={editingId}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            onCancelEdit={handleCancelEdit}
          />
        )}

        {licoes.length > 0 && (
          <LicoesFilters
            filterTipo={filterTipo}
            filterArea={filterArea}
            onTipoChange={setFilterTipo}
            onAreaChange={setFilterArea}
          />
        )}

        <LicoesList
          isLoading={isLoading}
          licoes={licoes}
          filtered={filtered}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </main>
    </div>
  );
}
