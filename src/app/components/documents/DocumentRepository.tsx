import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { 
  FileText, 
  Image, 
  FileSpreadsheet, 
  File, 
  Download, 
  Trash2, 
  Search,
  Upload,
  Folder,
  Calendar,
  User,
  Eye,
  MoreVertical
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface Document {
  id: string;
  name: string;
  type: "pdf" | "doc" | "image" | "spreadsheet" | "other";
  category: string;
  size: number; // em bytes
  uploadedBy: string;
  uploadedAt: Date;
  url: string;
  version?: number;
}

interface DocumentRepositoryProps {
  documents: Document[];
  onUpload: (file: File, category: string) => void;
  onDelete: (id: string) => void;
  onDownload: (doc: Document) => void;
}

const fileIcons = {
  pdf: { icon: FileText, color: "text-red-600", bg: "bg-red-50" },
  doc: { icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
  image: { icon: Image, color: "text-green-600", bg: "bg-green-50" },
  spreadsheet: { icon: FileSpreadsheet, color: "text-emerald-600", bg: "bg-emerald-50" },
  other: { icon: File, color: "text-gray-600", bg: "bg-gray-50" },
};

const categories = [
  "Todos",
  "Contratos",
  "Relatórios",
  "Atas",
  "Propostas",
  "Orçamentos",
  "Apresentações",
  "Imagens",
  "Outros",
];

export function DocumentRepository({ documents, onUpload, onDelete, onDownload }: DocumentRepositoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "Todos" || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file, selectedCategory === "Todos" ? "Outros" : selectedCategory);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Search and Upload */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            placeholder="Pesquisar documentos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <label htmlFor="file-upload">
          <Button asChild>
            <span className="cursor-pointer">
              <Upload className="size-4 mr-2" />
              Carregar Ficheiro
            </span>
          </Button>
        </label>
        <input
          id="file-upload"
          type="file"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Category Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Total de Ficheiros</div>
          <div className="text-2xl font-bold text-gray-900">{documents.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Espaço Usado</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatFileSize(documents.reduce((sum, doc) => sum + doc.size, 0))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Categorias</div>
          <div className="text-2xl font-bold text-gray-900">
            {new Set(documents.map(d => d.category)).size}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Esta Semana</div>
          <div className="text-2xl font-bold text-gray-900">
            {documents.filter(d => {
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return d.uploadedAt > weekAgo;
            }).length}
          </div>
        </Card>
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <Card className="p-12 text-center">
          <Folder className="size-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Nenhum documento encontrado</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => {
            const config = fileIcons[doc.type];
            const Icon = config.icon;

            return (
              <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-3 rounded-lg ${config.bg}`}>
                    <Icon className={`size-6 ${config.color}`} />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="size-8 p-0">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onDownload(doc)}>
                        <Download className="size-4 mr-2" />
                        Descarregar
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Eye className="size-4 mr-2" />
                        Pré-visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(doc.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="size-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h4 className="font-semibold text-gray-900 mb-2 truncate" title={doc.name}>
                  {doc.name}
                </h4>

                <div className="space-y-2">
                  <Badge variant="secondary">{doc.category}</Badge>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <User className="size-3" />
                    <span>{doc.uploadedBy}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Calendar className="size-3" />
                    <span>
                      {formatDistanceToNow(doc.uploadedAt, {
                        addSuffix: true,
                        locale: pt,
                      })}
                    </span>
                  </div>

                  <div className="text-xs text-gray-500">
                    {formatFileSize(doc.size)}
                    {doc.version && ` • v${doc.version}`}
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => onDownload(doc)}
                  >
                    <Download className="size-3 mr-1" />
                    Baixar
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
