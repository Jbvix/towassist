# TowAssist

**Agente de inteligência de apoio a treinamento, operação e manutenção dos
Guinchos de Manobra de Rebocadores Portuários KRAAIJVELD e IBERCISA.**

O TowAssist combina um assistente conversacional (texto e voz, baseado em
**xAI Grok**) com um **simulador 2D interativo (PixiJS)** que reproduz o painel
de comando e o sistema de intertravamento (interlock) dos guinchos, permitindo
que operadores e equipes de manutenção compreendam o funcionamento dos
equipamentos de forma segura e didática.

A aplicação oferece **duas telas alternáveis** — **KRAAIJVELD** e **IBERCISA** —
cada uma com seu painel e lógica de intertravamento específicos, conforme os
manuais dos fabricantes.

---

## Status do projeto

> 🚧 **Sprint 1 — Documentação de Proposta.** Em andamento.

Este repositório está sendo construído de forma **incremental, por sprints**. O
Sprint 1 entrega apenas a **documentação de proposta e a árvore de diretórios**;
nenhum código de aplicação foi escrito ainda.

| Sprint | Entregável | Status |
|--------|------------|--------|
| 1 | Documentação de proposta + árvore de diretórios | 🚧 Em andamento |
| 2 | Esqueleto do projeto (frontend + BFF) e telas alternáveis | ⏳ Planejado |
| 3 | Assistente KRATOS — xAI Grok (texto) + Realtime Voice | ⏳ Planejado |
| 4 | Simulação 2D PixiJS — painel de comando | ⏳ Planejado |
| 5 | Sistema de intertravamento (interlock) | ⏳ Planejado |
| 6 | RAG sobre os manuais + base de conhecimento | ⏳ Planejado |
| 7 | Refinamento, testes e empacotamento | ⏳ Planejado |

Detalhes em [`docs/02-ROADMAP-SPRINTS.md`](docs/02-ROADMAP-SPRINTS.md).

---

## Documentação

- 📄 [Proposta técnica](docs/00-PROPOSTA.md) — visão, escopo, requisitos e stack.
- 🏗️ [Arquitetura e árvore de diretórios](docs/01-ARQUITETURA.md)
- 🗺️ [Roadmap de sprints](docs/02-ROADMAP-SPRINTS.md)
- 🎙️ [Agente de voz KRATOS (xAI Realtime)](docs/03-AGENTE-VOZ-KRATOS.md)
- 📚 [Manuais dos equipamentos](docs/manuais/README.md)

---

## Stack prevista

- **Frontend:** TypeScript, Vite, PixiJS (simulação 2D).
- **Assistente KRATOS:** xAI Grok (chat por texto) + **xAI Realtime Voice**
  (`grok-voice-latest`) para voz full-duplex; Web Speech API como *fallback*.
- **Hospedagem/BFF:** **Netlify** (site estático + Functions). A `XAI_API_KEY`
  fica nas variáveis de ambiente do Netlify; a voz usa tokens efêmeros — a chave
  nunca vai ao navegador.
- **Conhecimento:** RAG sobre os manuais dos equipamentos.

---

## Licença

Ver [LICENSE](LICENSE).
