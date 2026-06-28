/**
 * BeneficiariosDesagregacao — project-level disaggregation summary and management.
 *
 * Shows all disaggregation rows for a project grouped by dimension, with totals,
 * a simple gender bar chart, and an inline add-form that attaches to a beneficiary.
 */
import { useState, useEffect, useCallback } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";
import { Trash2, PieChart, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPost } from "../../lib/apiClient";

// ── Types ────────────────────────────────────────────────────────────────────

interface DesagregacaoRow {
  id: number;
  beneficiario_id: number;
  beneficiario_nome?: string;
  projeto_id: number;
  dimensao: string;
  categoria: string;
  numero: number;
  criado_em: string;
}

interface Beneficiario {
  id: number;
  nome: string;
  numero: number;
}

interface BeneficiariosDesagregacaoProps {
  projectId: string;
  beneficiarios: Beneficiario[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const DIMENSOES = [
  { value: "genero", label: "Género" },
  { value: "faixa_etaria", label: "Faixa Etária" },
  { value: "localizacao", label: "Localização" },
  { value: "vulnerabilidade", label: "Vulnerabilidade" },
  { value: "outro", label: "Outro" },
] as const;

const CATEGORIAS_PADRAO: Record<string, string[]> = {
  genero: ["Masculino", "Feminino", "Outro / Não especificado"],
  faixa_etaria: ["0-14 anos", "15-24 anos", "25-49 anos", "50-64 anos", "65+ anos"],
  localizacao: ["Urbano", "Rural", "Periurbano"],
  vulnerabilidade: [
    "Pessoas com deficiência",
    "Deslocados internos",
    "Refugiados",
    "Mulheres chefes de família",
    "Outros grupos vulneráveis",
  ],
  outro: [],
};

const DIMENSAO_COLORS: Record<string, string> = {
  genero: "bg-purple-100 text-purple-700 border-purple-200",
  faixa_etaria: "bg-blue-100 text-blue-700 border-blue-200",
  localizacao: "bg-green-100 text-green-700 border-green-200",
  vulnerabilidade: "bg-orange-100 text-orange-700 border-orange-200",
  outro: "bg-gray-100 text-gray-700 border-gray-200",
};

const GENDER_BAR_COLORS: Record<string, string> = {
  Masculino: "bg-blue-500",
  Feminino: "bg-pink-500",
  "Outro / Não especificado": "bg-gray-400",
};

// ── Gender bar chart ─────────────────────────────────────────────────────────

function GenderBar({ rows }: { rows: DesagregacaoRow[] }) {
  const total = rows.reduce((s, r) => s + r.numero, 0);
  if (total === 0 || rows.length < 2) return null;

  return (
    <div className="mt-2">
      <div className="flex rounded-full overflow-hidden h-4 w-full border border-gray-200">
        {rows.map((r) => {
          const pct = total > 0 ? (r.numero / total) * 100 : 0;
          const color =
            GENDER_BAR_COLORS[r.categoria] ?? "bg-teal-400";
          return (
            <div
              key={r.id}
              className={`${color} transition-all`}
              style={{ width: `${pct}%` }}
              title={`${r.categoria}: ${r.numero.toLocaleString("pt-PT")} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-1.5">
        {rows.map((r) => {
          const pct = total > 0 ? (r.numero / total) * 100 : 0;
          const color =
            GENDER_BAR_COLORS[r.categoria] ?? "bg-teal-400";
          return (
            <span key={r.id} className="flex items-center gap-1 text-xs text-gray-600">
              <span className={`inline-block size-2.5 rounded-full ${color}`} />
              {r.categoria}: <strong>{r.numero.toLocaleString("pt-PT")}</strong>{" "}
              <span className="text-gray-400">({pct.toFixed(1)}%)</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function BeneficiariosDesagregacao({
  projectId,
  beneficiarios,
}: BeneficiariosDesagregacaoProps) {
  const [rows, setRows] = useState<DesagregacaoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Form state
  const [beneficiarioId, setBeneficiarioId] = useState<string>("");
  const [dimensao, setDimensao] = useState<string>("genero");
  const [categoria, setCategoria] = useState<string>("");
  const [customCategoria, setCustomCategoria] = useState<string>("");
  const [numero, setNumero] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<DesagregacaoRow[]>(
        `/api/projects/${projectId}/beneficiarios/desagregacao`
      );
      setRows(data);
    } catch {
      toast.error("Erro ao carregar desagregação");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const handleAdd = async () => {
    const cat = categoria === "__custom__" ? customCategoria.trim() : categoria.trim();
    if (!beneficiarioId || !cat) {
      toast.error("Beneficiário e categoria são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const row = await apiPost<DesagregacaoRow>(
        `/api/projects/${projectId}/beneficiarios/desagregacao`,
        {
          beneficiario_id: parseInt(beneficiarioId),
          dimensao,
          categoria: cat,
          numero: parseInt(numero) || 0,
        }
      );
      // Attach beneficiary name from local state
      const ben = beneficiarios.find((b) => b.id === parseInt(beneficiarioId));
      setRows((prev) => [...prev, { ...row, beneficiario_nome: ben?.nome }]);
      setCategoria("");
      setCustomCategoria("");
      setNumero("");
      toast.success("Desagregação adicionada");
    } catch {
      toast.error("Erro ao adicionar desagregação");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== id));
    try {
      await apiDelete(`/api/projects/${projectId}/beneficiarios/desagregacao/${id}`);
    } catch {
      setRows(prev);
      toast.error("Erro ao eliminar desagregação");
    }
  };

  // Group rows by dimension
  const byDim = rows.reduce<Record<string, DesagregacaoRow[]>>((acc, r) => {
    (acc[r.dimensao] ??= []).push(r);
    return acc;
  }, {});

  // Totals per dimension
  const dimTotal = (dim: string) =>
    (byDim[dim] ?? []).reduce((s, r) => s + r.numero, 0);

  const totalGeral = rows.reduce((s, r) => s + r.numero, 0);

  const cats = CATEGORIAS_PADRAO[dimensao] ?? [];

  return (
    <Card className="p-6">
      <button
        className="flex items-center justify-between w-full text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <PieChart className="size-4 text-teal-600" />
          <h3 className="font-semibold text-gray-900">
            Desagregação de Beneficiários
          </h3>
          {rows.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totalGeral.toLocaleString("pt-PT")} registos
            </Badge>
          )}
        </div>
        {open ? (
          <ChevronUp className="size-4 text-gray-400" />
        ) : (
          <ChevronDown className="size-4 text-gray-400" />
        )}
      </button>

      {open && (
        <div className="mt-4 space-y-6">
          {loading && (
            <p className="text-sm text-gray-400 text-center py-4">A carregar...</p>
          )}

          {!loading && rows.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-2">
              Nenhuma desagregação registada para este projecto.
            </p>
          )}

          {/* Dimension groups */}
          {!loading &&
            DIMENSOES.map(({ value: dim, label }) => {
              const dimRows = byDim[dim];
              if (!dimRows || dimRows.length === 0) return null;
              const total = dimTotal(dim);
              const badgeCls =
                DIMENSAO_COLORS[dim] ?? "bg-gray-100 text-gray-700 border-gray-200";
              return (
                <div key={dim} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badgeCls}`}
                    >
                      {label}
                    </span>
                    <span className="text-xs text-gray-400">
                      Total: <strong>{total.toLocaleString("pt-PT")}</strong>
                    </span>
                  </div>

                  {dim === "genero" && <GenderBar rows={dimRows} />}

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left px-3 py-1.5 font-medium text-gray-500 border-b border-gray-200 rounded-tl">
                            Categoria
                          </th>
                          <th className="text-left px-3 py-1.5 font-medium text-gray-500 border-b border-gray-200">
                            Beneficiário
                          </th>
                          <th className="text-right px-3 py-1.5 font-medium text-gray-500 border-b border-gray-200">
                            Nº
                          </th>
                          <th className="px-3 py-1.5 border-b border-gray-200 rounded-tr" />
                        </tr>
                      </thead>
                      <tbody>
                        {dimRows.map((r) => (
                          <tr key={r.id} className="group hover:bg-gray-50">
                            <td className="px-3 py-1.5 text-gray-800 border-b border-gray-100">
                              {r.categoria}
                            </td>
                            <td className="px-3 py-1.5 text-gray-500 border-b border-gray-100">
                              {r.beneficiario_nome ?? "—"}
                            </td>
                            <td className="px-3 py-1.5 text-right font-semibold text-gray-800 border-b border-gray-100">
                              {r.numero.toLocaleString("pt-PT")}
                            </td>
                            <td className="px-3 py-1.5 border-b border-gray-100 text-right">
                              <button
                                onClick={() => void handleDelete(r.id)}
                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                                title="Eliminar"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

          {/* Add form */}
          {beneficiarios.length === 0 ? (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Adicione pelo menos um beneficiário para registar desagregação.
            </p>
          ) : (
            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-1.5">
                <Plus className="size-3.5" /> Adicionar entrada
              </p>
              <div className="flex flex-wrap gap-2 items-end">
                {/* Beneficiary selector */}
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Beneficiário</p>
                  <Select value={beneficiarioId} onValueChange={setBeneficiarioId}>
                    <SelectTrigger className="h-7 text-xs w-44">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {beneficiarios.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dimension */}
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Dimensão</p>
                  <Select
                    value={dimensao}
                    onValueChange={(v) => {
                      setDimensao(v);
                      setCategoria("");
                      setCustomCategoria("");
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIMENSOES.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Categoria</p>
                  {cats.length > 0 ? (
                    <Select
                      value={categoria}
                      onValueChange={(v) => {
                        setCategoria(v);
                        setCustomCategoria("");
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs w-48">
                        <SelectValue placeholder="Selecionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {cats.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom__">
                          Outra (digitar)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      className="h-7 text-xs w-48"
                      placeholder="Categoria"
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                    />
                  )}
                </div>

                {/* Custom category input */}
                {categoria === "__custom__" && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Texto</p>
                    <Input
                      className="h-7 text-xs w-40"
                      placeholder="Categoria personalizada"
                      value={customCategoria}
                      onChange={(e) => setCustomCategoria(e.target.value)}
                    />
                  </div>
                )}

                {/* Number */}
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Nº</p>
                  <Input
                    type="number"
                    min="0"
                    className="h-7 text-xs w-20"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="0"
                  />
                </div>

                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => void handleAdd()}
                  disabled={
                    saving ||
                    !beneficiarioId ||
                    !categoria ||
                    categoria === "__custom__" ||
                    (categoria === "__custom__" && !customCategoria.trim())
                  }
                >
                  {saving ? "..." : "Guardar"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
