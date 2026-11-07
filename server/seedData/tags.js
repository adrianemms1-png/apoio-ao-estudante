// Vocabulario fixo usado no cadastro de aluno para "pontos fortes" e "cuidados".
// Antes esses dois campos eram texto livre, mas o motor de recomendacao
// (server/engine/activityEngine.js) so reconhece uma atividade como "boa" ou
// "evitar" quando o texto bate EXATAMENTE com o que esta em
// server/seedData/activityTemplates.js (campos goodFor/avoidWhen). Ou seja,
// digitar "evitar barulho" em vez de "evitar sons altos" fazia o cuidado ser
// salvo, mas sem nenhum efeito real na recomendacao - e nada avisava isso.
//
// A solucao adotada foi trocar os campos de texto livre por selecao (checkbox)
// a partir desta lista fixa, que e exatamente o vocabulario que o motor
// entende. Isso fecha, por construcao, a lacuna entre o que a coordenacao
// registra e o que o algoritmo realmente usa.
const STRENGTH_TAGS = [
  "materiais táteis",
  "objetos reais",
  "atividades curtas",
  "histórias com imagens",
  "cartões de escolha",
  "rotina visual",
  "imitação de gestos",
  "pareamento de imagens",
  "contornos grossos",
  "desenho guiado",
  "apoio visual"
];

const CAUTION_TAGS = [
  "evitar texturas desconhecidas",
  "evitar perguntas longas",
  "evitar mudanças bruscas",
  "evitar sons altos",
  "evitar vídeos longos"
];

module.exports = { STRENGTH_TAGS, CAUTION_TAGS };
