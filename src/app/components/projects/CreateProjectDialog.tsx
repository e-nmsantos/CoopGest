import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Plus, Upload, FileText, Loader2, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { apiPost } from "../../lib/apiClient";

interface CreateProjectDialogProps {
  onCreateProject: (project: {
    name: string;
    description: string;
    objectives: string;
    startDate: string;
    endDate: string;
    budget: string;
  }) => Promise<void> | void;
}

const emptyProject = {
  name: "",
  description: "",
  objectives: "",
  startDate: "",
  endDate: "",
  budget: "",
};

export function CreateProjectDialog({ onCreateProject }: CreateProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(emptyProject);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedFile, setParsedFile] = useState<string | null>(null);
  const [fieldsCount, setFieldsCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onCreateProject(formData);
      setFormData(emptyProject);
      setParsedFile(null);
      setFieldsCount(0);
      setOpen(false);
    } catch {
      toast.error("Erro ao criar projeto");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await parseFile(file);
    e.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) await parseFile(file);
  };

  const parseFile = async (file: File) => {
    setIsParsing(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const data = await apiPost<{ fields: Partial<typeof emptyProject> }>("/api/projects/parse-document", form);
      const fields = data.fields;
      const filled = Object.keys(fields).filter((k) => fields[k as keyof typeof emptyProject]);
      setFormData((prev) => ({ ...prev, ...fields }));
      setParsedFile(file.name);
      setFieldsCount(filled.length);
      toast.success(
        `${filled.length} campo${filled.length !== 1 ? "s" : ""} preenchido${filled.length !== 1 ? "s" : ""} automaticamente`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar ficheiro");
    } finally {
      setIsParsing(false);
    }
  };

  const clearFile = () => {
    setParsedFile(null);
    setFieldsCount(0);
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setFormData(emptyProject);
      setParsedFile(null);
      setFieldsCount(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4 mr-2" />
          Novo Projeto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Projeto</DialogTitle>
        </DialogHeader>

        {/* File import drop-zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 text-center transition-colors hover:border-primary/50 hover:bg-muted/30 cursor-default"
        >
          {parsedFile ? (
            <div className="flex items-center justify-center gap-2 text-sm flex-wrap">
              <CheckCircle2 className="size-4 text-green-500 shrink-0" />
              <span className="text-muted-foreground truncate max-w-[200px]">{parsedFile}</span>
              <span className="text-green-600 font-medium">
                {fieldsCount} campo{fieldsCount !== 1 ? "s" : ""} preenchido{fieldsCount !== 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={clearFile}
                className="ml-1 text-muted-foreground hover:text-foreground"
                aria-label="Remover ficheiro"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : isParsing ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              A extrair dados do ficheiro…
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Upload className="size-4" />
                <span className="text-sm">Arraste um ficheiro ou</span>
                <button
                  type="button"
                  className="text-sm text-primary underline underline-offset-2 font-medium hover:text-primary/80"
                  onClick={() => fileInputRef.current?.click()}
                >
                  selecione aqui
                </button>
              </div>
              <p className="text-xs text-muted-foreground/70 flex items-center gap-1">
                <FileText className="size-3" />
                PDF, TXT ou JSON · os campos são preenchidos automaticamente
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do Projeto *</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Projeto ECHO Angola"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Data de Inicio *</Label>
              <Input
                id="startDate"
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Data de Fim *</Label>
              <Input
                id="endDate"
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="budget">Orcamento Total (USD)</Label>
            <Input
              id="budget"
              type="number"
              step="0.01"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              placeholder="50000"
            />
          </div>

          <div>
            <Label htmlFor="description">Descricao</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva o projeto..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="objectives">Objetivos</Label>
            <Textarea
              id="objectives"
              value={formData.objectives}
              onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
              placeholder="Liste os objetivos principais..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || isParsing}>
              {isSubmitting ? "A criar..." : "Criar Projeto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
