# TowAssist — Arquitetura e Árvore de Diretórios

> **Documento do Sprint 1.** Define a organização do código e a estrutura de
> pastas que será criada a partir do Sprint 2. Nenhum código de aplicação é
> escrito ainda; aqui registramos *como* o projeto será estruturado.

---

## 1. Princípios de arquitetura

1. **Separação de responsabilidades** em três núcleos independentes:
   - `sim/` — *engine* de simulação 2D (PixiJS), agnóstica ao equipamento.
   - `interlock/` — modelo de **intertravamento** como máquina de estados pura
     (testável sem renderização).
   - `ai/` — camada de conversação (cliente do BFF; texto e voz).
2. **Dados separados do código**: cada guincho é descrito por arquivos de
   configuração em `data/` (layout do painel, comandos, regras de interlock).
   Trocar de equipamento = trocar de configuração.
3. **Segurança por design**: a chave do xAI Grok vive **somente** no servidor —
   nas **variáveis de ambiente do Netlify**, lidas pelas Netlify Functions. O
   navegador nunca a vê (não entra no bundle do Vite).
4. **Testabilidade**: o modelo de intertravamento é lógica pura, coberta por
   testes, independente do PixiJS e da IA.

---

## 2. Visão de componentes

```
            ┌──────────────── NETLIFY ────────────────┐
frontend/ (estático, CDN)        Netlify Functions (BFF)        xAI
┌───────────────────────┐      ┌────────────────────────┐    ┌──────────┐
│ app  (bootstrap/telas)│      │ fn chat   (/api/chat)  │    │  Grok    │
│ ui   (chat, voz, HUD) │─────▶│ fn health              │───▶│   API    │
│ sim  (PixiJS engine)  │      │ rag  (índice empacotado)│    └──────────┘
│ interlock (FSM)       │      │ XAI_API_KEY (env Netlify)│
│ ai  (cliente do BFF)  │      └────────────────────────┘
│ data (KRAAIJVELD/...) │            ▲ serverless, sob demanda
└───────────────────────┘
            └─────────────────────────────────────────┘
  Build (Vite) → publica frontend/dist + empacota functions
  Redirect: /api/*  →  /.netlify/functions/:splat
```

---

## 3. Árvore de diretórios (alvo)

> Estrutura-alvo do projeto completo. No Sprint 1 existe apenas `docs/` e os
> arquivos de raiz; as demais pastas serão criadas nos sprints indicados em
> `[Sprint N]`.

```
towassist/
├── README.md                       # Visão geral e status
├── LICENSE
├── .gitignore
├── .env.example                    # Modelo de variáveis (sem segredos)
│
├── docs/                           # 📄 Documentação  [Sprint 1]
│   ├── 00-PROPOSTA.md              #   Proposta técnica
│   ├── 01-ARQUITETURA.md           #   Este documento
│   ├── 02-ROADMAP-SPRINTS.md       #   Planejamento por sprints
│   ├── manuais/                    #   Manuais dos equipamentos (fonte de verdade)
│   │   ├── README.md               #     Como obter/organizar os manuais
│   │   ├── kraaijveld/             #     Manuais do KRAAIJVELD
│   │   └── ibercisa/               #     Manuais do IBERCISA
│   └── diagramas/                  #   Diagramas (painel, interlock, fluxos)
│
├── frontend/                       # 🖥️ Aplicação web  [Sprint 2+]
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── public/                     #   Assets estáticos
│   │   ├── pcm-processor-worklet.js #    AudioWorklet PCM 24 kHz (voz)  [Sprint 3]
│   │   └── assets/
│   │       ├── kraaijveld/         #     Sprites/imagens do painel KRAAIJVELD
│   │       └── ibercisa/           #     Sprites/imagens do painel IBERCISA
│   └── src/
│       ├── main.ts                 #   Bootstrap da aplicação
│       │
│       ├── app/                    #   Orquestração e troca de telas  [Sprint 2]
│       │   ├── App.ts
│       │   ├── ScreenManager.ts    #     Alterna KRAAIJVELD <-> IBERCISA
│       │   └── routes.ts
│       │
│       ├── ui/                     #   Componentes de interface
│       │   ├── ChatBox.ts          #     Caixa de texto + transcript     [Sprint 3]
│       │   ├── VoiceControls.ts    #     Botão de microfone / visualizador [Sprint 3]
│       │   ├── ScreenSwitcher.ts   #     Botões de alternância de tela   [Sprint 2]
│       │   └── InterlockPanel.ts   #     Painel visual do interlock      [Sprint 5]
│       │
│       ├── sim/                    #   Engine de simulação 2D (PixiJS)  [Sprint 4]
│       │   ├── Simulator.ts        #     Loop de render e estado
│       │   ├── Stage.ts            #     Cena PixiJS
│       │   ├── components/         #     Botões, alavancas, mostradores
│       │   │   ├── Lever.ts
│       │   │   ├── Button.ts
│       │   │   ├── Gauge.ts
│       │   │   └── Indicator.ts
│       │   └── panels/             #     Montagem do painel por guincho
│       │       ├── KraaijveldPanel.ts
│       │       └── IbercisaPanel.ts
│       │
│       ├── interlock/              #   Intertravamento (máquina de estados) [Sprint 5]
│       │   ├── InterlockEngine.ts  #     Avalia condições e bloqueios (puro)
│       │   ├── types.ts            #     Tipos de estado, condição, regra
│       │   └── rules/              #     Regras carregadas dos dados
│       │       ├── kraaijveld.rules.ts
│       │       └── ibercisa.rules.ts
│       │
│       ├── ai/                     #   Cliente da IA (fala com o BFF)   [Sprint 3]
│       │   ├── useVoiceAgent.ts    #     xAI Realtime: WS, mic, playback, VAD
│       │   ├── pcm.ts              #     Base64/PCM helpers (24 kHz)
│       │   ├── GrokClient.ts       #     Chat por texto via /api/chat
│       │   ├── speechFallback.ts   #     Fallback Web Speech API (opcional)
│       │   └── context.ts          #     Monta contexto da tela ativa
│       │
│       └── data/                   #   Configuração de cada equipamento [Sprint 2+]
│           ├── kraaijveld/
│           │   ├── panel.json      #     Layout do painel
│           │   ├── interlock.json  #     Regras de intertravamento
│           │   └── meta.json       #     Metadados/parâmetros do guincho
│           └── ibercisa/
│               ├── panel.json
│               ├── interlock.json
│               └── meta.json
│
├── netlify.toml                    # ⚙️ Config de build/deploy + redirects  [Sprint 2]
│
├── netlify/                        # 🔒 BFF serverless (Netlify Functions) [Sprint 3]
│   └── functions/
│       ├── chat.ts                 #   /api/chat -> xAI Grok (texto)
│       ├── realtime.ts       #   /api/realtime -> cunha token efêmero de voz
│       ├── health.ts               #   Healthcheck
│       └── lib/                    #   Código compartilhado entre functions
│           ├── grok.ts             #     Integração com a API do xAI Grok
│           └── rag/                #     Recuperação sobre os manuais   [Sprint 6]
│               ├── retriever.ts    #       Busca trechos relevantes (runtime)
│               └── index/          #       Índice empacotado com a function
│
├── scripts/                        # 🛠️ Scripts de build/dados            [Sprint 6]
│   └── build-rag-index.ts          #   Gera o índice RAG dos manuais (build-time)
│
├── shared/                         # 🔁 Tipos/contratos compartilhados [Sprint 2]
│   ├── prompts/
│   │   └── kratos.pt.ts            #   Instruções da persona KRATOS (voz + texto)
│   └── types/
│       ├── api.ts                  #   Contrato das rotas do BFF
│       ├── equipment.ts            #   Modelo de equipamento
│       ├── realtime.ts             #   Tipos dos eventos da xAI Realtime Voice
│       └── interlock.ts            #   Tipos do intertravamento
│
└── tests/                          # ✅ Testes  [Sprint 5+]
    ├── interlock/                  #   Testes da máquina de intertravamento
    └── sim/                        #   Testes da engine de simulação
```

