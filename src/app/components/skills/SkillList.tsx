import { Button } from "../ui/button";
import { Card } from "../ui/card";
import type { Skill } from "./skills.types";

interface SkillListProps {
  skills: Skill[];
  isLoading: boolean;
  onEdit: (skill: Skill) => void;
  onDelete: (skillId: string) => void;
}

export function SkillList({ skills, isLoading, onEdit, onDelete }: SkillListProps) {
  return (
    <Card className="p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Competências registadas</h2>
      {isLoading ? (
        <p className="text-sm text-gray-500">A carregar...</p>
      ) : skills.length === 0 ? (
        <p className="text-sm text-gray-500">Ainda não existem competências.</p>
      ) : (
        <div className="space-y-2">
          {skills.map((skill) => (
            <div key={skill.id} className="flex items-center justify-between border rounded-md p-3">
              <div>
                <p className="font-medium text-gray-900">{skill.name}</p>
                <p className="text-sm text-gray-600">{skill.category}</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onEdit(skill)}>
                  Editar
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => void onDelete(skill.id)}>
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
