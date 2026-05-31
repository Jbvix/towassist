# TowAssist — Roadmap de Sprints

> **Documento do Sprint 1.** O projeto é construído de forma incremental. Cada
> sprint entrega algo demonstrável e fecha decisões para o seguinte.

---

## Sprint 1 — Documentação de proposta + árvore de diretórios  🚧 (atual)

**Objetivo:** acordar visão, escopo e estrutura antes de codar.

**Entregáveis:**
- [x] `docs/00-PROPOSTA.md` — proposta técnica.
- [x] `docs/01-ARQUITETURA.md` — arquitetura + árvore de diretórios.
- [x] `docs/02-ROADMAP-SPRINTS.md` — este roadmap.
- [x] `docs/manuais/README.md` — organização dos manuais.
- [x] `README.md`, `.gitignore`, `.env.example`.
- [ ] Manuais dos equipamentos disponibilizados (pendência do cliente).

**Critério de pronto:** documentação revisada e aprovada pelo cliente.

---

## Sprint 2 — Esqueleto do projeto + telas alternáveis  ✅

**Objetivo:** ter a aplicação rodando, com as duas telas e navegação.

**Entregáveis (concluídos):**
- [x] Projeto Vite + TypeScript + PixiJS inicializado (`npm run dev`/`build`).
- [x] `ScreenManager` + `ScreenSwitcher`: alternar **KRAAIJVELD** ↔ **IBERCISA**.
- [x] Layout-base: área de simulação (canvas PixiJS) + caixa de chat do KRATOS.
- [x] Painel de comando desenhado a partir de `src/data/<eq>/panel.json`.
- [x] `shared/types` (equipment, api) + persona `shared/prompts/kratos.pt.ts`.
- [x] `netlify.toml` (build, redirects `/api/*` e SPA).
- [x] Decisões fechadas: **TS puro** (sem React) + **monorepo único**.

**Demo:** abrir a página, alternar entre as duas telas e ver o painel/tema
trocar; digitar no chat (resposta simulada até o Sprint 3).

**Notas de implementação:**
- Estrutura adotada na raiz do repo (não em `frontend/`): `src/`, `shared/`,
  `netlify/` — simplifica o build do Netlify. A árvore em `01-ARQUITETURA.md`
  permanece a referência conceitual.
- O chat e o microfone são **placeholders** nesta etapa; a integração real
  (xAI Grok + Realtime Voice) é o Sprint 3.

---

## Sprint 3 — Assistente KRATOS: xAI Grok (texto) + Realtime Voice  ✅

**Objetivo:** assistente conversacional **KRATOS** funcional, por texto e voz.

**Entregáveis (concluídos):**
- [x] Netlify Functions: `chat.ts` (proxy do Grok, texto), `realtime.ts`
  (cunha token efêmero de voz) e `health.ts`. `XAI_API_KEY` só no servidor.
- [x] `lib/grok.ts` — integração com `chat/completions` e `realtime/client_secrets`.
- [x] `VoiceAgent` (`useVoiceAgent.ts`): WebSocket `grok-voice-latest`, AudioWorklet
  (mic PCM 24 kHz), playback gapless, VAD/interrupção (barge-in), transcrição,
  buffer até `session.updated`, renovação de token.
- [x] `public/pcm-processor-worklet.js` + `src/ai/pcm.ts` (base64 em blocos).
- [x] `ChatBox` ligada de verdade: texto via `/api/chat`, voz via `VoiceAgent`;
  transcrição em streaming e mensagem interrompida esmaecida.
- [x] Persona **KRATOS** (`shared/prompts/kratos.pt.ts`) ciente da tela ativa.

**Verificação:** `npm run build` (frontend) e `tsc` das Functions passam;
`netlify functions:serve` testado — `/api/health` OK, validação 400/405 OK, e a
chamada chega à API real do xAI (formato e auth corretos).

**Demo:** conversar por voz com KRATOS (com interrupção) e por texto; trocar de
tela e ver o assistente ciente do equipamento ativo.

> Requer `XAI_API_KEY` (e opcional `XAI_MODEL`) nas variáveis de ambiente do
> Netlify. Local: `npx netlify dev`. Especificação:
> [`03-AGENTE-VOZ-KRATOS.md`](03-AGENTE-VOZ-KRATOS.md).

---

## Sprint 4 — Simulação 2D (PixiJS): painel de comando  ✅

**Objetivo:** renderizar e operar o painel de cada guincho.

**Entregáveis (concluídos):**
- [x] `sim/state.ts` — `PanelState`: valores dos controles, derivação de
  mostradores/indicadores e animação suave via ticker.
- [x] `sim/components/ControlNode.ts` — controle interativo (botão, seletor,
  alavanca de 3 posições, gauge com arco, indicador), com realimentação visual.
- [x] `Simulator` reescrito: ticker, interação por clique, layout responsivo.
- [x] Painéis montados a partir de `src/data/<eq>/panel.json` (ambos os guinchos).
- [x] `PanelStore` liga o estado do painel ao **contexto do KRATOS** (o chat
  envia o estado atual junto da pergunta).

