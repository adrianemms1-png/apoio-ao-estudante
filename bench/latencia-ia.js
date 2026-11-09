'use strict';
// Mede a latencia REAL da geracao de atividades por IA no Apoio ao Estudante,
// chamando a mesma funcao usada pelo Atendimento Rapido (server/aiPrompt.js:
// generateActivitiesWithAI), com o mesmo prompt, tentativas e validacoes.
//
// Uso (com o Ollama aberto nesta maquina):
//   node bench/latencia-ia.js llama3.2:1b llama3.2:3b qwen2.5:7b
//   REPETICOES=5 node bench/latencia-ia.js qwen2.5:3b
// Baixe antes cada modelo:  ollama pull <modelo>
//
// Para cada modelo: 1 chamada "a frio" (inclui carregar o modelo na memoria)
// + N chamadas "a quente". Registra tempo total (p50/p95), taxa de sucesso
// (resposta valida da IA; falhas cairiam no motor de regras), e tokens/s
// lidos das metricas que o proprio Ollama devolve (eval_count/eval_duration).
// Resultado salvo em bench/resultados/ia-<maquina>.local.json
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const MODELOS = process.argv.slice(2);
if (!MODELOS.length) { console.error('Informe ao menos um modelo. Ex.: node bench/latencia-ia.js llama3.2:3b'); process.exit(1); }
const REPETICOES = Number(process.env.REPETICOES || 5);

// pasta de dados temporaria, para nao tocar no banco real
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'apoio-ia-'));
process.env.AI_PROVIDER = 'ollama';

// captura as metricas devolvidas pelo Ollama em cada chamada
const metricas = [];
const fetchOriginal = global.fetch;
global.fetch = async (...args) => {
  const res = await fetchOriginal(...args);
  if (String(args[0]).includes('/api/chat')) {
    res.clone().json().then(j => metricas.push({ tokens: j.eval_count || 0, ns: j.eval_duration || 0, carga: j.load_duration || 0 })).catch(() => {});
  }
  return res;
};

const needsBase = require('../server/seedData/needsBase');
const ENTRADA = {
  needName: needsBase[0].name, barriers: needsBase[0].barriers, strategies: needsBase[0].strategies, resources: needsBase[0].resources,
  strengths: ['desenho guiado', 'pareamento de imagens', 'rotina visual'], cautions: ['evitar sons altos'],
  theme: 'Animais da fazenda', bnccCode: 'EI03EF01', goalText: 'Expressar ideias, desejos e sentimentos sobre suas vivências.',
  classLevel: 'Jardim', failedTitles: [], studentObservation: '', needObservation: ''
};
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))]; };

(async () => {
  const maquina = `${os.cpus()[0].model.trim()} | ${os.cpus().length} threads | ${(os.totalmem() / 2 ** 30).toFixed(1)} GB RAM | ${os.platform()}`;
  console.log('Máquina:', maquina);
  const saida = { maquina, data: new Date().toISOString(), resultados: [] };
  for (const modelo of MODELOS) {
    process.env.OLLAMA_MODEL = modelo;
    for (const k of Object.keys(require.cache)) if (k.includes(`${path.sep}server${path.sep}`)) delete require.cache[k];
    const { generateActivitiesWithAI } = require('../server/aiPrompt');
    const tempos = []; let sucesso = 0, frio = null; metricas.length = 0;
    for (let i = 0; i <= REPETICOES; i++) {
      const t0 = performance.now(); let ok = false;
      try { const r = await generateActivitiesWithAI(ENTRADA); ok = Array.isArray(r) && r.length === 3; } catch (e) { if (i === 0) console.log('  falha:', e.message.slice(0, 160)); }
      const s = (performance.now() - t0) / 1000;
      if (i === 0) frio = s; else { tempos.push(s); if (ok) sucesso++; }
      process.stdout.write(`  ${modelo} ${i === 0 ? 'frio' : '#' + i}: ${s.toFixed(1)} s ${ok ? 'ok' : 'falhou'}\n`);
    }
    const quentes = metricas.slice(1).filter(m => m.ns > 0);
    const linha = { modelo, partidaFria_s: +frio.toFixed(1), p50_s: +pct(tempos, 50).toFixed(1), p95_s: +pct(tempos, 95).toFixed(1),
      tokens_por_s: quentes.length ? +(quentes.reduce((a, m) => a + m.tokens / (m.ns / 1e9), 0) / quentes.length).toFixed(1) : null,
      sucesso_pct: Math.round(100 * sucesso / REPETICOES) };
    saida.resultados.push(linha); console.table([linha]);
  }
  fs.mkdirSync(path.join(__dirname, 'resultados'), { recursive: true });
  const arq = path.join(__dirname, 'resultados', `ia-${os.hostname()}.local.json`);
  fs.writeFileSync(arq, JSON.stringify(saida, null, 2));
  console.log('Resultados salvos em', arq);
  process.exit(0);
})();
