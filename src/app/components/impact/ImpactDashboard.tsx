import { Card } from "../ui/card";
import { Progress } from "../ui/progress";
import { Badge } from "../ui/badge";
import { Target, TrendingUp, Users, Leaf, Award } from "lucide-react";

interface SDGGoal {
  id: number;
  name: string;
  icon: string;
  color: string;
}

interface ImpactMetric {
  id: string;
  name: string;
  current: number;
  target: number;
  unit: string;
  category: "social" | "ambiental" | "economico";
  sdg?: number[]; // Objetivos de Desenvolvimento Sustentável relacionados
}

interface ImpactDashboardProps {
  metrics: ImpactMetric[];
}

const sdgGoals: SDGGoal[] = [
  { id: 1, name: "Erradicar a pobreza", icon: "🎯", color: "#E5243B" },
  { id: 4, name: "Educação de qualidade", icon: "📚", color: "#C5192D" },
  { id: 8, name: "Trabalho digno", icon: "💼", color: "#A21942" },
  { id: 11, name: "Cidades sustentáveis", icon: "🏙️", color: "#FD9D24" },
  { id: 12, name: "Consumo responsável", icon: "♻️", color: "#BF8B2E" },
  { id: 13, name: "Ação climática", icon: "🌍", color: "#3F7E44" },
];

const categoryConfig = {
  social: { icon: Users, color: "text-blue-600", bg: "bg-blue-50", label: "Social" },
  ambiental: { icon: Leaf, color: "text-green-600", bg: "bg-green-50", label: "Ambiental" },
  economico: { icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50", label: "Económico" },
};

export function ImpactDashboard({ metrics }: ImpactDashboardProps) {
  const getCategoryMetrics = (category: "social" | "ambiental" | "economico") => {
    return metrics.filter((m) => m.category === category);
  };

  const getOverallProgress = () => {
    const totalProgress = metrics.reduce(
      (sum, m) => sum + (m.current / m.target) * 100,
      0
    );
    return metrics.length > 0 ? totalProgress / metrics.length : 0;
  };

  const getRelatedSDGs = () => {
    const sdgIds = new Set<number>();
    metrics.forEach((m) => {
      m.sdg?.forEach((id) => sdgIds.add(id));
    });
    return Array.from(sdgIds)
      .map((id) => sdgGoals.find((g) => g.id === id))
      .filter(Boolean) as SDGGoal[];
  };

  const relatedSDGs = getRelatedSDGs();

  return (
    <div className="space-y-6">
      {/* Overall Impact */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <Target className="size-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Progresso Global de Impacto</h3>
            <p className="text-sm text-gray-600">Média de todas as métricas</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold text-gray-900">
              {getOverallProgress().toFixed(0)}%
            </span>
            <Award className="size-8 text-yellow-500" />
          </div>
          <Progress value={getOverallProgress()} className="h-3" />
        </div>
      </Card>

      {/* ODS / SDGs */}
      {relatedSDGs.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Objetivos de Desenvolvimento Sustentável (ODS)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {relatedSDGs.map((sdg) => (
              <div
                key={sdg.id}
                className="p-3 rounded-lg border-2"
                style={{ borderColor: sdg.color }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{sdg.icon}</span>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: sdg.color }}>
                      ODS {sdg.id}
                    </div>
                    <div className="text-xs text-gray-600">{sdg.name}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Metrics by Category */}
      {(["social", "ambiental", "economico"] as const).map((category) => {
        const categoryMetrics = getCategoryMetrics(category);
        if (categoryMetrics.length === 0) return null;

        const config = categoryConfig[category];
        const Icon = config.icon;

        return (
          <Card key={category} className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${config.bg}`}>
                <Icon className={`size-5 ${config.color}`} />
              </div>
              <h3 className="font-semibold text-gray-900">Impacto {config.label}</h3>
            </div>

            <div className="space-y-4">
              {categoryMetrics.map((metric) => {
                const progress = (metric.current / metric.target) * 100;
                const isComplete = metric.current >= metric.target;

                return (
                  <div key={metric.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{metric.name}</span>
                          {isComplete && (
                            <Badge className="bg-green-100 text-green-700">
                              ✓ Alcançado
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-gray-900">
                          {metric.current.toLocaleString("pt-PT")}
                        </span>
                        <span className="text-gray-500">
                          {" "}/ {metric.target.toLocaleString("pt-PT")} {metric.unit}
                        </span>
                      </div>
                    </div>
                    <Progress
                      value={Math.min(progress, 100)}
                      className={`h-2 ${isComplete ? "bg-green-200" : ""}`}
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
