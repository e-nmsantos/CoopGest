import { useState } from "react";
import { Pencil, Check, X, MapPin, Building2, Globe } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { toast } from "sonner";
import { apiPut } from "../../lib/apiClient";
import type { DbProject } from "../../types/project";

// ---------------------------------------------------------------------------
// ODS data
// ---------------------------------------------------------------------------

const ODS_LIST = [
  { n: 1,  label: "Erradicação da pobreza",         color: "#E5243B" },
  { n: 2,  label: "Fome zero",                       color: "#DDA63A" },
  { n: 3,  label: "Saúde e bem-estar",               color: "#4C9F38" },
  { n: 4,  label: "Educação de qualidade",           color: "#C5192D" },
  { n: 5,  label: "Igualdade de género",             color: "#FF3A21" },
  { n: 6,  label: "Água potável e saneamento",       color: "#26BDE2" },
  { n: 7,  label: "Energia acessível e limpa",       color: "#FCC30B" },
  { n: 8,  label: "Trabalho digno e crescimento",    color: "#A21942" },
  { n: 9,  label: "Indústria, inovação e infra.",    color: "#FD6925" },
  { n: 10, label: "Redução das desigualdades",       color: "#DD1367" },
  { n: 11, label: "Cidades sustentáveis",            color: "#FD9D24" },
  { n: 12, label: "Produção e consumo responsáveis", color: "#BF8B2E" },
  { n: 13, label: "Ação climática",                  color: "#3F7E44" },
  { n: 14, label: "Vida na água",                    color: "#0A97D9" },
  { n: 15, label: "Vida terrestre",                  color: "#56C02B" },
  { n: 16, label: "Paz, justiça e instituições",     color: "#00689D" },
  { n: 17, label: "Parcerias para os objetivos",     color: "#19486A" },
];

function parseOds(raw: string | undefined): number[] {
  if (!raw) return [];
  return raw.split(",").map(Number).filter((n) => n >= 1 && n <= 17);
}

function serializeOds(selected: number[]): string {
  return [...selected].sort((a, b) => a - b).join(",");
}

// ---------------------------------------------------------------------------
// ODS picker sub-component
// ---------------------------------------------------------------------------

