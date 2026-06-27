import { Pencil, Check, X } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Textarea } from "../ui/textarea";
import type { DbProject } from "../../types/project";

interface Props {
  project: DbProject | null;
  editingField: "descricao" | "objetivos" | null;
  editValue: string;
  setEditValue: (v: string) => void;
  onStartEdit: (field: "descricao" | "objetivos") => void;
  onSave: () => void;
  onCancel: () => void;
}

export function ProjectDescriptionCards({
  project, editingField, editValue, setEditValue, onStartEdit, onSave, onCancel,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {(["descricao", "objetivos"] as const).map((field) => (
        <Card key={field} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">
              {field === "descricao" ? "Descrição" : "Objetivos"}
            </h3>
            {editingField === field ? (
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={onSave}>
                  <Check className="size-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-gray-500 hover:text-gray-700" onClick={onCancel}>
                  <X className="size-3.5" />
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-gray-400 hover:text-gray-600" onClick={() => onStartEdit(field)}>
                <Pencil className="size-3.5" />
              </Button>
            )}
          </div>
          {editingField === field ? (
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={4}
              className="text-sm"
              autoFocus
            />
          ) : (
            <p className="text-gray-600 text-sm whitespace-pre-line">
              {project?.[field] || (field === "descricao" ? "Sem descrição" : "Sem objetivos definidos")}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}
