import { useState, useMemo } from "react";
import type { MKCard } from "../components/methodkit/methodkit.types";

const CARDS: MKCard[] = [
  // Estratégia & Visão
  { id: "vision", title: "Vision", titlePt: "Visão", description: "Qual é a direção e o propósito geral do projeto? O que queremos alcançar a longo prazo?", category: "estrategia", icon: "🔭" },
  { id: "mission", title: "Mission", titlePt: "Missão", description: "Porque existe este projeto? Qual é a razão fundamental de ser deste trabalho?", category: "estrategia", icon: "🎯" },
  { id: "goals", title: "Goals", titlePt: "Objetivos", description: "O que queremos concretamente atingir? Quais são os resultados esperados do projeto?", category: "estrategia", icon: "🏆" },
  { id: "objectives", title: "Objectives", titlePt: "Metas", description: "Quais são os resultados específicos e mensuráveis que definem o sucesso do projeto?", category: "estrategia", icon: "📌" },
  { id: "strategy", title: "Strategy", titlePt: "Estratégia", description: "Como vamos atingir os objetivos? Qual é a abordagem geral que vamos seguir?", category: "estrategia", icon: "🗺️" },
  { id: "problem", title: "Problem Statement", titlePt: "Problema", description: "Qual é o problema que o projeto resolve? Que necessidade ou lacuna identificámos?", category: "estrategia", icon: "🔍" },
  { id: "success", title: "Success Criteria", titlePt: "Critérios de Sucesso", description: "Como sabemos que o projeto foi bem-sucedido? Que indicadores confirmam o sucesso?", category: "estrategia", icon: "✅" },
  { id: "impact", title: "Impact", titlePt: "Impacto", description: "Que mudança real esperamos criar? Qual é o efeito a longo prazo do nosso trabalho?", category: "estrategia", icon: "💡" },

  // Partes Interessadas
  { id: "stakeholders", title: "Stakeholders", titlePt: "Partes Interessadas", description: "Quem é afetado pelo projeto ou tem interesse nele? Como os envolvemos?", category: "stakeholders", icon: "👥" },
  { id: "target_group", title: "Target Group", titlePt: "Grupo Alvo", description: "Quem são os beneficiários diretos do projeto? Quem queremos alcançar?", category: "stakeholders", icon: "🎯" },
  { id: "partners", title: "Partners", titlePt: "Parceiros", description: "Que organizações colaboram no projeto? Qual é o papel e contribuição de cada parceiro?", category: "stakeholders", icon: "🤝" },
  { id: "community", title: "Community", titlePt: "Comunidade", description: "Que comunidade alargada está envolvida ou é afetada? Como a envolvemos?", category: "stakeholders", icon: "🏘️" },
  { id: "sponsors", title: "Sponsors", titlePt: "Patrocinadores", description: "Quem financia ou apoia o projeto? Quais são as suas expectativas e condições?", category: "stakeholders", icon: "💼" },
  { id: "decision_makers", title: "Decision Makers", titlePt: "Decisores", description: "Quem tem autoridade para tomar decisões? Como funciona o processo de decisão?", category: "stakeholders", icon: "⚖️" },

  // Equipa & Organização
  { id: "team", title: "Team", titlePt: "Equipa", description: "Quem faz parte da equipa? Que competências e perfis são necessários?", category: "equipa", icon: "👤" },
  { id: "roles", title: "Roles & Responsibilities", titlePt: "Papéis e Responsabilidades", description: "Quem faz o quê? Como estão distribuídas as responsabilidades na equipa?", category: "equipa", icon: "📋" },
  { id: "leadership", title: "Leadership", titlePt: "Liderança", description: "Como é exercida a liderança no projeto? Quem lidera e como as decisões são tomadas?", category: "equipa", icon: "🧭" },
  { id: "competencies", title: "Competencies", titlePt: "Competências", description: "Que competências são necessárias? Existem lacunas que precisam de ser colmatadas?", category: "equipa", icon: "🎓" },
  { id: "recruitment", title: "Recruitment", titlePt: "Recrutamento", description: "Como recrutamos membros para a equipa? Que critérios e processos usamos?", category: "equipa", icon: "📢" },
  { id: "volunteers", title: "Volunteers", titlePt: "Voluntários", description: "Que papel têm os voluntários? Como os gerimos e motivamos?", category: "equipa", icon: "🙋" },

  // Planeamento
  { id: "scope", title: "Scope", titlePt: "Âmbito", description: "O que está dentro e fora do projeto? Quais são os limites do trabalho?", category: "planeamento", icon: "📐" },
  { id: "activities", title: "Activities", titlePt: "Atividades", description: "Que atividades concretas precisam de acontecer? Como as organizamos e sequenciamos?", category: "planeamento", icon: "📝" },
  { id: "milestones", title: "Milestones", titlePt: "Marcos", description: "Quais são os pontos de controlo chave? Que eventos marcam o progresso do projeto?", category: "planeamento", icon: "🏁" },
  { id: "timeline", title: "Time Frame", titlePt: "Cronograma", description: "Qual é o horizonte temporal do projeto? Como distribuímos as fases ao longo do tempo?", category: "planeamento", icon: "📅" },
  { id: "deadlines", title: "Deadlines", titlePt: "Prazos", description: "Quais são as datas críticas? Que compromissos de prazo temos que cumprir?", category: "planeamento", icon: "⏰" },
  { id: "dependencies", title: "Dependencies", titlePt: "Dependências", description: "O que depende do quê? Quais são as relações e bloqueadores entre atividades?", category: "planeamento", icon: "🔗" },
  { id: "planning", title: "Planning", titlePt: "Planeamento", description: "Como abordamos o processo de planeamento? Que metodologia e ferramentas usamos?", category: "planeamento", icon: "🗂️" },

  // Recursos
  { id: "budget", title: "Budget", titlePt: "Orçamento", description: "Qual é o orçamento disponível? Como o distribuímos pelas diferentes necessidades?", category: "recursos", icon: "💰" },
  { id: "funding", title: "Funding", titlePt: "Financiamento", description: "De onde vem o dinheiro? Que fontes de financiamento temos ou precisamos de procurar?", category: "recursos", icon: "💶" },
  { id: "resources", title: "Resources", titlePt: "Recursos", description: "Que recursos humanos, materiais e tecnológicos precisamos? O que já temos disponível?", category: "recursos", icon: "🛠️" },
  { id: "equipment", title: "Equipment", titlePt: "Equipamento", description: "Que ferramentas, equipamentos e materiais são necessários para executar o projeto?", category: "recursos", icon: "💻" },
  { id: "space", title: "Space / Location", titlePt: "Espaço / Localização", description: "Onde decorre o projeto? Que espaços físicos ou virtuais são necessários?", category: "recursos", icon: "📍" },

  // Comunicação
  { id: "communication", title: "Communication", titlePt: "Comunicação", description: "Como comunicamos dentro da equipa e com o exterior? Que canais e frequência usamos?", category: "comunicacao", icon: "📡" },
  { id: "meetings", title: "Meetings", titlePt: "Reuniões", description: "Como realizamos as nossas reuniões? Que tipo de reuniões precisamos e com que frequência?", category: "comunicacao", icon: "🗣️" },
  { id: "reporting", title: "Reporting", titlePt: "Relatórios", description: "Como reportamos o progresso? A quem reportamos e com que formato e periodicidade?", category: "comunicacao", icon: "📊" },
  { id: "documentation", title: "Documentation", titlePt: "Documentação", description: "Como documentamos o trabalho? Que registos são necessários e como os organizamos?", category: "comunicacao", icon: "📁" },
  { id: "marketing", title: "Marketing", titlePt: "Marketing", description: "Como promovemos o projeto? Que estratégia de comunicação externa seguimos?", category: "comunicacao", icon: "📣" },
  { id: "social_media", title: "Social Media", titlePt: "Redes Sociais", description: "Como usamos as redes sociais? Que plataformas e conteúdos são relevantes para o projeto?", category: "comunicacao", icon: "📱" },

  // Risco & Qualidade
  { id: "risks", title: "Risks", titlePt: "Riscos", description: "O que pode correr mal? Quais são as ameaças e vulnerabilidades que enfrentamos?", category: "risco", icon: "⚠️" },
  { id: "mitigation", title: "Risk Mitigation", titlePt: "Mitigação de Riscos", description: "Como gerimos os riscos identificados? Que planos de contingência temos?", category: "risco", icon: "🛡️" },
  { id: "quality", title: "Quality", titlePt: "Qualidade", description: "Que padrões de qualidade seguimos? Como garantimos que o trabalho cumpre os requisitos?", category: "risco", icon: "⭐" },
  { id: "compliance", title: "Compliance", titlePt: "Conformidade", description: "Que requisitos legais e regulatórios temos de cumprir? Como garantimos a conformidade?", category: "risco", icon: "⚖️" },
  { id: "security", title: "Security", titlePt: "Segurança", description: "Como protegemos os dados e garantimos a segurança das pessoas envolvidas no projeto?", category: "risco", icon: "🔒" },

  // Monitorização & Avaliação
  { id: "monitoring", title: "Monitoring", titlePt: "Monitorização", description: "Como acompanhamos o progresso? Que processos e ferramentas usamos para monitorizar?", category: "avaliacao", icon: "📈" },
  { id: "kpis", title: "KPIs", titlePt: "Indicadores Chave", description: "Que indicadores de desempenho usamos? Como medimos o progresso em relação aos objetivos?", category: "avaliacao", icon: "📉" },
  { id: "evaluation", title: "Evaluation", titlePt: "Avaliação", description: "Como avaliamos os resultados e o impacto? Que metodologia de avaliação usamos?", category: "avaliacao", icon: "🔬" },
  { id: "feedback", title: "Feedback", titlePt: "Feedback", description: "Como recolhemos feedback das partes interessadas? Como o incorporamos no projeto?", category: "avaliacao", icon: "💬" },
  { id: "lessons", title: "Lessons Learned", titlePt: "Lições Aprendidas", description: "O que aprendemos ao longo do projeto? Como capturamos e partilhamos esse conhecimento?", category: "avaliacao", icon: "📚" },
  { id: "data", title: "Data & Evidence", titlePt: "Dados & Evidências", description: "Que dados recolhemos? Como usamos evidências para tomar decisões e demonstrar impacto?", category: "avaliacao", icon: "🗃️" },

  // Entrega & Impacto
  { id: "deliverables", title: "Deliverables", titlePt: "Entregáveis", description: "O que produzimos concretamente? Quais são os resultados tangíveis do projeto?", category: "entrega", icon: "📦" },
  { id: "launch", title: "Launch", titlePt: "Lançamento", description: "Como lançamos o projeto ou os seus resultados? Que eventos ou ações marcam a entrega?", category: "entrega", icon: "🚀" },
  { id: "sustainability", title: "Sustainability", titlePt: "Sustentabilidade", description: "Como garantimos a continuidade após o projeto? Que mecanismos asseguram a sustentabilidade?", category: "entrega", icon: "♻️" },
  { id: "scaling", title: "Scaling", titlePt: "Escalabilidade", description: "Como crescemos e replicamos o projeto? O que é necessário para escalar o impacto?", category: "entrega", icon: "📐" },
  { id: "exit", title: "Exit Strategy", titlePt: "Estratégia de Saída", description: "Como termina o projeto? Que processos asseguram uma conclusão ordenada e responsável?", category: "entrega", icon: "🚪" },
  { id: "legacy", title: "Legacy", titlePt: "Legado", description: "O que fica depois do projeto terminar? Que conhecimento, estruturas ou mudanças perduam?", category: "entrega", icon: "🏛️" },
  { id: "change", title: "Change Management", titlePt: "Gestão da Mudança", description: "Como gerimos as mudanças durante o projeto? Que processos de adaptação temos?", category: "entrega", icon: "🔄" },
];

export { CARDS };

export function useMethodKit() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [workshopMode, setWorkshopMode] = useState(false);

  const filteredCards = useMemo(() => {
    let cards = CARDS;
    if (selectedCategory) cards = cards.filter((c) => c.category === selectedCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      cards = cards.filter(
        (c) =>
          c.titlePt.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      );
    }
    if (workshopMode) cards = cards.filter((c) => selectedCards.has(c.id));
    return cards;
  }, [search, selectedCategory, selectedCards, workshopMode]);

  const toggleCard = (id: string) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetSelection = () => {
    setSelectedCards(new Set());
    setWorkshopMode(false);
  };

  return {
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    selectedCards,
    workshopMode,
    setWorkshopMode,
    filteredCards,
    toggleCard,
    resetSelection,
  };
}
