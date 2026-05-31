# TowAssist — Agente de Voz KRATOS (xAI Realtime)

> **Documento do Sprint 1 (especificação).** Define como o assistente de voz do
> TowAssist será construído sobre a **xAI Realtime Voice API**, com a persona
> **KRATOS**. A implementação ocorre no **Sprint 3**. Baseado no guia oficial
> *xAI Voice Agent — Realtime API Guide* fornecido pelo cliente e em
> https://docs.x.ai/developers/model-capabilities/audio/voice-agent.

---

## 1. Decisão: voz via xAI Realtime (não Web Speech API)

A proposta inicial previa STT/TTS pelo navegador (Web Speech API). Com a
orientação do cliente, o áudio passa a usar a **xAI Realtime Voice API**:

- **Full-duplex** por WebSocket (`wss://api.x.ai/v1/realtime?model=grok-voice-latest`).
- **Detecção de turno no servidor** (`server_vad`) — sem botão "segure para falar".
- **Interrupção (barge-in)** automática quando o usuário fala por cima.
- **Transcrição** do usuário e do assistente em tempo real (vira o histórico do chat).
- A **mesma caixa** aceita **texto** (`conversation.item.create` + `response.create`).

> A Web Speech API fica como *fallback* opcional para navegadores/casos sem
> permissão de microfone.

---

## 2. Persona: KRATOS

**Nome:** KRATOS — *Chefe de Máquinas de Rebocador Portuário*.

**Voz padrão:** `Leo` (opções: `Eve`, `Ara`, `Leo`, `Rex`, `Sal`).

**Instruções base (do cliente):** engenheiro-chefe responsável por sistemas
mecânicos, motores, propulsão e equipamentos auxiliares de um rebocador
portuário. Fala **português** claro, profissional, calmo, técnico e conciso.
**Segurança acima de tudo**; escala ao comandante/autoridade portuária quando o
caso foge da sua alçada; **nunca simula ações** — usa ferramentas para
verificações reais.

**Extensão para o TowAssist (a consolidar no Sprint 3 + RAG no Sprint 6):**
KRATOS é também o especialista nos **Guinchos de Manobra KRAAIJVELD e IBERCISA**.
Ele:
- conhece **operação, treinamento e manutenção** de ambos os guinchos (fonte: os
  manuais em `docs/manuais/`, via RAG/Collections);
- sabe **qual tela está ativa** (KRAAIJVELD ou IBERCISA) e adapta as respostas;
- explica o **painel de comando** e o **sistema de intertravamento**, podendo
  referenciar o estado atual da simulação;
- prioriza segurança: ao descrever um comando bloqueado pelo interlock, explica
  **por quê** e qual condição precisa ser atendida.

> O texto final das `instructions` de KRATOS ficará versionado em
> `shared/prompts/kratos.pt.ts` para reuso pelo chat de texto e pela voz.

---

## 3. Arquitetura no Netlify (token efêmero)

A chave `XAI_API_KEY` **nunca** vai ao navegador. Uma Netlify Function cunha um
**token de sessão de curta duração**; o browser conecta o WebSocket com esse
token como *subprotocol*.

```
Navegador                         Netlify Functions            xAI Realtime
┌──────────────────────┐  POST    ┌────────────────────┐  POST  ┌────────────┐
│ useVoiceAgent()      │ /api/    │ realtime-token.ts  │ /v1/   │  client_   │
│  • AudioWorklet (mic)│ realtime │  (XAI_API_KEY env) │ realtime│  secrets   │
│  • playback PCM 24k  │ ───────▶ │                    │ ──────▶│            │
│  • WebSocket  ◀──────┼──────────┼─ token "xai-..."  ◀┼────────┤            │
└─────────┬────────────┘          └────────────────────┘        └─────┬──────┘
          │  wss://api.x.ai/v1/realtime  (subprotocol xai-client-secret.<token>)
          └───────────────────────────────────────────────────────────┘
```

**Função de token (`netlify/functions/realtime-token.ts`):**
```
POST https://api.x.ai/v1/realtime/client_secrets
  Authorization: Bearer $XAI_API_KEY
  body: {"expires_after": {"seconds": 300}}
→ {"value": "token-...", "expires_at": 1234567890}
```
O frontend reusa o token e **renova ~5 s antes de `expires_at`**, com
backoff exponencial em falhas (`min(1000·2^tentativa, 10000)` ms, máx. 5).

> **Região:** a Voice API só existe em `us-east-1` — observar latência.

---

## 4. Configuração de sessão (`session.update`)

