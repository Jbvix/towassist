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
- [x] Netlify Functions: `chat.ts` (proxy do Grok, texto), `realtime-token.ts`
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

## Sprint 5 — Sistema de intertravamento (interlock)  ⏳

**Objetivo:** demonstrar a lógica de segurança/intertravamento.

**Entregáveis:**
- `interlock/InterlockEngine` (máquina de estados pura) + regras por guincho.
- `InterlockPanel`: exibe condições atendidas/pendentes e bloqueios ativos.
- Acoplamento ao painel: comandos bloqueados/liberados conforme as regras.
- `tests/interlock/` cobrindo as regras de cada equipamento.

**Demo:** tentar um comando sem condição e ver o bloqueio explicado.

---

## Sprint 6 — RAG sobre os manuais  ⏳

**Objetivo:** respostas ancoradas na documentação oficial.

**Entregáveis:**
- `backend/src/rag/` indexador + recuperador sobre os manuais.
- Respostas do assistente citando trechos/seções dos manuais.
- Conteúdo de apoio a treinamento e manutenção a partir dos manuais.

**Demo:** perguntar sobre um procedimento e receber resposta com fonte.

---

## Sprint 7 — Refinamento, testes e empacotamento  ⏳

**Objetivo:** qualidade e entrega.

**Entregáveis:**
- Ajustes de UX, acessibilidade e desempenho (alvo 60 fps).
- Testes adicionais e revisão técnica de fidelidade aos manuais.
- Build de produção e instruções de implantação.

**Demo:** versão candidata a release.

---

## Convenções de trabalho

- Branch de desenvolvimento: `claude/relaxed-cori-XUncn`.
- Commits descritivos por entregável.
- Cada sprint só inicia após o anterior ser aceito.
- Rastreabilidade: regras de intertravamento e parâmetros sempre referenciam a
  seção correspondente do manual.
