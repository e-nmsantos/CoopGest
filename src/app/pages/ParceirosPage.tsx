import { useState, useEffect } from "react";
import { Header } from "../components/layout/Header";
import { PartnerCard } from "../components/partners/PartnerCard";
import { AddPartnerDialog } from "../components/partners/AddPartnerDialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Card } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Building2, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPost } from "../lib/apiClient";

interface Partner {
  id: string;
  name: string;
  type: string;
  country: string;
  contactPerson: string;
  email: string;
  phone: string;
  role: string;
  contribution: string;
}

const TYPES = ["Todos", "Cooperativa", "ONG", "Universidade", "Empresa", "Governo", "Associação"];

export function ParceirosPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Todos");

  useEffect(() => {
    apiGet<Partner[]>("/api/partners")
      .then(setPartners)
      .catch(() => toast.error("Erro ao carregar parceiros"))
      .finally(() => setLoading(false));
  }, []);

  const handleAddPartner = async (data: {
    name: string;
    type: string;
    country: string;
    contactPerson: string;
    email: string;
    phone: string;
    role: string;
    contribution: string;
  }) => {
    try {
      const created = await apiPost<Partner>("/api/partners", data);
      setPartners((prev) => [...prev, created]);
      toast.success("Parceiro adicionado com sucesso!");
    } catch {
      toast.error("Erro ao adicionar parceiro");
    }
  };

  const handleDeletePartner = async (id: string) => {
    if (!confirm("Eliminar este parceiro?")) return;
    try {
      await apiDelete<null>(`/api/partners/${id}`);
      setPartners((prev) => prev.filter((p) => p.id !== id));
      toast.success("Parceiro eliminado");
    } catch {
      toast.error("Erro ao eliminar parceiro");
    }
  };

  const filtered = partners.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "Todos" || p.type === typeFilter;
    return matchSearch && matchType;
  });

  // Estatísticas
  const stats = TYPES.slice(1).map((t) => ({
    type: t,
    count: partners.filter((p) => p.type === t).length,
  }));

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <Header />

      <div className="flex-1 min-h-0 overflow-auto p-6">
        {/* Cabeçalho */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Parceiros</h1>
            <p className="text-gray-600 mt-1">
              {partners.length} organização{partners.length !== 1 ? "s" : ""} parceira{partners.length !== 1 ? "s" : ""}
            </p>
          </div>
          <AddPartnerDialog onAddPartner={handleAddPartner} />
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Building2 className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{partners.length}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
            </div>
          </Card>
          {stats.slice(0, 3).map((s) => (
            <Card key={s.type} className="p-4">
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.count}</p>
                <p className="text-xs text-gray-500">{s.type}{s.count !== 1 ? "s" : ""}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Pesquisar parceiros..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Lista de parceiros */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={partners.length === 0 ? "Ainda não há parceiros" : "Nenhum parceiro encontrado"}
            description={partners.length === 0 ? "Adicione o primeiro parceiro da sua organização." : "Tente ajustar a pesquisa ou o filtro."}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((partner) => (
              <div key={partner.id} className="relative group">
                <PartnerCard partner={partner} />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDeletePartner(partner.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
