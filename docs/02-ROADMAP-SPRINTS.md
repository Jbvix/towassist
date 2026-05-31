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

## Sprint 2 — Esqueleto do projeto + telas alternáveis  ⏳

**Objetivo:** ter a aplicação rodando, com as duas telas vazias e navegação.

**Entregáveis:**
- Projeto `frontend/` (Vite + TypeScript + PixiJS) inicializado.
- `ScreenManager` + `ScreenSwitcher`: alternar **KRAAIJVELD** ↔ **IBERCISA**.
- Layout-base: área de simulação + área de chat (sem lógica ainda).
- `shared/types` com contratos iniciais.
- Decisões fechadas: framework de UI, monorepo/workspaces.

**Demo:** abrir a página e alternar entre as duas telas (placeholders).

---

## Sprint 3 — Integração xAI Grok (chat texto + voz)  ⏳

**Objetivo:** assistente conversacional funcional.

**Entregáveis:**
- `backend/` (BFF Node.js) com `POST /api/chat` fazendo proxy ao xAI Grok.
- `XAI_API_KEY` protegida no servidor (nunca no navegador).
- `ChatBox` (texto) + `VoiceControls` (STT/TTS via Web Speech API).
- Contexto da tela ativa enviado ao assistente.

**Demo:** perguntar por texto e por voz e receber respostas do Grok.

---

## Sprint 4 — Simulação 2D (PixiJS): painel de comando  ⏳

**Objetivo:** renderizar e operar o painel de cada guincho.

**Entregáveis:**
- `sim/` engine PixiJS (loop, cena, componentes: alavanca, botão, mostrador).
- `KraaijveldPanel` e `IbercisaPanel` montados a partir de `data/*/panel.json`.
- Interatividade: acionar comandos e ver realimentação visual.

**Demo:** operar os controles do painel de ambos os guinchos.

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