---

## 4. Decisões em aberto (a fechar no Sprint 2)

- **Framework de UI**: TS puro + DOM mínimo *vs.* React. Recomendação inicial:
  manter leve (TS puro) para não competir com o canvas PixiJS, salvo necessidade.
- **Monorepo**: usar workspaces (`frontend` + `netlify/functions` + `shared`) ou
  repos separados. Recomendação: workspaces no mesmo repositório.
- **Armazenamento do índice RAG**: arquivo local *vs.* banco vetorial.
- **TTS/STT**: Web Speech API (nativo) *vs.* serviço externo, caso a qualidade
  exija.

---

## 5. Fluxo de uma pergunta (texto ou voz)

```
1. Usuário digita ou fala uma pergunta na ChatBox.
2. (voz) speech.ts converte fala -> texto (STT).
3. ai/context.ts anexa o contexto: tela ativa (KRAAIJVELD/IBERCISA) e
   estado atual do painel/interlock.
4. GrokClient envia { pergunta, contexto } para /api/chat
   (redirecionado pelo Netlify para /.netlify/functions/chat).
5. A Netlify Function executa RAG nos manuais, monta o prompt, lê a
   XAI_API_KEY do ambiente e chama o xAI Grok.
6. Resposta volta ao frontend e é exibida na ChatBox.
7. (voz) speech.ts converte texto -> fala (TTS).
```

---

## 6. Hospedagem no Netlify

A aplicação inteira é publicada em um **único site Netlify**:

- **Frontend** = site estático. O Vite gera `frontend/dist/`, que o Netlify serve
  pela CDN. (`publish = "frontend/dist"`.)
- **BFF** = **Netlify Functions** (serverless), em `netlify/functions/`. Não há
  servidor Node.js sempre ligado; cada chamada a `/api/*` aciona uma function sob
  demanda.
- **Proxy do xAI Grok**: a function `chat` chama a API do Grok. A
  **`XAI_API_KEY`** é configurada em *Site settings → Environment variables* no
  painel do Netlify — **nunca** vai para o repositório nem para o bundle do
  navegador.
- **Roteamento**: `netlify.toml` redireciona `/api/*` →
  `/.netlify/functions/:splat`, mantendo as URLs limpas para o frontend.
- **RAG**: o índice dos manuais é gerado em *build-time* (`scripts/build-rag-index.ts`)
  e **empacotado junto da function**, pois o filesystem em runtime é efêmero e
  somente-leitura. Os PDFs grandes ficam no repositório (`docs/manuais/`) mas
  **não** são publicados como assets do site.

### `netlify.toml` (esboço — será criado no Sprint 2)

```toml
[build]
  command = "npm run build"      # build do Vite + bundling das functions
  publish = "frontend/dist"
  functions = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

# XAI_API_KEY é definida no painel do Netlify (Environment variables),
# nunca neste arquivo.
```
