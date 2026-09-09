import { useEffect, useState, useCallback } from "react";
import { Header } from "../components/layout/Header";
import { Card } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { Trash2, Plus, Save } from "lucide-react";
import { useProjectContext } from "../contexts/ProjectContext";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/apiClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Pest {
  projeto_id: number;
  politico: string;
  economico: string;
  social: string;
  tecnologico: string;
}

interface Swot {
  projeto_id: number;
  forcas: string;
  fraquezas: string;
  oportunidades: string;
  ameacas: string;
}

interface ArvoreItem {
  id: number;
  tipo: "causa" | "problema_central" | "efeito";
  descricao: string;
  ordem: number;
}

// ---------------------------------------------------------------------------
// PEST tab
// ---------------------------------------------------------------------------

type PestTextKey = Exclude<keyof Pest, "projeto_id">;
type SwotTextKey = Exclude<keyof Swot, "projeto_id">;

function PestTab({ projectId }: { projectId: string }) {
  const [data, setData] = useState<Pest>({ projeto_id: Number(projectId), politico: "", economico: "", social: "", tecnologico: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<Pest>(`/api/analise/pest?projeto_id=${projectId}`)
      .then(setData)
      .catch(() => {/* keep defaults */});
  }, [projectId]);

  const save = async () => {
    setSaving(true);
    try {
      await apiPut("/api/analise/pest", { ...data, projeto_id: projectId });
      toast.success("Análise PEST guardada");
    } catch {
      toast.error("Erro ao guardar");
    } finally {
      setSaving(false);
    }
  };

  const fields: { key: PestTextKey; label: string; color: string; hint: string }[] = [
    { key: "politico", label: "Político", color: "border-blue-300 bg-blue-50", hint: "Estabilidade política, regulação, políticas de cooperação, alinhamento com agendas nacionais" },
    { key: "economico", label: "Económico", color: "border-green-300 bg-green-50", hint: "PIB, taxas de desemprego, inflação, recursos financeiros disponíveis, dependência de ajuda" },
    { key: "social", label: "Social", color: "border-amber-300 bg-amber-50", hint: "Dados demográficos, literacia, desigualdades, cultura local, capital social, redes comunitárias" },
    { key: "tecnologico", label: "Tecnológico", color: "border-purple-300 bg-purple-50", hint: "Infraestrutura digital, acesso à internet, adoção de tecnologia, capacidade técnica local" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Identifica os fatores do contexto macro que podem influenciar o projeto.
        </p>
        <Button onClick={save} disabled={saving} size="sm">
          <Save className="size-3.5 mr-1.5" />
          {saving ? "A guardar..." : "Guardar"}
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(({ key, label, color, hint }) => (
          <div key={key} className={`rounded-lg border-2 p-4 ${color}`}>
            <h3 className="font-semibold text-sm mb-1">{label}</h3>
            <p className="text-xs text-muted-foreground mb-2">{hint}</p>
            <Textarea
              rows={5}
              placeholder={`Fatore ${label.toLowerCase()}s relevantes para o projeto...`}
              value={data[key] ?? ""}
              onChange={(e) => setData((prev) => ({ ...prev, [key]: e.target.value }))}
              className="bg-white/70 text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SWOT tab
// ---------------------------------------------------------------------------

function SwotTab({ projectId }: { projectId: string }) {
  const [data, setData] = useState<Swot>({ projeto_id: Number(projectId), forcas: "", fraquezas: "", oportunidades: "", ameacas: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<Swot>(`/api/analise/swot?projeto_id=${projectId}`)
      .then(setData)
      .catch(() => {/* keep defaults */});
  }, [projectId]);

  const save = async () => {
    setSaving(true);
    try {
      await apiPut("/api/analise/swot", { ...data, projeto_id: projectId });
      toast.success("Análise SWOT guardada");
    } catch {
      toast.error("Erro ao guardar");
    } finally {
      setSaving(false);
    }
  };

  const fields: { key: SwotTextKey; label: string; color: string; sub: string; hint: string }[] = [
    { key: "forcas", label: "Forças", sub: "Strengths", color: "border-green-400 bg-green-50", hint: "Capacidades internas da organização proponente" },
    { key: "fraquezas", label: "Fraquezas", sub: "Weaknesses", color: "border-red-300 bg-red-50", hint: "Limitações internas que podem condicionar a implementação" },
    { key: "oportunidades", label: "Oportunidades", sub: "Opportunities", color: "border-blue-300 bg-blue-50", hint: "Fatores externos que favorecem o projeto" },
    { key: "ameacas", label: "Ameaças", sub: "Threats", color: "border-orange-300 bg-orange-50", hint: "Fatores externos que podem comprometer o projeto" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Avalia fatores internos (Forças/Fraquezas) e externos (Oportunidades/Ameaças).
        </p>
        <Button onClick={save} disabled={saving} size="sm">
          <Save className="size-3.5 mr-1.5" />
          {saving ? "A guardar..." : "Guardar"}
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(({ key, label, sub, color, hint }) => (
          <div key={key} className={`rounded-lg border-2 p-4 ${color}`}>
            <div className="flex items-baseline gap-2 mb-1">
              <h3 className="font-semibold text-sm">{label}</h3>
              <span className="text-xs text-muted-foreground">{sub}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{hint}</p>
            <Textarea
              rows={5}
              placeholder={`Liste as ${label.toLowerCase()} do projeto...`}
              value={data[key] ?? ""}
              onChange={(e) => setData((prev) => ({ ...prev, [key]: e.target.value }))}
              className="bg-white/70 text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Problem tree tab
// ---------------------------------------------------------------------------

type TipoKey = "causa" | "problema_central" | "efeito";

const TIPO_CONFIG: Record<TipoKey, { label: string; color: string; plural: string }> = {
  causa:            { label: "Causa",            plural: "Causas",            color: "border-orange-300 bg-orange-50" },
  problema_central: { label: "Problema Central",  plural: "Problema Central",  color: "border-red-400 bg-red-50" },
  efeito:           { label: "Efeito",            plural: "Efeitos",           color: "border-purple-300 bg-purple-50" },
};

function ArvoreTab({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<ArvoreItem[]>([]);
  const [newText, setNewText] = useState<Record<TipoKey, string>>({ causa: "", problema_central: "", efeito: "" });
  const [adding, setAdding] = useState<TipoKey | null>(null);

  const load = useCallback(() => {
    apiGet<ArvoreItem[]>(`/api/analise/arvore?projeto_id=${projectId}`)
      .then(setItems)
      .catch(() => setItems([]));
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const add = async (tipo: TipoKey) => {
    const text = newText[tipo].trim();
    if (!text) return;
    setAdding(tipo);
    try {
      await apiPost("/api/analise/arvore", { projeto_id: projectId, tipo, descricao: text });
      setNewText((p) => ({ ...p, [tipo]: "" }));
      load();
    } catch {
      toast.error("Erro ao adicionar");
    } finally {
      setAdding(null);
    }
  };

  const remove = async (id: number) => {
    try {
      await apiDelete(`/api/analise/arvore/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      toast.error("Erro ao eliminar");
    }
  };

  const byTipo = (tipo: TipoKey) => items.filter((i) => i.tipo === tipo);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Estrutura a lógica causal: <strong>Causas → Problema Central → Efeitos</strong>. Baseia-te na análise do contexto e nos dados de diagnóstico.
      </p>
      {/* Visual chain */}
      <div className="flex flex-col items-center gap-0">
        {(["efeito", "problema_central", "causa"] as TipoKey[]).map((tipo, idx) => {
          const cfg = TIPO_CONFIG[tipo];
          const tipItems = byTipo(tipo);
          return (
            <div key={tipo} className="w-full">
              {idx > 0 && (
                <div className="flex justify-center py-1 text-gray-400 text-xl select-none">↑</div>
              )}
              <div className={`rounded-lg border-2 p-4 ${cfg.color}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">{cfg.plural}</h3>
                  <span className="text-xs text-muted-foreground">{tipItems.length} {tipItems.length === 1 ? "entrada" : "entradas"}</span>
                </div>
                <div className="space-y-2 mb-3">
                  {tipItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-2">Sem entradas — adicione abaixo</p>
                  ) : (
                    tipItems.map((item) => (
                      <div key={item.id} className="flex items-start gap-2 bg-white/70 rounded-md px-3 py-2 text-sm">
                        <span className="flex-1">{item.descricao}</span>
                        <button
                          onClick={() => remove(item.id)}
                          className="text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newText[tipo]}
                    onChange={(e) => setNewText((p) => ({ ...p, [tipo]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(tipo); } }}
                    placeholder={`Adicionar ${cfg.label.toLowerCase()}...`}
                    className="text-sm bg-white/70"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => add(tipo)}
                    disabled={adding === tipo || !newText[tipo].trim()}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function AnalisePage() {
  const { activeProject, activeProjectId } = useProjectContext();

  if (!activeProjectId) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
        <Header showBackButton />
        <div className="flex-1 min-h-0 overflow-auto p-6">
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            Seleciona um projeto ativo no topo para aceder à Análise de Contexto.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <Header showBackButton />
      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Análise de Contexto</h1>
          <p className="text-gray-600 mt-1">{activeProject?.name}</p>
        </div>

        <Tabs defaultValue="pest">
          <TabsList className="mb-6">
            <TabsTrigger value="pest">PEST</TabsTrigger>
            <TabsTrigger value="swot">SWOT</TabsTrigger>
            <TabsTrigger value="arvore">Árvore de Problemas</TabsTrigger>
          </TabsList>

          <Card className="p-6">
            <TabsContent value="pest">
              <PestTab projectId={activeProjectId} />
            </TabsContent>
            <TabsContent value="swot">
              <SwotTab projectId={activeProjectId} />
            </TabsContent>
            <TabsContent value="arvore">
              <ArvoreTab projectId={activeProjectId} />
            </TabsContent>
          </Card>
        </Tabs>
      </div>
    </div>
  );
}
