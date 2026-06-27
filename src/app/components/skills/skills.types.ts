export type SkillCategory = "técnica" | "gestão" | "comunicação" | "especializada";

export type SkillLevel = 1 | 2 | 3 | 4 | 5;

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
}

export interface MemberSkill {
  skillId: string;
  level: SkillLevel;
  willingToTeach: boolean;
  wantsToLearn: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: string;
  availability: number;
  skills: MemberSkill[];
}

export interface ApiSkill {
  id: number;
  nome: string;
  categoria: SkillCategory;
}

export interface ApiMember {
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
