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

> ✅ **Sprints 1–7 concluídos.** Versão candidata a release.

Construído de forma **incremental, por sprints**. A aplicação (Vite + TypeScript
+ PixiJS) roda com as **duas telas alternáveis** (KRAAIJVELD / IBERCISA), painel
de comando **interativo** com **sistema de intertravamento**, e o assistente
**KRATOS** por **texto (xAI Grok)** e **voz (xAI Realtime)**, com **RAG** sobre os
manuais (xAI Collections). Pronto para publicar no Netlify — ver
[guia de implantação](docs/04-DEPLOY.md).

### Como rodar localmente

```bash
npm install
npm run dev      # http://localhost:5173 (só frontend; sem Functions)
npm run build    # typecheck + build de produção (dist/)
npm test         # testes do intertravamento (Vitest)

# Com o assistente KRATOS (Functions de chat/voz):
export XAI_API_KEY="xai-..."      # ou configure no painel do Netlify
npx netlify dev                   # serve frontend + /api/* (Functions)
```

> O chat usa `/api/chat` (xAI Grok) e a voz usa `/api/realtime` (token efêmero
> da xAI Realtime Voice). A `XAI_API_KEY` fica **só** nas Functions; o navegador
> nunca a vê. Ajuste `XAI_MODEL` conforme os modelos da sua conta.

| Sprint | Entregável | Status |
|--------|------------|--------|
| 1 | Documentação de proposta + árvore de diretórios | ✅ Concluído |
| 2 | Esqueleto do projeto (Vite + PixiJS) e telas alternáveis | ✅ Concluído |
| 3 | Assistente KRATOS — xAI Grok (texto) + Realtime Voice | ✅ Concluído |
| 4 | Simulação 2D PixiJS — painel de comando interativo | ✅ Concluído |
| 5 | Sistema de intertravamento (interlock) | ✅ Concluído |
| 6 | RAG sobre os manuais (xAI Collections) | ✅ Concluído |
| 7 | Refinamento, testes e empacotamento | ✅ Concluído |

Detalhes em [`docs/02-ROADMAP-SPRINTS.md`](docs/02-ROADMAP-SPRINTS.md).

---

## Documentação

- 📄 [Proposta técnica](docs/00-PROPOSTA.md) — visão, escopo, requisitos e stack.
- 🏗️ [Arquitetura e árvore de diretórios](docs/01-ARQUITETURA.md)
- 🗺️ [Roadmap de sprints](docs/02-ROADMAP-SPRINTS.md)
- 🎙️ [Agente de voz KRATOS (xAI Realtime)](docs/03-AGENTE-VOZ-KRATOS.md)
- 🚀 [Guia de implantação (Netlify)](docs/04-DEPLOY.md)
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
