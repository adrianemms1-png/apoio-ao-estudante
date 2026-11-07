// Modelos de atividade usados pelo motor de recomendacao (server/engine/activityEngine.js).
// Configuracao do algoritmo, nao dado editavel pela coordenacao - por isso fica
// como seed estatico em codigo, e nao dentro de data/db.json.
const activityTemplates = [
  {
    type: "Investigação sensorial",
    tone: "green",
    resourceClass: "manipulative",
    title: "Caixa de exploração temática",
    resource: "Objetos, texturas ou figuras relacionados ao tema",
    method: "Organize poucos materiais sobre o tema e convide o aluno a explorar, comparar, separar ou nomear com apoio do adulto.",
    support: "Use materiais concretos, previsibilidade e escolha entre poucas opções.",
    goodFor: ["materiais táteis", "objetos reais", "atividades curtas"],
    avoidWhen: ["evitar texturas desconhecidas"]
  },
  {
    type: "Linguagem e narrativa",
    tone: "violet",
    resourceClass: "story",
    title: "Sequência de história com imagens",
    resource: "Três a cinco cenas ilustradas do tema",
    method: "Mostre cenas em ordem, conte uma história curta e peça que o aluno escolha, aponte ou reconte uma parte.",
    support: "Use frases curtas, imagens grandes e tempo de resposta ampliado.",
    goodFor: ["histórias com imagens", "cartões de escolha", "rotina visual"],
    avoidWhen: ["evitar perguntas longas"]
  },
  {
    type: "Movimento orientado",
    tone: "rose",
    resourceClass: "movement",
    title: "Percurso motor do tema",
    resource: "Cartões de ação, marcas no chão e comandos visuais",
    method: "Crie um percurso curto em que o aluno imita movimentos, desloca objetos ou passa por estações ligadas ao tema.",
    support: "Demonstre antes, reduza estímulos e mantenha começo, meio e fim visíveis.",
    goodFor: ["imitação de gestos", "rotina visual"],
    avoidWhen: ["evitar mudanças bruscas"]
  },
  {
    type: "Pareamento e classificação",
    tone: "teal",
    resourceClass: "sequence",
    title: "Jogo de associação",
    resource: "Cartões, miniaturas ou figuras para combinar e separar",
    method: "Peça que o aluno associe personagens, objetos, cores ou características do tema em pares ou pequenos grupos.",
    support: "Ofereça modelo inicial, reduza o número de itens e reforce cada tentativa.",
    goodFor: ["pareamento de imagens", "contornos grossos", "cartões de escolha"],
    avoidWhen: []
  },
  {
    type: "Construção criativa",
    tone: "gold",
    resourceClass: "manipulative",
    title: "Montagem com materiais acessíveis",
    resource: "Massinha, blocos, papel, figuras, sucata limpa ou peças grandes",
    method: "Convide o aluno a montar um elemento do tema usando materiais disponíveis, com modelo simples e etapas visuais.",
    support: "Permita substituir materiais, evitar contato desconfortável e concluir em partes.",
    goodFor: ["materiais táteis", "desenho guiado", "objetos reais"],
    avoidWhen: ["evitar texturas desconhecidas"]
  },
  {
    type: "Recurso digital mediado",
    tone: "teal",
    resourceClass: "digital",
    title: "Recurso digital com tarefa ativa",
    resource: "Imagem, áudio ou trecho curto aprovado pela professora",
    method: "Use um recurso digital breve e associe a uma ação concreta: apontar, escolher cartão, ordenar cenas, manipular objeto ou responder sim/não.",
    support: "Controle volume, duração e pausas; sempre ofereça alternativa sem som.",
    goodFor: ["apoio visual", "histórias com imagens"],
    avoidWhen: ["evitar sons altos", "evitar vídeos longos"]
  },
  {
    type: "Registro visual",
    tone: "gold",
    resourceClass: "visual",
    title: "Painel de escolhas do tema",
    resource: "Figuras, símbolos, cores, adesivos ou desenho com modelo",
    method: "Monte com o aluno um pequeno registro do tema escolhendo imagens, cores ou elementos para colar, marcar ou desenhar.",
    support: "Não limite a resposta ao desenho; aceite apontar, colar, escolher ou narrar.",
    goodFor: ["desenho guiado", "cartões de escolha", "contornos grossos"],
    avoidWhen: []
  }
];

module.exports = activityTemplates;
