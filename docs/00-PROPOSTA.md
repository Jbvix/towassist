# TowAssist — Proposta Técnica

> **Documento do Sprint 1.** Define a visão, o escopo, os requisitos e a stack
> do projeto. É a base de acordo antes de escrever qualquer código de aplicação.

---

## 1. Visão geral

O **TowAssist** é um **agente de inteligência** voltado ao **apoio a
treinamento, operação e manutenção** dos **Guinchos de Manobra de Rebocadores
Portuários** dos modelos **KRAAIJVELD** e **IBERCISA**.

O objetivo é reduzir a curva de aprendizado de novos operadores, padronizar
procedimentos e servir de consulta rápida para a manutenção, unindo:

1. Um **assistente conversacional** (texto **e** voz) que responde dúvidas com
   base nos manuais dos fabricantes — usando **xAI Grok**.
2. Um **simulador 2D interativo** (**PixiJS**) que reproduz o **painel de
   comando** e o **sistema de intertravamento (interlock)**, para que o usuário
   *veja* e *experimente* o funcionamento, sem risco operacional.

### Público-alvo

- Operadores de guincho em treinamento.
- Operadores experientes (consulta e reciclagem).
- Equipes de manutenção (entendimento de lógica de intertravamento e falhas).
- Instrutores e supervisores.

---

## 2. Objetivos

### Objetivo geral
Disponibilizar uma ferramenta única, interativa e segura para aprendizado e
consulta sobre a operação e manutenção dos guinchos KRAAIJVELD e IBERCISA.

### Objetivos específicos
- Responder perguntas em **linguagem natural** (texto e voz) ancoradas nos
  manuais (RAG — *Retrieval-Augmented Generation*).
- **Simular em 2D** o painel de comando de cada guincho.
- **Demonstrar o intertravamento**: mostrar quais condições liberam ou bloqueiam
  cada comando, e por quê.
- Permitir **alternância entre os dois equipamentos** (KRAAIJVELD / IBERCISA),
  cada um com suas particularidades.
- Servir de apoio a **procedimentos de manutenção** e diagnóstico básico.

---

## 3. Escopo

### 3.1. Dentro do escopo (MVP)
- Página web única com:
  - **Caixa de chat** (entrada por **texto e voz**) integrada ao **xAI Grok**.
  - **Duas telas alternáveis**: **KRAAIJVELD** e **IBERCISA**.
  - **Simulação 2D (PixiJS)** do **painel de comando** de cada guincho.
  - **Visualização do sistema de intertravamento** (estados, condições e
    bloqueios) acoplada à simulação.
- Base de conhecimento construída a partir dos **manuais dos equipamentos**.

### 3.2. Fora do escopo (por ora)
- Integração com hardware/CLP real dos guinchos.
- Telemetria de equipamentos físicos em tempo real.
- Aplicativo móvel nativo (a web é responsiva, mas não há app dedicado).
- Autenticação corporativa / multiusuário (avaliar em sprint futuro).
- Modelagem 3D.

---

## 4. Requisitos

### 4.1. Requisitos funcionais (RF)

| ID | Requisito |
|----|-----------|
| RF01 | O usuário pode enviar perguntas por **texto** e receber respostas do assistente. |
| RF02 | O usuário pode enviar perguntas por **voz** (fala → texto) e ouvir a resposta (texto → fala). |
| RF03 | As respostas do assistente são baseadas no conteúdo dos **manuais** (RAG). |
| RF04 | O usuário pode **alternar** entre as telas **KRAAIJVELD** e **IBERCISA**. |
| RF05 | Cada tela exibe a **simulação 2D do painel de comando** do respectivo guincho. |
| RF06 | A simulação permite **acionar comandos** (botões, alavancas) e observar a reação. |
| RF07 | O **sistema de intertravamento** é exibido e atualizado conforme os comandos: condições atendidas/não atendidas e bloqueios ativos. |
| RF08 | O assistente tem **contexto da tela ativa** (sabe se o usuário está no KRAAIJVELD ou no IBERCISA). |

### 4.2. Requisitos não funcionais (RNF)

| ID | Requisito |
|----|-----------|
| RNF01 | **Segurança da chave xAI**: a `XAI_API_KEY` nunca é exposta no navegador; todas as chamadas passam por um **BFF** (backend-for-frontend). |
| RNF02 | **Fidelidade**: a simulação e o intertravamento devem refletir os manuais; divergências devem ser sinalizadas. |
| RNF03 | **Usabilidade**: interface clara, em português, adequada a operadores. |
| RNF04 | **Desempenho**: simulação 2D fluida (alvo 60 fps em hardware comum). |
| RNF05 | **Manutenibilidade**: código modular, separando *engine* de simulação, modelo de intertravamento e camada de IA. |
| RNF06 | **Configurabilidade**: parâmetros de cada guincho em arquivos de dados, não no código. |

