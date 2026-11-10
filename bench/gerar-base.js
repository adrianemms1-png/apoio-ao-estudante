'use strict';
// Gera uma base FICTICIA no formato do data/db.json (versao 1.0), em tres
// volumes, a partir dos dados de demonstracao. Usada pelos testes de carga.
// Nenhum dado real e utilizado.
const path = require('node:path');
const demo = require(path.join(__dirname, '..', 'server', 'seedData', 'demo.js'));
const bnccGoals = require(path.join(__dirname, '..', 'server', 'seedData', 'bnccGoals.js'));
const needsBase = require(path.join(__dirname, '..', 'server', 'seedData', 'needsBase.js'));

const CENARIOS = {
  P: { escolas: 1, alunosPorEscola: 200, feedbacksPorAluno: 10 },
  M: { escolas: 20, alunosPorEscola: 200, feedbacksPorAluno: 10 },
  G: { escolas: 100, alunosPorEscola: 200, feedbacksPorAluno: 10 },
};

// senha: senha das contas de teste (os scripts de carga geram uma aleatoria).
function gerarBase(nome = 'M', senha = require('node:crypto').randomBytes(6).toString('hex')) {
  const c = CENARIOS[nome];
  const classes = [...demo.classes], students = [...demo.students], feedbacks = [], auditLog = [], assignments = [];
  const needIds = needsBase.map(n => n.id);
  for (let e = 0; e < c.escolas; e++) {
    for (let t = 0; t < 10; t++) classes.push({ id: `cla-e${e}-t${t}`, name: `Turma ${t} - Escola ${e}`, level: t % 2 ? 'Pré I' : 'Jardim' });
    for (let a = 0; a < c.alunosPorEscola; a++) {
      const need = needsBase[a % needsBase.length];
      students.push({
        id: `stu-e${e}-a${a}`, fullName: `Aluno Fictício ${e}-${a}`, shortName: `Aluno ${a}`, age: 4 + (a % 2),
        classId: `cla-e${e}-t${a % 10}`, disability: need.name, needId: needIds[a % needIds.length],
        profile: 'Perfil pedagógico fictício para teste de carga.', strengths: ['objetos reais', 'rotina visual'], cautions: [],
        birthDate: '01/01/2021', guardian: 'Responsável fictício', phone: '(00) 00000-0000', documentsNote: ''
      });
      for (let f = 0; f < c.feedbacksPorAluno; f++) {
        feedbacks.push({ id: `fb-e${e}-a${a}-${f}`, studentId: `stu-e${e}-a${a}`, assignmentId: null, teacherId: 'ana', teacherName: 'Ana Paula',
          theme: 'Tema', activityTitle: `Atividade ${f}`, result: f % 4 ? 'Funcionou bem' : 'Não funcionou', notes: '', date: '01/10/2026' });
        auditLog.push({ id: `log-e${e}-a${a}-${f}`, at: '2026-10-01T12:00:00.000Z', actorId: 'user-professora', actorName: 'Ana Paula',
          actorRole: 'teacher', action: 'criar', entity: 'feedback', entityId: `fb-e${e}-a${a}-${f}`, details: '' });
      }
    }
  }
  return { users: demo.buildUsers(senha), teachers: demo.teachers, classes, students, bnccGoals, needs: needsBase,
    needObservations: {}, studentObservations: {}, feedbacks, assignments, auditLog, aiSettings: {} };
}

module.exports = { gerarBase, CENARIOS };
