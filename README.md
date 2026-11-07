# Apoio ao Estudante

Plataforma local de apoio ao planejamento pedagógico inclusivo: gera atividades
adaptadas à BNCC para alunos com necessidades educacionais especiais (NEE),
com login individual, separação real de permissões entre professora e
coordenação, e cadastro completo de turmas, professoras e alunos.

Esta é a evolução do protótipo estático original (`apoio-estudante-web/`,
mantido ao lado desta pasta como referência) para uma aplicação de verdade,
com back-end, banco de dados e controle de acesso.

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

   Se aparecer um número de versão (ex.: `v24.21.0`), está tudo certo.
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
(`data/db.json`) com dados de demonstração, e o terminal mostra as contas de
acesso iniciais:

- **Professora** — `professora@escola.com` / `123456`
- **Coordenação** — `coordenacao@escola.com` / `123456`

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
```

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
  servidor (ficam em `data/db.json`), diferente do protótipo original que
  guardava tudo em `localStorage` do navegador.
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
   Salvar. A chave fica guardada só nesta instalação (em `data/db.json`,
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
Node 18+.

## Por que sem dependências? (nota técnica)

O combinado inicial era Node.js + Express + SQLite. Esta aplicação foi
construída num ambiente de desenvolvimento sem acesso à internet para baixar
pacotes do npm — nem mesmo o driver de SQLite pôde ser instalado ali. Para
não deixar o produto refém de uma etapa de `npm install` (e de problemas de
rede, versão ou compilação nativa que ela poderia trazer para o seu
computador), o back-end foi reescrito usando **só a biblioteca padrão do
Node** (`http`, `fs`, `crypto`) — sem Express, sem driver de banco.

Na prática, isso significa:

- **Servidor HTTP**: um roteador bem pequeno em `server/router.js` no lugar
  do Express.
- **Banco de dados**: um "repositório" simples sobre um arquivo JSON
  (`server/store.js` + `data/db.json`) no lugar de SQLite. Todas as escritas
  são síncronas, o que evita condições de corrida (o Node é de thread única).
- **Senhas**: hash com `crypto.scrypt` no lugar de bcrypt.

Isso é perfeitamente adequado para uma escola usando o sistema localmente.
Se um dia isso crescer (várias escolas, muitos acessos simultâneos, um
servidor compartilhado), o caminho natural é trocar `server/store.js` por um
driver de banco de verdade (`better-sqlite3` ou Postgres via `pg`) mantendo a
mesma interface (`getAll`/`getById`/`insert`/`update`/`remove`) — o resto do
código não precisa mudar. No seu computador, com internet normal, isso é só
rodar `npm install better-sqlite3` e ajustar `server/store.js`.

## Caminho para publicar na web

A aplicação já está desenhada para isso:

1. O front-end (`public/`) é servido pelo próprio Node — não depende de
   nenhum serviço externo.
2. Troque `server/store.js` por um banco real (SQLite com `better-sqlite3`
   para começar, ou Postgres para múltiplas escolas ao mesmo tempo).
3. Troque as sessões em memória (`server/session.js`) por um armazenamento
   persistente (arquivo, Redis, ou tabela no banco) para sessões
   sobreviverem a reinícios do servidor.
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
    store.js            "banco de dados" em JSON
    session.js          sessões de login
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
    db.json                criado automaticamente na primeira execução
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
