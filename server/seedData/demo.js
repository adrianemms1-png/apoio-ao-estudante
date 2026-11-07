// Dados de demonstracao para a primeira execucao. A coordenacao pode editar,
// remover ou adicionar turmas/professoras/alunos pela propria interface
// depois que o servidor estiver no ar (tela "Coordenacao").
const { hashPassword } = require("../util/hash");

const classes = [
  { id: "jardim-a", name: "Jardim A", level: "Jardim" },
  { id: "pre-i-b", name: "Pré I B", level: "Pré I" }
];

const teachers = [
  { id: "ana", name: "Ana Paula", classIds: ["jardim-a", "pre-i-b"] },
  { id: "carla", name: "Carla Mendes", classIds: ["jardim-a"] },
  { id: "marina", name: "Marina Costa", classIds: ["pre-i-b"] }
];

const students = [
  {
    id: "joao",
    fullName: "João Miguel Alves",
    shortName: "João M.",
    age: 4,
    classId: "jardim-a",
    disability: "TEA nível 1",
    needId: "tea-1",
    profile: "Prefere apoio visual, atividades curtas e previsíveis.",
    strengths: ["desenho guiado", "pareamento de imagens", "rotina visual"],
    cautions: ["evitar sons altos", "evitar vídeos longos", "evitar mudanças bruscas"],
    birthDate: "14/05/2022",
    guardian: "Responsável cadastrado",
    phone: "(00) 00000-0000",
    documentsNote: "Laudo e ficha administrativa disponíveis para coordenação"
  },
  {
    id: "livia",
    fullName: "Lívia Santos Rocha",
    shortName: "Lívia S.",
    age: 5,
    classId: "pre-i-b",
    disability: "Baixa visão",
    needId: "baixa-visao",
    profile: "Responde bem a alto contraste, objetos concretos, letras grandes e descrição verbal à distância.",
    strengths: ["materiais táteis", "contornos grossos", "objetos reais"],
    cautions: [],
    birthDate: "21/08/2021",
    guardian: "Responsável cadastrado",
    phone: "(00) 00000-0000",
    documentsNote: "Relatório oftalmológico disponível para coordenação"
  },
  {
    id: "mateus",
    fullName: "Mateus Ribeiro Lima",
    shortName: "Mateus R.",
    age: 4,
    classId: "jardim-a",
    disability: "Atraso na fala",
    needId: "atraso-fala",
    profile: "Participa melhor com imagens, escolhas simples e tempo extra para responder (a professora não completa a resposta por ele).",
    strengths: ["cartões de escolha", "histórias com imagens", "imitação de gestos"],
    cautions: ["evitar perguntas longas"],
    birthDate: "02/02/2022",
    guardian: "Responsável cadastrado",
    phone: "(00) 00000-0000",
    documentsNote: "Observações fonoaudiológicas restritas à coordenação"
  }
];

function buildUsers() {
  return [
    {
      id: "user-professora",
      email: "professora@escola.com",
      passwordHash: hashPassword("123456"),
      role: "teacher",
      name: "Ana Paula",
      teacherId: "ana"
    },
    {
      id: "user-coordenacao",
      email: "coordenacao@escola.com",
      passwordHash: hashPassword("123456"),
      role: "admin",
      name: "Coordenação Pedagógica",
      teacherId: null
    }
  ];
}

module.exports = { classes, teachers, students, buildUsers };
