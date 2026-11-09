'use strict';
// Teste de carga simples da API do protótipo (sem dependências). Mede latência p50/p95/p99 e vazão.
// Uso: BASE=http://127.0.0.1:3000 ROTA=/api/... COOKIE="sessao=..." CONCORRENCIA=10 TOTAL=500 node bench/carga-api.js
// Dica: obtenha o COOKIE fazendo login no navegador (F12 > Application > Cookies). Use ROTA de leitura e, depois, a do Atendimento Rápido com IA desligada (motor de regras).
const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const ROTA = process.env.ROTA || '/';
const METODO = process.env.METODO || 'GET';
const CORPO = process.env.CORPO || null;
const COOKIE = process.env.COOKIE || '';
const C = Number(process.env.CONCORRENCIA || 10), N = Number(process.env.TOTAL || 500);
function pct(a, p) { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))]; }
(async () => {
  const lat = []; let erros = 0, enviados = 0;
  const t0 = performance.now();
  async function trabalhador() {
    while (enviados < N) { enviados++;
      const t = performance.now();
      try { const r = await fetch(BASE + ROTA, { method: METODO, headers: { Cookie: COOKIE, 'Content-Type': 'application/json' }, body: CORPO });
        await r.arrayBuffer(); if (!r.ok) erros++; } catch { erros++; }
      lat.push(performance.now() - t); }
  }
  await Promise.all(Array.from({ length: C }, trabalhador));
  const dur = (performance.now() - t0) / 1000;
  const r = { rota: ROTA, concorrencia: C, requisicoes: N, erros, vazao_req_s: +(N / dur).toFixed(1),
    p50_ms: +pct(lat, 50).toFixed(1), p95_ms: +pct(lat, 95).toFixed(1), p99_ms: +pct(lat, 99).toFixed(1) };
  console.table([r]);
})();
