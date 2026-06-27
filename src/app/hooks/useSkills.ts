import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPost, apiPut } from "../lib/apiClient";
import type { ApiMember, ApiSkill, MemberSkill, Skill, SkillCategory, SkillLevel, TeamMember } from "../components/skills/skills.types";

export function useSkills(activeProjectId: string | null) {
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

  return {
    skills,
    members,
    isLoadingSkills,
    isLoadingMembers,
    isSubmittingSkill,
    isSubmittingAssignment,
    editingSkillId,
    formSkillName,
    formSkillCategory,
    selectedMemberId,
    selectedSkillId,
    selectedLevel,
    willingToTeach,
    wantsToLearn,
    selectedMember,
    skillNameById,
    setFormSkillName,
    setFormSkillCategory,
    setSelectedMemberId,
    setSelectedSkillId,
    setSelectedLevel,
    setWillingToTeach,
    setWantsToLearn,
    resetSkillForm,
    handleSaveSkill,
    handleEditSkill,
    handleDeleteSkill,
    handleSaveMemberSkill,
    handleRemoveMemberSkill,
    loadAssignmentInForm,
  };
}
