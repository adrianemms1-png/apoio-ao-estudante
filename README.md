# Apoio ao Estudante

Plataforma local de apoio ao planejamento pedagógico inclusivo: gera atividades
adaptadas à BNCC para alunos com necessidades educacionais especiais (NEE),
com login individual, separação real de permissões entre professora e
coordenação, e cadastro completo de turmas, professoras e alunos.

Esta é a evolução do protótipo estático original para uma aplicação de
verdade, com back-end, banco de dados SQLite e controle de acesso. O projeto
é o artefato do Trabalho de Conclusão de Curso de Adriane Dias de Assunção
(Sistemas de Informação, UDESC/CESMO, 2026).

> **Versão 1.1:** a persistência passou de um arquivo `data/db.json` para
> **SQLite** (módulo nativo `node:sqlite`), as sessões passaram a sobreviver
> a reinícios e foram incluídos testes automatizados (`npm test`) e scripts
> de medição de desempenho (`bench/`). Veja [docs/](docs/) para diagramas,
> telas e resultados.

## Como instalar e rodar

O `iniciar.bat` (passo 3 abaixo) já confere sozinho, toda vez que abre, se o
Node.js e o Ollama estão instalados, e baixa o modelo de IA recomendado
automaticamente se faltar. Ele **não instala o Node.js nem o Ollama por
você** — o Windows sempre pede uma confirmação de administrador para
instalar programas, e isso não dá para pular; então, se algum dos dois
estiver faltando, o `iniciar.bat` só avisa com um link direto para baixar.
Os passos 1 e 2 abaixo continuam valendo para a primeira instalação manual.

### 1. Instalar o Node.js (só na primeira vez)