**Comportamento simulado:** energia + bomba/HPU (e sem parada de emergência)
deixam o painel "Pronto p/ Operar"; a alavanca/joystick gera tensão/carga na
linha; a pressão hidráulica pressuriza. Mostradores animam suavemente.

**Verificação:** `npm run build` OK; lógica de derivação coberta por smoke-test;
dev server serve app e worklet (HTTP 200).

**Demo:** acionar os controles e ver gauges/indicadores reagirem; perguntar ao
KRATOS sobre o estado atual do painel.

---

## Sprint 5 — Sistema de intertravamento (interlock)  ✅

**Objetivo:** demonstrar a lógica de segurança/intertravamento.

**Entregáveis (concluídos):**
- [x] `interlock/InterlockEngine` — avaliação **pura** (sem PixiJS/IA) do estado
  do painel contra regras; helpers `on`/`off`/`atLeast`.
- [x] `interlock/types.ts` — condições, regras, avaliação e alertas globais.
- [x] Regras por guincho: `rules/kraaijveld.rules.ts` e `rules/ibercisa.rules.ts`.
- [x] `InterlockPanel` (overlay): por controle, LIBERADO/BLOQUEADO + condições
  pendentes; alertas globais (parada de emergência).
- [x] Acoplamento ao painel: ao tentar **acionar** um comando bloqueado, ele
  pisca em vermelho e um *toast* explica o motivo; desligar é sempre permitido.
- [x] `tests/interlock/` (Vitest) — **9 testes**, cobrindo ambos os equipamentos.

**Regras (didáticas, a validar no Sprint 6 contra os manuais):**
- KRAAIJVELD: bomba exige energia+e-stop liberado; embreagem exige bomba+pressão
  +freio aplicado; alavanca do tambor exige embreagem+pressão.
- IBERCISA: HPU exige energia; freio de cinta exige HPU+pressão; joystick exige
  HPU+pressão+freio liberado+e-stop ok.

**Verificação:** `npm test` (9/9) e `npm run build` passam.

**Demo:** tentar um comando sem condição e ver o bloqueio explicado no painel de
intertravamento e no *toast*; perguntar ao KRATOS por quê (ele recebe o estado).

---

## Sprint 6 — RAG sobre os manuais (xAI Collections)  ✅

**Objetivo:** respostas ancoradas na documentação oficial.

**Decisão técnica:** usar **xAI Collections** (parse/OCR/embeddings no servidor),
não um índice local. Motivo descoberto ao sondar os PDFs: o manual do
**KRAAIJVELD (2500P) é escaneado (sem camada de texto)** — um extrator local não
leria nada sem OCR. O IBERCISA tem texto, mas usar Collections unifica os dois.

**Entregáveis (concluídos):**
- [x] `scripts/build-collections.ts` — ingestão (executar 1x com a Management
  API key): cria uma collection por equipamento e faz upload do PDF.
- [x] `netlify/functions/lib/rag.ts` — `retrieveManualContext()` via
  `POST /v1/documents/search`; **degrada com elegância** se a collection não
  estiver configurada.
- [x] `chat.ts` injeta os trechos do manual no prompt do KRATOS (texto).
- [x] Voz: `realtime.ts` devolve os IDs das collections e o `VoiceAgent`
  adiciona o tool `file_search` à sessão (citações por voz).
- [x] Variáveis: `XAI_COLLECTION_KRAAIJVELD` / `XAI_COLLECTION_IBERCISA`.

**Como ativar:**
1. `export XAI_MANAGEMENT_API_KEY=...`
2. `node --experimental-strip-types scripts/build-collections.ts`
3. Copie os IDs impressos para as variáveis de ambiente do Netlify.

**Verificação:** build, typecheck das Functions e testes passam; chat testado
localmente — o caminho RAG é não-bloqueante (sem collection ⇒ responde sem
citação).

**Demo:** perguntar sobre um procedimento e receber resposta citando o manual.

> Permite **validar/refinar as regras de intertravamento** (Sprint 5), hoje
> didáticas, contra o conteúdo real dos manuais.

---

## Sprint 7 — Refinamento, testes e empacotamento  ✅

**Objetivo:** qualidade e entrega.

**Entregáveis (concluídos):**
- [x] **Acessibilidade**: landmarks (`<main>`, `<h1>`), chat como `role="log"`
  `aria-live="polite"`, alertas de intertravamento `role="alert"`
  `aria-live="assertive"`, rótulos ARIA nos controles.
- [x] **UX**: Esc encerra a voz; limpeza de microfone/WebSocket no `beforeunload`.
- [x] **Testes**: 18 no total (intertravamento + estado do painel) via Vitest.
- [x] **Empacotamento**: `docs/04-DEPLOY.md` — guia de implantação no Netlify,
  variáveis de ambiente, ativação do RAG e checklist de go-live.

**Verificação:** `npm test` (18/18) e `npm run build` passam.

**Demo:** versão candidata a release — publicável no Netlify seguindo o guia.

---

## Convenções de trabalho

- Branch de desenvolvimento: `claude/relaxed-cori-XUncn`.
- Commits descritivos por entregável.
- Cada sprint só inicia após o anterior ser aceito.
- Rastreabilidade: regras de intertravamento e parâmetros sempre referenciam a
  seção correspondente do manual.
