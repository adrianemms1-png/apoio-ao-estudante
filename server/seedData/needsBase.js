// Base inicial de deficiencias/necessidades educacionais especiais (NEE),
// migrada do protótipo original. Continua marcada como sugestao inicial de
// IA (a ideia, descrita no PDF do projeto, e permitir consultar uma IA de
// verdade para revisar cada bloco no futuro - ver server/aiPrompt.js).
const needsBase = [
  {
    id: "tea-1",
    name: "TEA nível 1",
    source: "Base inicial sugerida por IA",
    summary: "Pode envolver necessidade de previsibilidade, apoio visual, mediação social e atenção a sensibilidades sensoriais.",
    barriers: ["mudanças bruscas na rotina", "excesso de som ou estímulos", "comandos longos ou abstratos"],
    strategies: ["rotina visual", "instruções em etapas", "escolha entre opções", "antecipação de transições"],
    resources: ["cartões visuais", "sequência de imagens", "timer visual", "cantinho de pausa"],
    activityMatches: ["pareamento", "sequência visual", "construção com modelo", "atividade individual curta"],
    custom: false
  },
  {
    id: "tea-2",
    name: "TEA nível 2",
    source: "Base inicial sugerida por IA",
    summary: "Pode demandar apoio mais frequente na comunicação, autorregulação, transições e participação em atividades coletivas.",
    barriers: ["ambiente imprevisível", "muitas etapas sem mediação", "exigência verbal intensa"],
    strategies: ["comunicação alternativa", "modelagem pelo adulto", "redução de estímulos", "mediação próxima"],
    resources: ["CAA", "objetos concretos", "prancha de escolha", "apoio visual ampliado"],
    activityMatches: ["exploração sensorial controlada", "imitação de ações", "escolha por cartões", "tarefas curtas"],
    custom: false
  },
  {
    id: "tdah",
    name: "TDAH",
    source: "Base inicial sugerida por IA",
    summary: "Pode envolver dificuldade de manter atenção, impulsividade, necessidade de movimento e benefício com tarefas curtas.",
    barriers: ["esperas longas", "atividade muito repetitiva", "instruções sem objetivo claro"],
    strategies: ["tarefas por etapas", "pausas de movimento", "combinados visuais", "reforço imediato"],
    resources: ["timer", "cartões de missão", "material manipulável", "estações rápidas"],
    activityMatches: ["percurso motor", "jogo de classificação", "missões curtas", "atividade prática"],
    custom: false
  },
  {
    id: "baixa-visao",
    name: "Baixa visão",
    source: "Base inicial sugerida por IA",
    summary: "Pode exigir ampliação, alto contraste, proximidade do material, boa iluminação e descrição verbal.",
    barriers: ["imagens pequenas", "baixo contraste", "materiais muito distantes"],
    strategies: ["alto contraste", "contornos grossos", "descrição oral", "uso de objetos reais"],
    resources: ["figuras ampliadas", "materiais táteis", "lupa quando aplicável", "papel de alto contraste"],
    activityMatches: ["exploração tátil", "classificação por textura", "registro com material ampliado", "objetos concretos"],
    custom: false
  },
  {
    id: "deficiencia-auditiva",
    name: "Deficiência auditiva",
    source: "Base inicial sugerida por IA",
    summary: "Pode demandar apoio visual, leitura labial quando aplicável, Libras/gestos e redução de ruído de fundo.",
    barriers: ["orientação dada apenas oralmente", "professor fora do campo visual", "música sem apoio visual"],
    strategies: ["demonstração visual", "gestos combinados", "cartões de instrução", "posicionamento frontal"],
    resources: ["imagens sequenciais", "legendas quando houver vídeo", "cartões de ação", "sinais visuais"],
    activityMatches: ["pareamento", "sequência visual", "construção por modelo", "dramatização com gestos"],
    custom: false
  },
  {
    id: "deficiencia-motora",
    name: "Deficiência física/motora",
    source: "Base inicial sugerida por IA",
    summary: "Pode exigir adaptação de postura, tempo, alcance, preensão, deslocamento e alternativas para registro.",
    barriers: ["material pequeno", "atividade com deslocamento obrigatório", "tempo rígido"],
    strategies: ["materiais maiores", "apoio postural", "alternativa de resposta", "tempo ampliado"],
    resources: ["engrossador de lápis", "prancha inclinada", "peças grandes", "suporte para papel"],
    activityMatches: ["classificação com peças grandes", "escolha por cartões", "atividade em mesa adaptada", "registro oral/visual"],
    custom: false
  },
  {
    id: "sindrome-down",
    name: "Síndrome de Down",
    source: "Base inicial sugerida por IA",
    summary: "Pode envolver necessidade de repetição, apoio visual, fortalecimento de linguagem, motricidade e autonomia.",
    barriers: ["comandos longos", "pouco tempo para resposta", "atividade sem modelo concreto"],
    strategies: ["repetição com variação", "modelo visual", "instruções simples", "celebração de pequenas conquistas"],
    resources: ["cartões de rotina", "materiais manipuláveis", "figuras reais", "jogos de encaixe"],
    activityMatches: ["pareamento", "construção guiada", "história com figuras", "classificação simples"],
    custom: false
  },
  {
    id: "atraso-fala",
    name: "Atraso na fala/linguagem",
    source: "Base inicial sugerida por IA",
    summary: "Pode exigir tempo de resposta, alternativas de comunicação, vocabulário visual e perguntas objetivas.",
    barriers: ["pressa por resposta oral", "perguntas longas", "ausência de apoio visual"],
    strategies: ["cartões de escolha", "perguntas sim/não", "modelagem de fala", "tempo de espera"],
    resources: ["CAA simples", "figuras", "sequência de cenas", "objetos reais"],
    activityMatches: ["história com imagens", "escolha entre figuras", "pareamento", "imitação de gestos"],
    custom: false
  }
];

module.exports = needsBase;