1. Acesse [nodejs.org](https://nodejs.org) e baixe o instalador **LTS para
   Windows (.msi)** — é o botão em destaque na página inicial.
2. Abra o arquivo baixado e siga o assistente clicando em **Next** em todas
   as telas, mantendo as opções padrão. Confirme a permissão de
   administrador quando o Windows pedir.
3. Para confirmar que funcionou, abra um terminal (Prompt de Comando ou
   PowerShell) e rode:

   ```bash
   node --version
   ```

   Se aparecer um número de versão **22.13 ou maior** (ex.: `v24.21.0`),
   está tudo certo. Versões mais antigas não têm o banco SQLite embutido.
   **Não é necessário rodar `npm install`** — veja "Por que sem
   dependências?" abaixo.

### 2. Instalar o Ollama (só na primeira vez, opcional — só se for usar IA)

Esse passo não é obrigatório: sem o Ollama instalado, o sistema funciona
normalmente, só que gerando as atividades pelo motor por regras em vez de
IA. Se quiser ativar a geração por IA local e gratuita:

1. Acesse [ollama.com/download](https://ollama.com/download) e baixe o
   instalador para **Windows**.
2. Abra o arquivo baixado e siga o assistente clicando em **Next/Install**
   em todas as telas, mantendo as opções padrão.
3. Para confirmar que funcionou, abra um terminal (Prompt de Comando ou
   PowerShell) e rode:

   ```bash
   ollama --version
   ```

   Se aparecer um número de versão, está tudo certo. O Ollama já fica
   aberto sozinho em segundo plano depois de instalado (ícone na bandeja do
   Windows, perto do relógio).
4. Baixe um modelo de IA (necessário — o Ollama sozinho não gera nada sem
   um modelo baixado). Isso é opcional fazer manualmente agora: se pular
   este passo, o `iniciar.bat` detecta que o modelo está faltando e baixa
   ele sozinho automaticamente na próxima vez que o sistema for aberto. Se
   preferir baixar antes, rode em um terminal:

   ```bash
   ollama pull qwen2.5:7b
   ```

   Isso baixa uns 4,7 GB na primeira vez e precisa de 8–16 GB de RAM livre
   na máquina. O Qwen2.5 7B é o modelo recomendado hoje: segue melhor o
   formato JSON pedido pelo sistema e lida bem com português. Se a máquina
   for mais fraca, dá para usar um modelo menor como `llama3.2` (uns 2 GB,
   mas erra mais o formato pedido — nesse caso o sistema já tenta gerar as
   atividades uma de cada vez antes de desistir, e nunca trava a tela).
   Outros modelos em [ollama.com/library](https://ollama.com/library)
   também funcionam — em geral, modelos maiores seguem melhor o formato
   pedido, mas usam mais memória/CPU.

Depois de instalado o Ollama e baixado o modelo, é só rodar o sistema (passo
3 abaixo) e ativar a IA pela tela **Coordenação → IA** — veja o passo a
passo completo em "Sobre a geração por IA" mais abaixo.

### 3. Rodar o projeto

**Jeito fácil:** dê dois cliques em `iniciar.bat`, na raiz desta pasta. Ele
confere se o Node.js e o Ollama estão instalados (avisando com um link se
algum estiver faltando) e baixa o modelo de IA recomendado automaticamente
se ainda não tiver sido baixado — na primeira vez que isso acontecer, essa
janela vai ficar mostrando o progresso do download por alguns minutos antes
de abrir o sistema. Depois disso abre uma janela de terminal com o servidor
rodando, e o navegador abre sozinho em `http://127.0.0.1:3000` depois de
alguns segundos. Deixe essa janela aberta enquanto estiver usando o sistema.

**Manual**, se preferir (ou se o duplo clique não funcionar):

```bash
cd apoio-estudante-app
node server/index.js
```

Na primeira execução o banco de dados local é criado automaticamente
(`data/apoio.db`, SQLite) com dados de demonstração, e o terminal mostra as contas de
acesso iniciais, com uma senha aleatória gerada nesse momento (ela também fica
guardada em `data/senha-inicial.txt`, que não vai para o Git):

- **Professora** — `professora@escola.com`
- **Coordenação** — `coordenacao@escola.com`

Para escolher a senha inicial em vez de gerá-la, defina `SENHA_INICIAL` no
arquivo `.env` antes da primeira execução.

Depois abra `http://127.0.0.1:3000` no navegador (o `iniciar.bat` já faz
isso sozinho). Troque essas senhas assim que possível pela tela de
**Coordenação → Professoras → Redefinir senha**.

Para encerrar o servidor, feche a janela do terminal ou pressione `Ctrl+C`.
Para usar de novo depois, é só repetir o passo 2 (dois cliques no
`iniciar.bat`, ou o comando manual).

Comandos úteis:

```bash
npm start        # mesma coisa que "node server/index.js"
npm run seed     # cria o banco se ele ainda não existir
npm run reset-db # apaga tudo e recria os dados de demonstração
npm test         # testes automatizados (casos de teste CT01 a CT10)
```

**Atualizando da versão 1.0?** Não precisa fazer nada: na primeira execução
da versão 1.1, se existir um `data/db.json` antigo, os dados são importados
automaticamente para `data/apoio.db` e o arquivo antigo é mantido como
`data/db.json.migrado`.

## O que mudou em relação ao protótipo original

- **Login de verdade**: senhas com hash (scrypt), sessão por cookie
  `HttpOnly`, uma conta por profissional.
- **Controle de acesso aplicado pelo servidor, não pela tela**: no protótipo
  original, os dados pessoais do aluno (nascimento, responsável, telefone,
  documentos) eram só escondidos visualmente por CSS quando a professora
  estava logada — abrir o DevTools do navegador revelava tudo. Agora esses
  campos simplesmente **nunca são enviados** para quem está logado como
  professora; só a coordenação recebe esses dados do servidor.
- **Cadastro completo (CRUD)**: a coordenação cria, edita e remove turmas,
  professoras (com login próprio) e alunos pela própria interface — nada
  mais fica preso em código-fonte.
- **Banco de dados persistente**: os dados sobrevivem a reinícios do
  servidor (ficam em `data/apoio.db`, SQLite), diferente do protótipo
  original que guardava tudo em `localStorage` do navegador.
- **Base da BNCC completa**: todos os objetivos de aprendizagem do Pré I e
  do Jardim (extraídos do PDF fornecido), não só os 6 exemplos do protótipo.
- **Visual e responsividade**: mesma identidade visual do protótipo, com
  menu lateral retrátil no celular, diálogos com rolagem em telas pequenas e
  formulários do novo cadastro adaptados para mobile.
- **Motor de atividades que aprende com o feedback**: quando uma atividade é
  marcada como "Não funcionou" para um aluno, ela deixa de ser sugerida de
  novo para esse mesmo aluno (só reaparece, com um aviso, se não houver mais
  nenhuma alternativa nova disponível).
- **Geração de atividades por IA (opcional)**: quando configurada, a IA gera
  as 3 atividades do Atendimento Rápido sob medida para o aluno; sem IA
  configurada, ou se ela falhar, o sistema usa o motor por regras
  automaticamente, sem travar a tela — ver a seção abaixo.

## Sobre a geração por IA

O sistema pode gerar as atividades do Atendimento Rápido e as sugestões da
Base de Deficiências ("Consultar IA") de duas formas:

- **Motor por regras** (padrão, sem nenhuma configuração): heurística local,
  sem custo, 100% offline.
- **IA generativa** (opcional): usa um modelo de linguagem para gerar
  atividades mais ricas e específicas para o perfil do aluno. Se a IA não
  estiver configurada, ou se uma chamada falhar (rede fora do ar, resposta
  em formato inesperado, etc.), o sistema cai automaticamente para o motor
  por regras — o Atendimento Rápido nunca fica travado por causa da IA.

**Nenhum dado pessoal do aluno** (nome completo, data de nascimento,
responsável, telefone, documentos) é enviado para a IA em nenhum dos dois
provedores — só o perfil pedagógico, pontos fortes/cuidados, tema do dia e
objetivo BNCC.

### Configurando pela interface (recomendado)

Faça login como coordenação e acesse **Coordenação → IA**. Ali dá para
escolher o provedor (Ollama ou OpenAI), preencher os campos necessários e
salvar — sem editar nenhum arquivo nem reiniciar o servidor. A própria tela
tem um "Como conectar" com o passo a passo de cada provedor, resumido
abaixo.

#### Opção 1 — Ollama (roda local, gratuito)

Se ainda não instalou o Ollama nem baixou um modelo, veja o passo 2 em "Como
instalar e rodar" no topo deste README. Depois disso:

1. Deixe o Ollama aberto em segundo plano nesta máquina (por padrão ele fica
   ouvindo em `http://127.0.0.1:11434` — ele já sobe sozinho depois de
   instalado).
2. Na tela **Coordenação → IA**, escolha "Ollama", confirme o endereço e o
   nome do modelo baixado, e clique em Salvar.

Vantagens: gratuito, os dados não saem desta máquina. Ponto de atenção: o
Ollama precisa estar aberto para a IA funcionar, e modelos pequenos rodando
localmente (como o `llama3.2` de 3B) às vezes erram o formato pedido — nesse
caso o sistema tenta gerar as atividades uma de cada vez antes de cair para
o motor por regras. O modelo recomendado é o `qwen2.5:7b`, que segue melhor
o formato JSON pedido e evita cair nesse caminho alternativo com mais
frequência.

#### Opção 2 — OpenAI (API paga, na nuvem)

1. Crie uma conta em [platform.openai.com](https://platform.openai.com)
   (é separada da conta do ChatGPT comum, e cobra por uso).
2. Vá em **API keys**, clique em "Create new secret key" e copie a chave
   gerada (começa com `sk-`).
3. Na tela **Coordenação → IA**, escolha "OpenAI", cole a chave e clique em
   Salvar. A chave fica guardada só nesta instalação (em `data/apoio.db`,
   nunca é enviada para mais nenhum lugar além de `api.openai.com`) e não é
   exibida de novo por nenhuma tela depois de salva.

Vantagens: não exige nada instalado nesta máquina. Ponto de atenção: cobrado
por uso pela própria OpenAI, fora do sistema.

### Configurando pelo arquivo `.env` (alternativa)

Se preferir configurar por arquivo em vez da tela (ex.: para já deixar
pronto antes do primeiro acesso da coordenação), copie `.env.example` para
`.env` e preencha `AI_PROVIDER` com as variáveis do provedor escolhido —
veja os comentários no próprio arquivo. **Configurações feitas pela tela
"Coordenação → IA" têm prioridade sobre o `.env`**; ele só é usado enquanto
nada tiver sido salvo ainda pela tela.

Toda a integração está isolada em `server/aiPrompt.js`. Nenhuma biblioteca
adicional é necessária: as chamadas usam o `fetch` global que já vem com o
Node.js.

## Por que sem dependências? (nota técnica)

O combinado inicial era Node.js + Express + SQLite. A primeira versão foi
construída num ambiente sem acesso ao npm — nem o driver de SQLite pôde ser
instalado —, então o back-end usa **só a biblioteca padrão do Node**:

- **Servidor HTTP**: um roteador pequeno em `server/router.js` no lugar do
  Express.
- **Senhas**: hash com `crypto.scrypt` no lugar de bcrypt.
- **Banco de dados**: na versão 1.0, um arquivo JSON (`data/db.json`)
  regravado inteiro a cada alteração. **Na versão 1.1, SQLite**, usando o
  módulo `node:sqlite` que já vem dentro do Node.js 22.13+ — ou seja, banco
  de verdade continuando sem `npm install`.

### Por que o JSON foi substituído

Os testes da pasta `bench/` mostraram dois problemas do arquivo JSON:

1. **O custo de cada gravação cresce com o tamanho da base inteira.** Com o
   volume de 20 escolas, registrar um feedback pela API chegou a p50 de
   4,4 s com 50 usuárias simultâneas (vazão de 11 req/s); com SQLite, p50 de
   8,5 ms (5.525 req/s).
2. **Escrita concorrente perde dados.** Com 4 processos gravando ao mesmo
   tempo, o JSON perdeu de 30% a 87% dos registros; o SQLite, nenhum.

Detalhes e números completos em [docs/resultados.md](docs/resultados.md).

### Como os dados ficam no SQLite

`server/store.js` mantém a mesma interface de antes
(`getAll`/`getById`/`insert`/`update`/`remove`), então nenhuma rota precisou
mudar. Cada coleção é uma tabela com chave, o registro em JSON e **colunas
geradas e indexadas** para as chaves estrangeiras mais consultadas (ex.:
`c_feedbacks.student_id`). Toda escrita é uma transação (modo WAL); as
leituras saem de um cache em memória carregado na inicialização. As sessões
de login ficam na tabela `sessions`. O esquema completo está em
[docs/schema.sql](docs/schema.sql).

## Medições e testes

```bash
npm test                                              # 10 casos de teste automatizados
node bench/persistencia-json-vs-sqlite.js             # JSON x SQLite, 3 volumes
node bench/integridade-concorrencia.js                # perda de dados sob concorrência
node bench/carga-versoes.js ../v1.0 M                 # carga na API: v1.0 x v1.1
node bench/latencia-ia.js llama3.2:1b llama3.2:3b qwen2.5:7b   # latência real da IA (Ollama aberto)
```

Para obter a pasta `../v1.0`: `git worktree add ../v1.0 v1.0`.

O `bench/latencia-ia.js` chama a mesma função que o Atendimento Rápido usa
(`generateActivitiesWithAI`) e mede, por modelo, a partida a frio, p50/p95,
tokens por segundo e a taxa de respostas válidas. **Rode nas máquinas da
escola** para escolher o perfil de implantação (abaixo).

## IA local e o hardware das escolas

Modelos de 7B (como `qwen2.5:7b`, 4,7 GB) pedem de 8 a 16 GB de RAM livres e
ficam lentos sem placa de vídeo — e muitos computadores de escola têm 4 GB.
Por isso a IA é **opcional** e o `iniciar.bat` verifica a memória da máquina:
abaixo de 12 GB ele não baixa o modelo grande e explica as alternativas.

| Perfil | O que roda onde | Para quem |
|---|---|---|
| A – Só regras | Node.js + SQLite na estação, IA desligada | Qualquer computador |
| B – IA local leve | + Ollama com modelo de 1B a 3B (`llama3.2:3b`) | Máquinas com 8 GB |
| C – Servidor compartilhado | Um servidor da secretaria roda Node.js + Ollama 7B; as escolas só usam o navegador | Redes municipais |
| D – Nuvem paga | Geração pela API da OpenAI (sem dados pessoais) | Quem aceita custo por uso |

No perfil C, basta apontar **Coordenação → IA → URL do Ollama** para o
servidor da rede (ou rodar o sistema inteiro nele, com `HOST=0.0.0.0`).

## Caminho para publicar na web

A aplicação já está desenhada para isso:

1. O front-end (`public/`) é servido pelo próprio Node — não depende de
   nenhum serviço externo.
2. ✅ Banco real: SQLite desde a versão 1.1 (para muitas escolas gravando
   ao mesmo tempo, avaliar PostgreSQL mantendo a interface de `store.js`).
3. ✅ Sessões persistentes: tabela `sessions` desde a versão 1.1.
4. Defina `SESSION_SECRET` fixo (em vez do gerado automaticamente) e sirva a
   aplicação atrás de HTTPS.
5. Publique num serviço de hospedagem Node (Render, Railway, Fly.io, uma VPS
   comum etc.) — como não há dependências de sistema operacional específicas,
   o deploy é direto.

## Estrutura de pastas

```
apoio-estudante-app/
  server/
    index.js          servidor HTTP e ponto de entrada
    router.js          roteador HTTP minimalista (sem Express)
    store.js            repositório de dados (SQLite via node:sqlite)
    session.js          sessões de login (persistidas no SQLite)
    config.js            variáveis de ambiente
    aiPrompt.js           integração com IA (Ollama/OpenAI) - ver "Sobre a geração por IA"
    engine/
      activityEngine.js    motor de recomendação de atividades (regras, usado como reserva da IA)
    middleware/
      auth.js               exige login / exige papel (admin ou professora)
    routes/                 endpoints da API (/api/...)
    seedData/               dados iniciais (BNCC, necessidades, demo)
  public/
    index.html, styles.css, app.js    front-end (fala com a API via fetch)
  data/
    apoio.db               banco SQLite, criado na primeira execução (fora do Git)
  test/                    testes automatizados (node --test)
  bench/                   scripts de medição de desempenho e integridade
  docs/                    diagramas UML, telas, esquema SQL e resultados
  .env.example
  package.json
  iniciar.bat              atalho: dois cliques para rodar o servidor
```

## Contas e permissões

| Papel        | Vê dados pedagógicos | Vê dados pessoais/administrativos | Cadastra turmas/professoras/alunos |
|--------------|:---------------------:|:----------------------------------:|:------------------------------------:|
| Professora   | ✅                     | ❌                                   | ❌                                     |
| Coordenação  | ✅                     | ✅                                   | ✅                                     |

A separação acima é garantida pelo servidor (`server/routes/students.js`),
não apenas pela interface.
