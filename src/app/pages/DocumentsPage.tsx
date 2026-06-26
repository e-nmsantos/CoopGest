import { useState, useEffect, useMemo } from "react";
import { Header } from "../components/layout/Header";
import { DocumentRepository } from "../components/documents/DocumentRepository";
import { toast } from "sonner";
import { useProjectContext } from "../contexts/ProjectContext";
import { Search, FileText, HardDrive, Filter } from "lucide-react";
import { Input } from "../components/ui/input";
import { apiDelete, apiGet, apiPost } from "../lib/apiClient";

interface Document {
  id: string;
  name: string;
  type: "pdf" | "doc" | "image" | "spreadsheet" | "other";
  category: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
  url: string;
}

interface DbDocument {
  id: number;
  nome: string;
  nome_ficheiro: string;
  tipo: string;
  categoria: string;
  tamanho: number;
  uploader: string;
  url: string;
  criado_em: string;
}

function fromDb(d: DbDocument): Document {
  return {
    id: String(d.id),
    name: d.nome,
    type: d.tipo as Document["type"],
    category: d.categoria || "Outros",
    size: d.tamanho || 0,
    uploadedBy: d.uploader,
    uploadedAt: new Date(d.criado_em),
    url: d.url,
  };
}

export function DocumentsPage() {
  const { activeProject, activeProjectId } = useProjectContext();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  useEffect(() => {
    if (!activeProjectId) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    apiGet<DbDocument[]>(`/api/documents?projeto_id=${encodeURIComponent(activeProjectId)}`)
      .then((data: DbDocument[]) => setDocuments(data.map(fromDb)))
      .catch(() => toast.error("Erro ao carregar documentos"))
      .finally(() => setLoading(false));
  }, [activeProjectId]);

  const handleUpload = async (file: File, category: string) => {
    if (!activeProjectId) {
      toast.error("Selecione um projeto ativo primeiro");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);
    formData.append("projeto_id", activeProjectId);
    try {
      const raw = await apiPost<DbDocument>("/api/documents", formData);
      setDocuments((prev) => [fromDb(raw), ...prev]);
      toast.success("Ficheiro carregado com sucesso!");
    } catch {
      toast.error("Erro ao carregar ficheiro");
    }
  };

  const handleDelete = async (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    try {
      await apiDelete<null>(`/api/documents/${id}`);
      toast.success("Ficheiro eliminado!");
    } catch {
      toast.error("Erro ao eliminar ficheiro");
    }
  };

  const handleDownload = (doc: Document) => {
    window.open(doc.url, "_blank");
  };

  // Categorias únicas
  const categories = useMemo(() => {
    const cats = new Set(documents.map(d => d.category));
    return ["Todos", ...Array.from(cats).sort()];
  }, [documents]);

  // Filtragem e Estatísticas
  const filteredDocs = useMemo(() => {
    let res = documents;
    if (selectedCategory !== "Todos") {
      res = res.filter(d => d.category === selectedCategory);
    }
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      res = res.filter(d => d.name.toLowerCase().includes(lower) || d.category.toLowerCase().includes(lower));
    }
    return res;
  }, [documents, searchQuery, selectedCategory]);

  const stats = useMemo(() => {
    const totalSize = documents.reduce((acc, d) => acc + d.size, 0);
    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
    return { count: documents.length, size: sizeInMB };
  }, [documents]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">A carregar documentos...</p>
      </div>
    );
  }

  if (!activeProjectId) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
        <Header showBackButton />
        <div className="flex-1 min-h-0 overflow-auto p-6">
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            Escolha um projeto ativo no topo para ver apenas os documentos desse projeto.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <Header showBackButton />

      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Repositório de Documentos
            </h1>
            <p className="text-gray-600 mt-1">
              Gestão centralizada dos ficheiros de {activeProject?.name || "projeto ativo"}
            </p>
          </div>
          
          {/* Stats Cards */}
          <div className="flex gap-3">
            <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center gap-3">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md"><FileText className="size-4" /></div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Ficheiros</p>
                <p className="text-sm font-bold text-gray-900">{stats.count}</p>
              </div>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center gap-3">
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md"><HardDrive className="size-4" /></div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Ocupação</p>
                <p className="text-sm font-bold text-gray-900">{stats.size} MB</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
          <Input placeholder="Pesquisar documentos por nome ou categoria..." className="pl-10 bg-white" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <Filter className="size-4 text-gray-400 shrink-0 mr-1" />
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-gray-900 text-white shadow-md"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <DocumentRepository
          documents={filteredDocs}
          onUpload={handleUpload}
          onDelete={handleDelete}
          onDownload={handleDownload}
        />
      </div>
    </div>
  );
}
