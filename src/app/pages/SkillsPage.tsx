import { Header } from "../components/layout/Header";
import { SkillsMatrix } from "../components/skills/SkillsMatrix";
import { SkillForm } from "../components/skills/SkillForm";
import { SkillList } from "../components/skills/SkillList";
import { SkillAssignmentPanel } from "../components/skills/SkillAssignmentPanel";
import { useSkills } from "../hooks/useSkills";
import { useProjectContext } from "../contexts/ProjectContext";

export function SkillsPage() {
  const { activeProject, activeProjectId } = useProjectContext();
  const {
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
  } = useSkills(activeProjectId);

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

        <SkillForm
          editingSkillId={editingSkillId}
          formSkillName={formSkillName}
          formSkillCategory={formSkillCategory}
          isSubmitting={isSubmittingSkill}
          onSubmit={handleSaveSkill}
          onChangeName={setFormSkillName}
          onChangeCategory={setFormSkillCategory}
          onCancel={resetSkillForm}
        />

        <SkillList
          skills={skills}
          isLoading={isLoadingSkills}
          onEdit={handleEditSkill}
          onDelete={handleDeleteSkill}
        />

        <SkillAssignmentPanel
          members={members}
          skills={skills}
          isLoading={isLoadingMembers}
          selectedMemberId={selectedMemberId}
          selectedSkillId={selectedSkillId}
          selectedLevel={selectedLevel}
          willingToTeach={willingToTeach}
          wantsToLearn={wantsToLearn}
          isSubmitting={isSubmittingAssignment}
          selectedMember={selectedMember}
          skillNameById={skillNameById}
          onChangeMemberId={setSelectedMemberId}
          onChangeSkillId={setSelectedSkillId}
          onChangeLevel={setSelectedLevel}
          onChangeWillingToTeach={setWillingToTeach}
          onChangeWantsToLearn={setWantsToLearn}
          onSubmit={handleSaveMemberSkill}
          onRemove={handleRemoveMemberSkill}
          onLoadAssignment={loadAssignmentInForm}
        />

        <SkillsMatrix members={members} skills={skills} />
      </div>
    </div>
  );
}
