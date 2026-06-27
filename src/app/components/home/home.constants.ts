export const PROJECT_STATUS_ORDER = ["Planeamento", "Em curso", "Suspenso", "Concluído"] as const;

export const PROJECT_STATUS_META: Record<string, { color: string; label: string }> = {
  Planeamento: { color: "#f59e0b", label: "A preparar" },
  "Em curso": { color: "#2563eb", label: "Em execução" },
  Suspenso: { color: "#64748b", label: "Pausado" },
  Concluído: { color: "#16a34a", label: "Fechado" },
};
