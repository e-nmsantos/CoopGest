import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { apiPost } from "../../lib/apiClient";
import { toast } from "sonner";

interface AddEvidenciaFormProps {
  indicadorId: number;
  onAdded: () => void;
}

export function AddEvidenciaForm({ indicadorId, onAdded }: AddEvidenciaFormProps) {
  const [descricao, setDescricao] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSave = async () => {
    if (!descricao.trim()) return;
    setSaving(true);
    try {
      await apiPost(`/api/impact/logframe/${indicadorId}/evidencias`, {
        descricao,
        url_externa: url,
        tipo: url ? "url" : "documento",
      });
      setDescricao("");
      setUrl("");
      setOpen(false);
      onAdded();
    } catch {
      toast.error("Não foi possível adicionar evidência");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        + Adicionar evidência
      </Button>
    );
  }

  return (
    <div className="space-y-2 bg-white border rounded p-2">
      <Input
        className="h-7 text-xs"
        placeholder="Descrição da evidência *"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
      />
      <Input
        className="h-7 text-xs"
        placeholder="URL externa (opcional)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" className="h-7 text-xs" onClick={() => void handleSave()} disabled={saving || !descricao.trim()}>
          {saving ? "A guardar..." : "Guardar"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </div>
  );
}
