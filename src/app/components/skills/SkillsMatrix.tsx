import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Progress } from "../ui/progress";
import { Star, TrendingUp } from "lucide-react";

interface Skill {
  id: string;
  name: string;
  category: "técnica" | "gestão" | "comunicação" | "especializada";
}

interface MemberSkill {
  skillId: string;
  level: 1 | 2 | 3 | 4 | 5; // 1=Iniciante, 5=Especialista
  willingToTeach: boolean;
  wantsToLearn: boolean;
}

interface TeamMember {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: string;
  skills: MemberSkill[];
  availability: number; // Percentagem de tempo disponível
}

interface SkillsMatrixProps {
  members: TeamMember[];
  skills: Skill[];
}


const categoryColors = {
  técnica: "bg-blue-100 text-blue-700",
  gestão: "bg-purple-100 text-purple-700",
  comunicação: "bg-green-100 text-green-700",
  especializada: "bg-orange-100 text-orange-700",
};

export function SkillsMatrix({ members, skills }: SkillsMatrixProps) {
  const getSkillCoverage = (skillId: string) => {
    const membersWithSkill = members.filter((m) =>
      m.skills.some((s) => s.skillId === skillId && s.level >= 3)
    );
    return membersWithSkill.length;
  };

  const getSkillGaps = () => {
    return skills.filter((skill) => getSkillCoverage(skill.id) === 0);
  };

  const skillGaps = getSkillGaps();

  return (
    <div className="space-y-6">
      {/* Skill Gaps Alert */}
      {skillGaps.length > 0 && (
        <Card className="p-4 bg-orange-50 border-orange-200">
          <h4 className="font-semibold text-orange-800 mb-2">
            ⚠️ Competências em Falta ({skillGaps.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {skillGaps.map((skill) => (
              <Badge key={skill.id} variant="outline" className="border-orange-300">
                {skill.name}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Members Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member) => (
          <Card key={member.id} className="p-4">
            {/* Member Header */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b">
              <Avatar className="size-12" style={{ backgroundColor: member.color }}>
                <AvatarFallback className="text-white font-medium">
                  {member.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{member.name}</h4>
                <p className="text-sm text-gray-600">{member.role}</p>
                <div className="mt-1">
                  <Progress value={member.availability} className="h-1.5" />
                  <p className="text-xs text-gray-500 mt-1">
                    {member.availability}% disponível
                  </p>
                </div>
              </div>
            </div>

            {/* Skills List */}
            <div className="space-y-2">
              {member.skills
                .sort((a, b) => b.level - a.level)
                .map((memberSkill) => {
                  const skill = skills.find((s) => s.id === memberSkill.skillId);
                  if (!skill) return null;

                  return (
                    <div
                      key={memberSkill.skillId}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{skill.name}</span>
                          {memberSkill.willingToTeach && (
                            <Star className="size-3 text-yellow-500 fill-yellow-500" aria-label="Disposto a ensinar" />
                          )}
                          {memberSkill.wantsToLearn && (
                            <TrendingUp className="size-3 text-blue-500" aria-label="Quer aprender mais" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`size-2 rounded-full ${
                              level <= memberSkill.level
                                ? "bg-blue-600"
                                : "bg-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>
        ))}
      </div>

      {/* Skills Overview */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Visão Geral de Competências</h3>
        <div className="space-y-3">
          {skills.map((skill) => {
            const coverage = getSkillCoverage(skill.id);
            const membersWithSkill = members.filter((m) =>
              m.skills.some((s) => s.skillId === skill.id)
            );
            const avgLevel =
              membersWithSkill.length > 0
                ? membersWithSkill.reduce(
                    (sum, m) =>
                      sum +
                      (m.skills.find((s) => s.skillId === skill.id)?.level || 0),
                    0
                  ) / membersWithSkill.length
                : 0;

            return (
              <div key={skill.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{skill.name}</span>
                    <Badge className={categoryColors[skill.category]}>
                      {skill.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span>{coverage} especialistas</span>
                    {avgLevel > 0 && (
                      <span>• Nível médio: {avgLevel.toFixed(1)}/5</span>
                    )}
                  </div>
                </div>
                <div className="w-32">
                  <Progress value={(coverage / members.length) * 100} className="h-2" />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
