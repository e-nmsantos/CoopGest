import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import type { MemberSkill, Skill, SkillLevel, TeamMember } from "./skills.types";

interface SkillAssignmentPanelProps {
  members: TeamMember[];
  skills: Skill[];
  isLoading: boolean;
  selectedMemberId: string;
  selectedSkillId: string;
  selectedLevel: SkillLevel;
  willingToTeach: boolean;
  wantsToLearn: boolean;
  isSubmitting: boolean;
  selectedMember: TeamMember | null;
  skillNameById: Map<string, string>;
  onChangeMemberId: (value: string) => void;
  onChangeSkillId: (value: string) => void;
  onChangeLevel: (value: SkillLevel) => void;
  onChangeWillingToTeach: (value: boolean) => void;
  onChangeWantsToLearn: (value: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onRemove: (memberId: string, skillId: string) => void;
  onLoadAssignment: (assignment: MemberSkill) => void;
}

export function SkillAssignmentPanel({
  members,
  skills,
  isLoading,
  selectedMemberId,
  selectedSkillId,
  selectedLevel,
  willingToTeach,
  wantsToLearn,
  isSubmitting,
  selectedMember,
  skillNameById,
  onChangeMemberId,
  onChangeSkillId,
  onChangeLevel,
  onChangeWillingToTeach,
  onChangeWantsToLearn,
  onSubmit,
  onRemove,
  onLoadAssignment,
}: SkillAssignmentPanelProps) {
  return (
    <Card className="p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Atribuir competências a membros</h2>

      {isLoading ? (
        <p className="text-sm text-gray-500">A carregar membros...</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-gray-500">Ainda não existem membros.</p>
      ) : (
        <>
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <Label>Membro</Label>
              <Select value={selectedMemberId} onValueChange={onChangeMemberId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Competência</Label>
              <Select value={selectedSkillId} onValueChange={onChangeSkillId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {skills.map((skill) => (
                    <SelectItem key={skill.id} value={skill.id}>
                      {skill.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nível</Label>
              <Select value={String(selectedLevel)} onValueChange={(value) => onChangeLevel(Number(value) as SkillLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Iniciante</SelectItem>
                  <SelectItem value="2">2 - Básico</SelectItem>
                  <SelectItem value="3">3 - Intermédio</SelectItem>
                  <SelectItem value="4">4 - Avançado</SelectItem>
                  <SelectItem value="5">5 - Especialista</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="willing-to-teach"
                checked={willingToTeach}
                onCheckedChange={(checked) => onChangeWillingToTeach(checked === true)}
              />
              <Label htmlFor="willing-to-teach">Disponível para ensinar</Label>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="wants-to-learn"
                checked={wantsToLearn}
                onCheckedChange={(checked) => onChangeWantsToLearn(checked === true)}
              />
              <Label htmlFor="wants-to-learn">Quer aprender mais</Label>
            </div>

            <div className="flex items-end justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "A guardar..." : "Atribuir / Atualizar"}
              </Button>
            </div>
          </form>

          <div className="border rounded-md p-3">
            <h3 className="font-medium text-gray-900 mb-3">
              Competências de {selectedMember?.name ?? "-"}
            </h3>
            {!selectedMember || selectedMember.skills.length === 0 ? (
              <p className="text-sm text-gray-500">Sem competências atribuídas.</p>
            ) : (
              <div className="space-y-2">
                {selectedMember.skills.map((assignment) => (
                  <div key={assignment.skillId} className="flex items-center justify-between border rounded-md p-2">
                    <div>
                      <p className="font-medium text-gray-900">{skillNameById.get(assignment.skillId) ?? `ID ${assignment.skillId}`}</p>
                      <p className="text-sm text-gray-600">
                        Nível {assignment.level}
                        {assignment.willingToTeach ? " • Ensina" : ""}
                        {assignment.wantsToLearn ? " • Quer aprender" : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => onLoadAssignment(assignment)}>
                        Carregar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void onRemove(selectedMember.id, assignment.skillId)}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
