// Base completa dos objetivos de aprendizagem e desenvolvimento da BNCC
// para Pre I (EI03, faixa 4-5 anos) e Jardim (EI02, faixa 3-4 anos),
// transcrita do PDF "Pre I e Jardim.pdf" fornecido pelo usuario.
const bnccGoals = [
  // ---- PRE I (EI03) ----
  { code: "EI03EO01", level: "Pré I", field: "O eu, o outro e o nós", text: "Demonstrar empatia pelos outros, percebendo que as pessoas têm diferentes sentimentos, necessidades e maneiras de pensar e agir." },
  { code: "EI03EO02", level: "Pré I", field: "O eu, o outro e o nós", text: "Agir de maneira independente, com confiança nas próprias capacidades, reconhecendo suas conquistas e limitações." },
  { code: "EI03EO03", level: "Pré I", field: "O eu, o outro e o nós", text: "Ampliar as relações interpessoais, desenvolvendo atitudes de participação e cooperação." },
  { code: "EI03EO04", level: "Pré I", field: "O eu, o outro e o nós", text: "Comunicar suas ideias e sentimentos a pessoas e grupos diversos." },
  { code: "EI03EO05", level: "Pré I", field: "O eu, o outro e o nós", text: "Demonstrar valorização das características de seu corpo e respeitar as características dos outros (crianças e adultos) com os quais convive." },
  { code: "EI03EO06", level: "Pré I", field: "O eu, o outro e o nós", text: "Manifestar interesse e respeito por diferentes culturas (locais e regionais) e modos de vida." },
  { code: "EI03EO07", level: "Pré I", field: "O eu, o outro e o nós", text: "Usar estratégias pautadas no respeito mútuo para lidar com conflitos nas interações com crianças e adultos." },

  { code: "EI03CG01", level: "Pré I", field: "Corpo, gestos e movimentos", text: "Criar com o corpo formas diversificadas de expressão de sentimentos, sensações e emoções, tanto nas situações do cotidiano quanto em brincadeiras, dança, teatro, música." },
  { code: "EI03CG02", level: "Pré I", field: "Corpo, gestos e movimentos", text: "Demonstrar controle e adequação do uso de seu corpo em brincadeiras e jogos, escuta e reconto de histórias, atividades artísticas, entre outras possibilidades." },
  { code: "EI03CG03", level: "Pré I", field: "Corpo, gestos e movimentos", text: "Criar movimentos, gestos, olhares e mímicas em brincadeiras, jogos e atividades artísticas como dança, teatro e música." },
  { code: "EI03CG05", level: "Pré I", field: "Corpo, gestos e movimentos", text: "Coordenar suas habilidades manuais no atendimento adequado a seus interesses e necessidades em situações diversas." },

  { code: "EI03TS01", level: "Pré I", field: "Traços, cores, sons e formas", text: "Utilizar sons produzidos por materiais, objetos e instrumentos musicais durante brincadeiras de faz de conta, encenações, criações musicais, festas." },
  { code: "EI03TS02", level: "Pré I", field: "Traços, cores, sons e formas", text: "Expressar-se livremente por meio de desenho, pintura, colagem, dobradura e escultura, criando produções bidimensionais e tridimensionais." },

  { code: "EI03EF01", level: "Pré I", field: "Escuta, fala, pensamento e imaginação", text: "Expressar ideias, desejos e sentimentos sobre suas vivências, por meio da linguagem oral e escrita (escrita espontânea), de fotos, desenhos e outras formas de expressão." },
  { code: "EI03EF02", level: "Pré I", field: "Escuta, fala, pensamento e imaginação", text: "Inventar brincadeiras cantadas, poemas e canções, criando rimas, aliterações e ritmos." },
  { code: "EI03EF03", level: "Pré I", field: "Escuta, fala, pensamento e imaginação", text: "Escolher e folhear livros, procurando orientar-se por temas e ilustrações e tentando identificar palavras conhecidas." },
  { code: "EI03EF04", level: "Pré I", field: "Escuta, fala, pensamento e imaginação", text: "Recontar histórias ouvidas e planejar coletivamente roteiros de vídeos e de encenações, definindo os contextos, os personagens, a estrutura da história." },
  { code: "EI03EF05", level: "Pré I", field: "Escuta, fala, pensamento e imaginação", text: "Recontar histórias ouvidas para produção de reconto escrito, tendo o professor como escriba." },
  { code: "EI03EF06", level: "Pré I", field: "Escuta, fala, pensamento e imaginação", text: "Produzir suas próprias histórias orais e escritas (escrita espontânea), em situações com função social significativa." },
  { code: "EI03EF07", level: "Pré I", field: "Escuta, fala, pensamento e imaginação", text: "Levantar hipóteses sobre gêneros textuais veiculados em portadores conhecidos, recorrendo a estratégias de observação gráfica e/ou de leitura." },
  { code: "EI03EF08", level: "Pré I", field: "Escuta, fala, pensamento e imaginação", text: "Selecionar livros e textos de gêneros conhecidos para a leitura de um adulto e/ou para sua própria leitura (partindo de seu repertório sobre esses textos, como a recuperação pela memória, pela leitura das ilustrações etc.)." },
  { code: "EI03EF09", level: "Pré I", field: "Escuta, fala, pensamento e imaginação", text: "Levantar hipóteses em relação à linguagem escrita, realizando registros de palavras e textos, por meio de escrita espontânea." },

  { code: "EI03ET01", level: "Pré I", field: "Espaços, tempos, quantidades, relações e transformações", text: "Estabelecer relações de comparação entre objetos, observando suas propriedades." },
  { code: "EI03ET02", level: "Pré I", field: "Espaços, tempos, quantidades, relações e transformações", text: "Observar e descrever mudanças em diferentes materiais, resultantes de ações sobre eles, em experimentos envolvendo fenômenos naturais e artificiais." },
  { code: "EI03ET03", level: "Pré I", field: "Espaços, tempos, quantidades, relações e transformações", text: "Identificar e selecionar fontes de informações, para responder questões sobre a natureza, seus fenômenos, sua conservação, assim como as causas e consequências de fenômenos característicos de sua região (marés, enchentes, enxurradas, neve, geada, granizo, vendavais, etc.)." },
  { code: "EI03ET04", level: "Pré I", field: "Espaços, tempos, quantidades, relações e transformações", text: "Registrar observações, manipulações e medidas, usando múltiplas linguagens (desenho, registro por números ou escrita espontânea), em diferentes suportes." },
  { code: "EI03ET05", level: "Pré I", field: "Espaços, tempos, quantidades, relações e transformações", text: "Classificar objetos e figuras de acordo com suas semelhanças e diferenças." },
  { code: "EI03ET06", level: "Pré I", field: "Espaços, tempos, quantidades, relações e transformações", text: "Relatar fatos importantes sobre seu nascimento e desenvolvimento, a história dos seus familiares e da sua comunidade." },
  { code: "EI03ET07", level: "Pré I", field: "Espaços, tempos, quantidades, relações e transformações", text: "Relacionar números às suas respectivas quantidades e identificar o antes, o depois e o entre em uma sequência." },
  { code: "EI03ET08", level: "Pré I", field: "Espaços, tempos, quantidades, relações e transformações", text: "Expressar medidas (peso, altura etc.), construindo gráficos básicos." },

  // ---- JARDIM (EI02) ----
  { code: "EI02EO01", level: "Jardim", field: "O eu, o outro e o nós", text: "Demonstrar atitudes de cuidado e solidariedade na interação com crianças, adultos e demais seres vivos." },
  { code: "EI02EO02", level: "Jardim", field: "O eu, o outro e o nós", text: "Demonstrar imagem positiva de si e confiança em sua capacidade para enfrentar dificuldades e desafios." },
  { code: "EI02EO03", level: "Jardim", field: "O eu, o outro e o nós", text: "Compartilhar os objetos e os espaços internos e externos com crianças da mesma faixa etária, de outras faixas etárias e adultos." },
  { code: "EI02EO04", level: "Jardim", field: "O eu, o outro e o nós", text: "Comunicar-se com os colegas e os adultos, buscando compreendê-los e fazendo-se compreender." },
  { code: "EI02EO05", level: "Jardim", field: "O eu, o outro e o nós", text: "Perceber que as pessoas têm características físicas diferentes, respeitando essas diferenças." },
  { code: "EI02EO06", level: "Jardim", field: "O eu, o outro e o nós", text: "Respeitar regras básicas de convívio social nas interações e brincadeiras." },
  { code: "EI02EO07", level: "Jardim", field: "O eu, o outro e o nós", text: "Resolver conflitos nas interações e brincadeiras, com a orientação de um adulto." },

  { code: "EI02CG01", level: "Jardim", field: "Corpo, gestos e movimentos", text: "Apropriar-se de gestos e movimentos de sua cultura no cuidado de si e nos jogos e brincadeiras." },
  { code: "EI02CG02", level: "Jardim", field: "Corpo, gestos e movimentos", text: "Deslocar seu corpo no espaço, orientando-se por noções como em frente, atrás, no alto, embaixo, dentro, fora etc., ao se envolver em brincadeiras e atividades de diferentes naturezas." },
  { code: "EI02CG03", level: "Jardim", field: "Corpo, gestos e movimentos", text: "Explorar formas de deslocamento no espaço (pular, saltar, dançar), combinando movimentos e seguindo orientações." },
  { code: "EI02CG04", level: "Jardim", field: "Corpo, gestos e movimentos", text: "Demonstrar progressiva independência no cuidado do seu corpo e de seus pertences em espaço coletivo." },
  { code: "EI02CG05", level: "Jardim", field: "Corpo, gestos e movimentos", text: "Desenvolver progressivamente as habilidades manuais, adquirindo controle para desenhar, pintar, rasgar, folhear, entre outros." },

  { code: "EI02TS01", level: "Jardim", field: "Traços, cores, sons e formas", text: "Criar sons com materiais, objetos, instrumentos musicais e objetos da cultura local e elementos naturais da região para acompanhar diversos ritmos de música." },
  { code: "EI02TS02", level: "Jardim", field: "Traços, cores, sons e formas", text: "Utilizar materiais variados com possibilidades de manipulação (argila, massa de modelar), explorando cores, texturas, superfícies, planos, formas e volumes ao criar objetos tridimensionais." },
  { code: "EI02TS03", level: "Jardim", field: "Traços, cores, sons e formas", text: "Utilizar diferentes fontes sonoras disponíveis no ambiente em brincadeiras cantadas, canções, músicas, melodias e histórias." },

  { code: "EI02EF01", level: "Jardim", field: "Escuta, fala, pensamento e imaginação", text: "Dialogar com crianças e adultos, expressando seus desejos, necessidades, sentimentos e opiniões." },
  { code: "EI02EF02", level: "Jardim", field: "Escuta, fala, pensamento e imaginação", text: "Identificar e criar diferentes sons e reconhecer rimas e aliterações em cantigas de roda e textos poéticos." },
  { code: "EI02EF03", level: "Jardim", field: "Escuta, fala, pensamento e imaginação", text: "Demonstrar interesse e atenção ao ouvir a leitura de histórias e outros textos, diferenciando escrita de ilustrações, e acompanhando, com orientação do adulto-leitor, a direção da leitura (de cima para baixo, da esquerda para a direita)." },
  { code: "EI02EF04", level: "Jardim", field: "Escuta, fala, pensamento e imaginação", text: "Formular e responder perguntas sobre fatos da história narrada, identificando cenários, personagens e principais acontecimentos." },
  { code: "EI02EF05", level: "Jardim", field: "Escuta, fala, pensamento e imaginação", text: "Relatar experiências e fatos acontecidos, histórias ouvidas, filmes ou peças teatrais assistidos, a história da cidade, do bairro, da Unidade de Ensino, etc." },
  { code: "EI02EF06", level: "Jardim", field: "Escuta, fala, pensamento e imaginação", text: "Criar e contar histórias oralmente, com base em imagens ou temas sugeridos." },
  { code: "EI02EF07", level: "Jardim", field: "Escuta, fala, pensamento e imaginação", text: "Manusear diferentes portadores textuais, demonstrando reconhecer seus usos sociais." },
  { code: "EI02EF08", level: "Jardim", field: "Escuta, fala, pensamento e imaginação", text: "Manipular textos e participar de situações de escuta para ampliar seu contato com diferentes gêneros textuais (parlendas, histórias de aventura, tirinhas, cartazes de sala, cardápios, notícias etc.)." },
  { code: "EI02EF09", level: "Jardim", field: "Escuta, fala, pensamento e imaginação", text: "Manusear diferentes instrumentos e suportes de escrita para desenhar, traçar letras e outros sinais gráficos." },

  { code: "EI02ET01", level: "Jardim", field: "Espaços, tempos, quantidades, relações e transformações", text: "Explorar e descrever semelhanças e diferenças entre as características e propriedades dos objetos (textura, massa, tamanho)." },
  { code: "EI02ET02", level: "Jardim", field: "Espaços, tempos, quantidades, relações e transformações", text: "Observar, relatar e descrever incidentes do cotidiano e fenômenos naturais (luz solar, vento, chuva, fases da lua, bem como fenômenos que ocorrem na região em que vivem: marés, enchentes, enxurradas, neve, geada, granizo, vendavais, etc.)." },
  { code: "EI02ET03", level: "Jardim", field: "Espaços, tempos, quantidades, relações e transformações", text: "Compartilhar com outras crianças situações de cuidado de plantas e animais nos espaços da instituição e fora dela." },
  { code: "EI02ET04", level: "Jardim", field: "Espaços, tempos, quantidades, relações e transformações", text: "Identificar relações espaciais (dentro e fora, em cima, embaixo, acima, abaixo, entre e do lado) e temporais (antes, durante e depois)." },
  { code: "EI02ET05", level: "Jardim", field: "Espaços, tempos, quantidades, relações e transformações", text: "Classificar objetos, considerando determinado atributo (tamanho, peso, cor, forma etc.)." },
  { code: "EI02ET06", level: "Jardim", field: "Espaços, tempos, quantidades, relações e transformações", text: "Utilizar conceitos básicos de tempo (agora, antes, durante, depois, ontem, hoje, amanhã, lento, rápido, depressa, devagar)." },
  { code: "EI02ET07", level: "Jardim", field: "Espaços, tempos, quantidades, relações e transformações", text: "Contar oralmente objetos, pessoas, livros etc., em contextos diversos." },
  { code: "EI02ET08", level: "Jardim", field: "Espaços, tempos, quantidades, relações e transformações", text: "Registrar com números a quantidade de crianças (meninas e meninos, presentes e ausentes) e a quantidade de objetos da mesma natureza (bonecas, bolas, livros etc.)." }
];

module.exports = bnccGoals;