Primeira mensagem após abrir o WebSocket:

```jsonc
{
  "type": "session.update",
  "session": {
    "voice": "leo",
    "instructions": "<instruções de KRATOS — ver §2>",
    "turn_detection": { "type": "server_vad" },
    "tools": [
      { "type": "web_search" },
      { "type": "x_search" }
      // Sprint 6: { "type": "file_search", "vector_store_ids": ["<collection KRAAIJVELD/IBERCISA>"], "max_num_results": 10 }
    ],
    "input_audio_transcription": { "model": "grok-2-audio" },
    "audio": {
      "input":  { "format": { "type": "audio/pcm", "rate": 24000 } },
      "output": { "format": { "type": "audio/pcm", "rate": 24000 } }
    }
  }
}
```

- `input_audio_transcription` é **obrigatório** para ter o transcript do usuário.
- **RAG dos manuais** entrará como tool `file_search` apontando para uma
  **Collection** da xAI com os manuais (Sprint 6), substituindo/compondo o RAG
  local descrito na arquitetura.
- **Tool de contexto da tela (futuro):** uma `function` tool
  `get_active_screen_state` pode expor a tela ativa e o estado do
  painel/interlock ao KRATOS (RF07/RF08).

---

## 5. Áudio no navegador (regras críticas)

Extraídas do guia oficial — seguir à risca no Sprint 3:

1. **AudioWorklet** em `frontend/public/pcm-processor-worklet.js` (PCM 16-bit,
   24 kHz). **Não** usar `ScriptProcessorNode`.
2. **Warmup do AudioContext** dentro do gesto do usuário (clique), antes de
   qualquer `await` — exigência do Safari.
3. **Inicialização paralela**: iniciar captura do microfone e o WebSocket ao
   mesmo tempo.
4. **Buffer do microfone** até receber `session.updated`; depois descarregar em
   ordem (com teto de ~10 s). Evita perder o início da fala.
5. **Playback gapless** agendando `AudioBufferSourceNode` numa timeline
   (`nextPlayTime`).
6. **Interrupção automática** em `input_audio_buffer.speech_started`: parar o
   playback e enviar `response.cancel`.
7. **Base64 em blocos** (8 KiB) — o spread operator estoura a pilha.
8. **Microfone** com `echoCancellation`, `noiseSuppression`, `autoGainControl`,
   `sampleRate: 24000`.
9. **Limpeza no unmount**: parar tracks, fechar AudioContext, fechar WebSocket;
   refazer o token na próxima conexão.

---

## 6. Eventos principais

**Servidor → cliente:** `session.created`, `session.updated`,
`conversation.item.input_audio_transcription.completed` (transcript do usuário),
`response.output_audio.delta` (áudio), `response.output_audio_transcript.delta`
(texto do assistente), `input_audio_buffer.speech_started` (**interromper**),
`response.done` (uso/tokens), `error`.

**Cliente → servidor:** `session.update`, `input_audio_buffer.append`,
`conversation.item.create`, `response.create`, `response.cancel`.

Referência completa de eventos: ver o guia do cliente (seção 5) e a doc oficial.

---

## 7. Onde isso encaixa no roadmap

- **Sprint 3** — implementar o hook `useVoiceAgent()`, a função
  `realtime-token.ts`, o worklet PCM e a `ChatBox`/`VoiceControls` ligadas ao
  KRATOS (voz + texto), com interrupção e transcrição.
- **Sprint 5** — expor estado de painel/interlock ao KRATOS (tool de contexto).
- **Sprint 6** — Collection (RAG) dos manuais via `file_search`.

---

## 8. Checklist (do guia) — verificar antes de entregar a voz

- [ ] Captura de microfone inicia **em paralelo** com o WebSocket.
- [ ] Áudio só é enviado após `session.updated`; buffer descarregado em ordem.
- [ ] Buffer com teto de segurança (~10 s).
- [ ] `pcm-processor-worklet.js` existe em `public/` e carrega no caminho certo.
- [ ] AudioContext criado dentro do gesto do usuário.
- [ ] Base64 em blocos (sem spread).
- [ ] `input_audio_transcription` configurado.
- [ ] `speech_started` interrompe playback **e** envia `response.cancel`.
- [ ] Renovação de token antes de expirar, com backoff.
- [ ] Limpeza no unmount (mic, AudioContext, WebSocket).
- [ ] Permissões de microfone com EC/NS/AGC.
- [ ] **Nenhuma `XAI_API_KEY` no código do navegador** — só token efêmero.
- [ ] Reconexão retoma o buffer de áudio.
