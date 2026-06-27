import { Header } from "../components/layout/Header";
import { SkillsMatrix } from "../components/skills/SkillsMatrix";
import { useEffect, useMemo, useState } from "react";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast } from "sonner";
import { useProjectContext } from "../contexts/ProjectContext";
import { apiDelete, apiGet, apiPost, apiPut } from "../lib/apiClient";

type SkillCategory = "técnica" | "gestão" | "comunicação" | "especializada";

type SkillLevel = 1 | 2 | 3 | 4 | 5;

interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
}

interface MemberSkill {
  skillId: string;
  level: SkillLevel;
  willingToTeach: boolean;
  wantsToLearn: boolean;
}

interface TeamMember {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: string;
  availability: number;
  skills: MemberSkill[];
}

interface ApiSkill {
  id: number;
  nome: string;
  categoria: SkillCategory;
}

interface ApiMember {
  id: number;
  nome: string;
  iniciais: string;
  cor: string;
  papel: string;
  disponibilidade: number;
  skills: Array<{
    skillId: string;
    level: SkillLevel;
    willingToTeach: boolean;
    wantsToLearn: boolean;
  }>;
}

export function SkillsPage() {
  const { activeProject, activeProjectId } = useProjectContext();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);

  const [isLoadingSkills, setIsLoadingSkills] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);

  const [isSubmittingSkill, setIsSubmittingSkill] = useState(false);
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);

  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [formSkillName, setFormSkillName] = useState("");
  const [formSkillCategory, setFormSkillCategory] = useState<SkillCategory>("gestão");

  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [selectedSkillId, setSelectedSkillId] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<SkillLevel>(3);
  const [willingToTeach, setWillingToTeach] = useState(false);
  const [wantsToLearn, setWantsToLearn] = useState(false);

  const loadSkills = async () => {
    if (!activeProjectId) {
      setSkills([]);
      setIsLoadingSkills(false);
      return;
    }

    try {
      const data = await apiGet<ApiSkill[]>(`/api/skills?projeto_id=${encodeURIComponent(activeProjectId)}`);

      setSkills(
        data.map((skill) => ({
          id: String(skill.id),
          name: skill.nome,
          category: skill.categoria,
        }))
      );
    } catch {
      toast.error("Não foi possível carregar competências");
    } finally {
      setIsLoadingSkills(false);
    }
  };

  const loadMembers = async () => {
    if (!activeProjectId) {
      setMembers([]);
      setIsLoadingMembers(false);
      return;
    }

    try {
      const data = await apiGet<ApiMember[]>(`/api/skills/members?projeto_id=${encodeURIComponent(activeProjectId)}`);

      setMembers(
        data.map((member) => ({
          id: String(member.id),
          name: member.nome,
          initials: member.iniciais,
          color: member.cor,
          role: member.papel,
          availability: member.disponibilidade,
          skills: member.skills,
        }))
      );
    } catch {
      toast.error("Não foi possível carregar membros");
    } finally {
      setIsLoadingMembers(false);
    }
  };

  useEffect(() => {
    setIsLoadingSkills(true);
    setIsLoadingMembers(true);
    void Promise.all([loadSkills(), loadMembers()]);
  }, [activeProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedMemberId && members.length > 0) {
      setSelectedMemberId(members[0].id);
    }
    if (selectedMemberId && !members.some((member) => member.id === selectedMemberId)) {
      setSelectedMemberId(members[0]?.id || "");
    }
  }, [members, selectedMemberId]);

  useEffect(() => {
    if (!selectedSkillId && skills.length > 0) {
      setSelectedSkillId(skills[0].id);
    }
    if (selectedSkillId && !skills.some((skill) => skill.id === selectedSkillId)) {
      setSelectedSkillId(skills[0]?.id || "");
    }
  }, [skills, selectedSkillId]);

  const resetSkillForm = () => {
    setEditingSkillId(null);
    setFormSkillName("");
    setFormSkillCategory("gestão");
  };

  const handleSaveSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingSkill(true);

    try {
      const endpoint = editingSkillId ? `/api/skills/${editingSkillId}` : "/api/skills";
      const payload = {
        nome: formSkillName,
        categoria: formSkillCategory,
        projeto_id: activeProjectId ? Number(activeProjectId) : null,
      };
      if (editingSkillId) {
        await apiPut<ApiSkill>(endpoint, payload);
      } else {
        await apiPost<ApiSkill>(endpoint, payload);
      }

      toast.success(editingSkillId ? "Competência atualizada" : "Competência criada");
      resetSkillForm();
      await Promise.all([loadSkills(), loadMembers()]);
    } catch {
      toast.error("Não foi possível guardar competência");
    } finally {
      setIsSubmittingSkill(false);
    }
  };

  const handleEditSkill = (skill: Skill) => {
    setEditingSkillId(skill.id);
    setFormSkillName(skill.name);
    setFormSkillCategory(skill.category);
  };

  const handleDeleteSkill = async (skillId: string) => {
    try {
      await apiDelete<null>(`/api/skills/${skillId}`);

      if (editingSkillId === skillId) {
        resetSkillForm();
      }

      toast.success("Competência eliminada");
      await Promise.all([loadSkills(), loadMembers()]);
    } catch {
      toast.error("Não foi possível eliminar competência");
    }
  };

  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedMemberId) ?? null,
    [members, selectedMemberId]
  );

  const skillNameById = useMemo(() => {
    return new Map(skills.map((skill) => [skill.id, skill.name]));
  }, [skills]);

  const handleSaveMemberSkill = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMemberId || !selectedSkillId) {
      toast.error("Selecione membro e competência");
      return;
    }

    setIsSubmittingAssignment(true);

    try {
      await apiPost<unknown>(`/api/skills/members/${selectedMemberId}/skills`, {
        projeto_id: activeProjectId ? Number(activeProjectId) : null,
        competencia_id: Number(selectedSkillId),
        nivel: selectedLevel,
        disposto_ensinar: willingToTeach,
        quer_aprender: wantsToLearn,
      });

      toast.success("Competência atribuída/atualizada no membro");
      await loadMembers();
    } catch {
      toast.error("Não foi possível guardar atribuição");
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  const handleRemoveMemberSkill = async (memberId: string, skillId: string) => {
    try {
      await apiDelete<null>(`/api/skills/members/${memberId}/skills/${skillId}?projeto_id=${encodeURIComponent(activeProjectId || "")}`);

      toast.success("Competência removida do membro");
      await loadMembers();
    } catch {
      toast.error("Não foi possível remover competência");
    }
  };

  const loadAssignmentInForm = (assignment: MemberSkill) => {
    setSelectedSkillId(assignment.skillId);
    setSelectedLevel(assignment.level);
    setWillingToTeach(assignment.willingToTeach);
    setWantsToLearn(assignment.wantsToLearn);
  };

  if (!activeProjectId) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
        <Header showBackButton />
        <div className="flex-1 min-h-0 overflow-auto p-6">
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            Escolha um projeto ativo no topo para gerir competências apenas dessa equipa.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
      <Header showBackButton />

      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Matriz de Competências</h1>
          <p className="text-gray-600 mt-1">
            Mapeamento de habilidades e capacidades da equipa de {activeProject?.name || "projeto ativo"}
          </p>
        </div>

        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingSkillId ? "Editar competência" : "Nova competência"}
          </h2>

          <form onSubmit={handleSaveSkill} className="space-y-4">
            <div>
              <Label htmlFor="skill-name">Nome</Label>
              <Input
                id="skill-name"
                required
                value={formSkillName}
                onChange={(e) => setFormSkillName(e.target.value)}
                placeholder="Ex: Captação de financiamento"
              />
            </div>

            <div>
              <Label>Categoria</Label>
              <Select value={formSkillCategory} onValueChange={(value: SkillCategory) => setFormSkillCategory(value)}>
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
                <Button type="button" variant="outline" onClick={resetSkillForm}>
                  Cancelar edição
                </Button>
              )}
              <Button type="submit" disabled={isSubmittingSkill}>
                {isSubmittingSkill ? "A guardar..." : editingSkillId ? "Guardar" : "Criar"}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Competências registadas</h2>
          {isLoadingSkills ? (
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
                    <Button type="button" variant="outline" size="sm" onClick={() => handleEditSkill(skill)}>
                      Editar
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => void handleDeleteSkill(skill.id)}>
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Atribuir competências a membros</h2>

          {isLoadingMembers ? (
            <p className="text-sm text-gray-500">A carregar membros...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-gray-500">Ainda não existem membros.</p>
          ) : (
            <>
              <form onSubmit={handleSaveMemberSkill} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label>Membro</Label>
                  <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
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
                  <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
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
                  <Select value={String(selectedLevel)} onValueChange={(value) => setSelectedLevel(Number(value) as SkillLevel)}>
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
                    onCheckedChange={(checked) => setWillingToTeach(checked === true)}
                  />
                  <Label htmlFor="willing-to-teach">Disponível para ensinar</Label>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <Checkbox
                    id="wants-to-learn"
                    checked={wantsToLearn}
                    onCheckedChange={(checked) => setWantsToLearn(checked === true)}
                  />
                  <Label htmlFor="wants-to-learn">Quer aprender mais</Label>
                </div>

                <div className="flex items-end justify-end">
                  <Button type="submit" disabled={isSubmittingAssignment}>
                    {isSubmittingAssignment ? "A guardar..." : "Atribuir / Atualizar"}
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
                          <Button type="button" variant="outline" size="sm" onClick={() => loadAssignmentInForm(assignment)}>
                            Carregar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleRemoveMemberSkill(selectedMember.id, assignment.skillId)}
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

        <SkillsMatrix members={members} skills={skills} />
      </div>
    </div>
  );
}