---

## 5. Arquitetura (resumo)

Detalhes completos e a **árvore de diretórios** em
[`01-ARQUITETURA.md`](01-ARQUITETURA.md).

```
┌───────────────────────────────────────────────────────────────┐
│                          NAVEGADOR                             │
│                                                               │
│  ┌─────────────┐   ┌──────────────────────────────────────┐  │
│  │  Chat (UI)  │   │   Simulação 2D (PixiJS)              │  │
│  │ texto + voz │   │   ┌────────────┐  ┌───────────────┐  │  │
│  │             │   │   │  Painel de │  │ Intertravamen-│  │  │
│  │             │   │   │  comando   │  │ to (interlock)│  │  │
│  └──────┬──────┘   │   └────────────┘  └───────────────┘  │  │
│         │          │   Telas: [KRAAIJVELD] / [IBERCISA]   │  │
│         │          └──────────────────────────────────────┘  │
└─────────┼─────────────────────────────────────────────────────┘
          │ HTTPS (texto da pergunta + contexto da tela)
          ▼
┌───────────────────────────────────────────────────────────────┐
│                    BFF (Node.js)                              │
│   • Guarda a XAI_API_KEY    • RAG sobre os manuais            │
│   • Proxy para a API do xAI Grok                             │
└─────────┬─────────────────────────────────────────────────────┘
          │ HTTPS
          ▼
                    ┌──────────────┐
                    │  xAI Grok    │
                    └──────────────┘
```

---

## 6. Stack tecnológica

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| Build/Dev | **Vite** | Build rápido, HMR, suporte nativo a TS. |
| Linguagem | **TypeScript** | Tipagem para um modelo de intertravamento confiável. |
| Simulação 2D | **PixiJS** | Renderização 2D acelerada por WebGL, ideal para o painel. |
| Voz | **Web Speech API** | STT/TTS no navegador, sem dependência externa paga. |
| Backend/BFF | **Node.js** | Proxy seguro para o xAI Grok; protege a chave de API. |
| IA | **xAI Grok** | Requisito do cliente para o assistente conversacional. |
| Conhecimento | **RAG** sobre os manuais | Respostas ancoradas na documentação oficial. |

> A escolha de framework de UI (ex.: React vs. TS puro) e de armazenamento do
> índice RAG será fechada no **Sprint 2**, ao montar o esqueleto.

---

## 7. Os dois equipamentos

A aplicação trata os guinchos como **dois perfis de configuração** que
compartilham a mesma *engine* de simulação, mas têm dados próprios:

- **KRAAIJVELD** — painel, comandos e regras de intertravamento conforme o
  manual do fabricante.
- **IBERCISA** — idem, com suas particularidades.

As diferenças (layout do painel, sensores, condições de intertravamento,
sequências de partida/parada) serão extraídas dos manuais e descritas em
arquivos de dados versionados (ver árvore de diretórios).

---

## 8. Premissas e dependências

- **Manuais dos equipamentos** disponíveis e legíveis (ver
  [`docs/manuais/README.md`](manuais/README.md)). *São a fonte de verdade do
  projeto.*
- **Conta/credencial xAI Grok** com acesso à API (`XAI_API_KEY`).
- Navegador moderno com suporte a WebGL e Web Speech API.

---

## 9. Riscos e mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Manuais incompletos/ambíguos sobre o intertravamento | Alto | Validar cada regra com especialista; sinalizar lacunas. |
| Web Speech API com suporte limitado em alguns navegadores | Médio | *Fallback* para texto; documentar navegadores suportados. |
| Exposição acidental da chave xAI | Alto | BFF obrigatório; chave só no servidor (RNF01). |
| Divergência entre simulação e equipamento real | Alto | Revisão técnica por sprint; rastreabilidade ao manual. |
| Custo/limites de API do Grok | Médio | Cache de respostas; *rate limiting* no BFF. |

---

## 10. Critérios de aceite do Sprint 1

- [x] Documento de proposta aprovado (este arquivo).
- [x] **Árvore de diretórios** definida ([`01-ARQUITETURA.md`](01-ARQUITETURA.md)).
- [x] Roadmap de sprints definido ([`02-ROADMAP-SPRINTS.md`](02-ROADMAP-SPRINTS.md)).
- [ ] Manuais dos equipamentos disponibilizados no repositório/fonte acordada.

---

## 11. Próximos passos (Sprint 2)

Montar o **esqueleto do projeto**: frontend (Vite + TS + PixiJS), BFF Node.js, e
as **duas telas alternáveis** (KRAAIJVELD / IBERCISA) ainda sem lógica, apenas a
navegação e o layout-base.