function OdsPicker({ selected, onChange }: { selected: number[]; onChange: (v: number[]) => void }) {
  const toggle = (n: number) => {
    onChange(selected.includes(n) ? selected.filter((x) => x !== n) : [...selected, n]);
  };
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {ODS_LIST.map(({ n, label, color }) => {
        const active = selected.includes(n);
        return (
          <button
            key={n}
            type="button"
            title={`ODS ${n} — ${label}`}
            onClick={() => toggle(n)}
            className={`w-8 h-8 rounded-md text-xs font-bold transition-all border-2 ${
              active
                ? "border-transparent text-white shadow-sm scale-105"
                : "border-gray-200 text-gray-500 bg-white hover:border-gray-400"
            }`}
            style={active ? { backgroundColor: color, borderColor: color } : {}}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  project: DbProject;
  projectId: string;
  onUpdate: (updated: DbProject) => void;
}

type EditableField = "localizacao" | "entidade_proponente" | "ods";

export function FichaIdentificacaoCard({ project, projectId, onUpdate }: Props) {
  const [editing, setEditing] = useState<EditableField | null>(null);
  const [localizacao, setLocalizacao] = useState(project.localizacao ?? "");
  const [entidade, setEntidade] = useState(project.entidade_proponente ?? "");
  const [odsSelected, setOdsSelected] = useState<number[]>(parseOds(project.ods));
  const [saving, setSaving] = useState(false);

  const hasAny = project.localizacao || project.entidade_proponente || project.ods;

  const save = async (field: EditableField) => {
    setSaving(true);
    const payload: Partial<DbProject> =
      field === "localizacao" ? { localizacao } :
      field === "entidade_proponente" ? { entidade_proponente: entidade } :
      { ods: serializeOds(odsSelected) };
    try {
      const updated = await apiPut<DbProject>(`/api/projects/${projectId}`, payload);
      onUpdate(updated);
      setEditing(null);
      toast.success("Ficha atualizada");
    } catch {
      toast.error("Erro ao guardar");
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setLocalizacao(project.localizacao ?? "");
    setEntidade(project.entidade_proponente ?? "");
    setOdsSelected(parseOds(project.ods));
    setEditing(null);
  };

  const currentOdsNums = parseOds(project.ods);

  const fieldRow = (
    field: EditableField,
    icon: React.ReactNode,
    label: string,
    display: React.ReactNode,
    editNode: React.ReactNode,
    placeholder: string,
  ) => (
    <div className="flex items-start gap-3 py-2 border-b last:border-0">
      <div className="shrink-0 mt-0.5 text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
        {editing === field ? (
          <div className="space-y-1.5">
            {editNode}
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 px-3 text-xs" onClick={() => save(field)} disabled={saving}>
                <Check className="size-3 mr-1" />{saving ? "A guardar..." : "Guardar"}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={cancel}>
                <X className="size-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 group/row">
            <span className={`text-sm flex-1 ${display ? "text-gray-900" : "text-muted-foreground/50 italic"}`}>
              {display || placeholder}
            </span>
            <button
              type="button"
              className="opacity-0 group-hover/row:opacity-100 transition-opacity text-muted-foreground hover:text-gray-700"
              onClick={() => setEditing(field)}
            >
              <Pencil className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Card className="p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 text-sm">Ficha de Identificação</h3>
        {!hasAny && !editing && (
          <span className="text-xs text-muted-foreground italic">Passe o rato sobre um campo para editar</span>
        )}
      </div>

      {fieldRow(
        "localizacao",
        <MapPin className="size-4" />,
        "Localização",
        project.localizacao,
        <Input
          value={localizacao}
          onChange={(e) => setLocalizacao(e.target.value)}
          placeholder="Ex: Luanda, Angola"
          className="h-8 text-sm"
          autoFocus
        />,
        "País / região do projeto",
      )}

      {fieldRow(
        "entidade_proponente",
        <Building2 className="size-4" />,
        "Entidade proponente",
        project.entidade_proponente,
        <Input
          value={entidade}
          onChange={(e) => setEntidade(e.target.value)}
          placeholder="Ex: CEPCEP — Universidade Católica Portuguesa"
          className="h-8 text-sm"
          autoFocus
        />,
        "Organização responsável pelo projeto",
      )}

      {/* ODS */}
      <div className="flex items-start gap-3 py-2">
        <div className="shrink-0 mt-0.5 text-muted-foreground"><Globe className="size-4" /></div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground mb-0.5">Alinhamento ODS</p>
          {editing === "ods" ? (
            <div className="space-y-2">
              <OdsPicker selected={odsSelected} onChange={setOdsSelected} />
              <div className="flex gap-1.5">
                <Button size="sm" className="h-7 px-3 text-xs" onClick={() => save("ods")} disabled={saving}>
                  <Check className="size-3 mr-1" />{saving ? "A guardar..." : "Guardar"}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={cancel}>
                  <X className="size-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 group/row">
              {currentOdsNums.length > 0 ? (
                <div className="flex flex-wrap gap-1 flex-1">
                  {currentOdsNums.map((n) => {
                    const ods = ODS_LIST.find((o) => o.n === n);
                    return (
                      <span
                        key={n}
                        title={ods?.label}
                        className="inline-flex items-center justify-center w-6 h-6 rounded text-white text-xs font-bold"
                        style={{ backgroundColor: ods?.color ?? "#888" }}
                      >
                        {n}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground/50 italic flex-1">Nenhum ODS selecionado</span>
              )}
              <button
                type="button"
                className="opacity-0 group-hover/row:opacity-100 transition-opacity text-muted-foreground hover:text-gray-700"
                onClick={() => setEditing("ods")}
              >
                <Pencil className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
