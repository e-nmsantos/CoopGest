import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import type { SkillCategory } from "./skills.types";

interface SkillFormProps {
  editingSkillId: string | null;
  formSkillName: string;
  formSkillCategory: SkillCategory;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onChangeName: (value: string) => void;
  onChangeCategory: (value: SkillCategory) => void;
  onCancel: () => void;
}

export function SkillForm({
  editingSkillId,
  formSkillName,
  formSkillCategory,
  isSubmitting,
  onSubmit,
  onChangeName,
  onChangeCategory,
  onCancel,
}: SkillFormProps) {
  return (
    <Card className="p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {editingSkillId ? "Editar competência" : "Nova competência"}
      </h2>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="skill-name">Nome</Label>
          <Input
            id="skill-name"
            required
            value={formSkillName}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder="Ex: Captação de financiamento"
          />
        </div>

        <div>
          <Label>Categoria</Label>
          <Select value={formSkillCategory} onValueChange={(value: SkillCategory) => onChangeCategory(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gestão">Gestão</SelectItem>
              <SelectItem value="técnica">Técnica</SelectItem>
              <SelectItem value="comunicação">Comunicação</SelectItem>
              <SelectItem value="especializada">Especializada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-2">
          {editingSkillId && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar edição
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "A guardar..." : editingSkillId ? "Guardar" : "Criar"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
