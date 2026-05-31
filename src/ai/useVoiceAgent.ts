// Agente de voz KRATOS sobre a xAI Realtime Voice API (WebSocket direto).
// Implementa as regras críticas do guia (docs/03-AGENTE-VOZ-KRATOS.md §5):
// init paralela mic+WS, buffer até session.updated, playback gapless,
// interrupção automática (barge-in), base64 em blocos, cleanup no unmount.
// A XAI_API_KEY nunca aparece aqui — usamos token efêmero do BFF.

import type { EquipmentId } from '@shared/types/equipment.ts';
import type { RealtimeTokenResponse } from '@shared/types/api.ts';
import type { RealtimeServerEvent } from '@shared/types/realtime.ts';
import { buildKratosInstructions } from '@shared/prompts/kratos.pt.ts';
import { audioToBase64, base64ToFloat32 } from '@/ai/pcm.ts';

const SAMPLE_RATE = 24000;
const VOICE = 'leo';
const MODEL = 'grok-voice-latest';
const BUFFER_CAP_SAMPLES = SAMPLE_RATE * 10; // ~10 s de segurança

export type VoiceStatus = 'idle' | 'connecting' | 'active' | 'error';

export interface VoiceAgentCallbacks {
  onStatus?: (status: VoiceStatus, detail?: string) => void;
  /** Transcrição final do usuário. */
  onUserTranscript?: (text: string) => void;
  /** Trechos da resposta do KRATOS (streaming). */
  onAssistantDelta?: (text: string) => void;
  /** Fim de uma resposta do KRATOS. */
  onAssistantDone?: () => void;
  /** Disparado quando o usuário interrompe (barge-in). */
  onInterrupted?: () => void;
}

/** Controlador imperativo do agente de voz (uma sessão por instância). */
export class VoiceAgent {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;

  private sessionReady = false;
  private micBuffer: Int16Array[] = [];
  private bufferedSamples = 0;

  private nextPlayTime = 0;
  private queuedSources: AudioBufferSourceNode[] = [];

  private tokenTimer: number | null = null;
  private getEquipment: () => EquipmentId;
  /** Collections por equipamento (para o tool file_search), vindas do BFF. */
  private collections: Partial<Record<EquipmentId, string>> = {};

  constructor(
    getActiveEquipment: () => EquipmentId,
    private readonly cb: VoiceAgentCallbacks = {},
  ) {
    this.getEquipment = getActiveEquipment;
  }

  get isActive(): boolean {
    return this.ws !== null;
  }

  /** Inicia a sessão. Deve ser chamado a partir de um clique do usuário. */
  async connect(): Promise<void> {
    this.setStatus('connecting');
    try {
      // 1) AudioContext + mic — warmup dentro do gesto, antes de qualquer await longo.
      this.audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
      if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: SAMPLE_RATE,
        },
      });

      await this.audioCtx.audioWorklet.addModule('/pcm-processor-worklet.js');
      const source = this.audioCtx.createMediaStreamSource(this.micStream);
      this.workletNode = new AudioWorkletNode(this.audioCtx, 'pcm-processor');
      source.connect(this.workletNode);
      this.workletNode.port.onmessage = (e: MessageEvent<Int16Array>) =>
        this.onMicChunk(e.data);

      // 2) Token efêmero + WebSocket em paralelo (mic já está capturando).
      const token = await this.fetchToken();
      this.openSocket(token.value);
    } catch (err) {
      this.handleError(err);
      this.disconnect();
    }
  }

  /** Envia uma mensagem de texto pela mesma sessão de voz. */
  sendText(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text }],
        },
      }),
    );
    this.ws.send(JSON.stringify({ type: 'response.create' }));
  }

  /** Encerra a sessão e libera todos os recursos. */
  disconnect(): void {
    if (this.tokenTimer !== null) {
      window.clearTimeout(this.tokenTimer);
      this.tokenTimer = null;
    }
    this.interruptPlayback();
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.micStream = null;
    this.workletNode?.disconnect();
    this.workletNode = null;
    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.close();
      } catch {
        /* noop */
      }
      this.ws = null;
    }
    void this.audioCtx?.close().catch(() => undefined);
    this.audioCtx = null;
    this.sessionReady = false;
    this.micBuffer = [];
    this.bufferedSamples = 0;
    this.setStatus('idle');
  }

  // ---- internos ----

  private async fetchToken(): Promise<RealtimeTokenResponse> {
    const res = await fetch('/api/realtime', { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const detail = (err as { error?: string }).error;
      throw new Error(
        detail
          ? `Falha ao obter token de voz (HTTP ${res.status}): ${detail}`
          : `Falha ao obter token de voz (HTTP ${res.status}).`,
      );
    }
    const token = (await res.json()) as RealtimeTokenResponse;
    if (token.collections) this.collections = token.collections;
    this.scheduleTokenRefresh(token.expires_at);
    return token;
  }

  /** Reconecta ~5 s antes do token expirar (mantém a sessão viva). */
  private scheduleTokenRefresh(expiresAt: number): void {
    if (this.tokenTimer !== null) window.clearTimeout(this.tokenTimer);
    const ms = Math.max(1000, expiresAt * 1000 - Date.now() - 5000);
    this.tokenTimer = window.setTimeout(() => {
      // Estratégia simples: renova abrindo nova conexão; o buffer de mic
      // continua acumulando enquanto a nova sessão inicializa.
      void this.fetchToken()
        .then((t) => this.openSocket(t.value))
        .catch((err) => this.handleError(err));
    }, ms);
  }

  private openSocket(token: string): void {
    const ws = new WebSocket(`wss://api.x.ai/v1/realtime?model=${MODEL}`, [
      `xai-client-secret.${token}`,
    ]);
    this.ws = ws;
    this.sessionReady = false;

    ws.onopen = () => {
      const equipment = this.getEquipment();
      const tools: Array<Record<string, unknown>> = [
        { type: 'web_search' },
        { type: 'x_search' },
      ];
      // RAG por voz: inclui file_search se houver collection para o equipamento.
      const collectionId = this.collections[equipment];
      if (collectionId) {
        tools.push({ type: 'file_search', vector_store_ids: [collectionId], max_num_results: 8 });
      }

      ws.send(
        JSON.stringify({
          type: 'session.update',
          session: {
            voice: VOICE,
            instructions: buildKratosInstructions(equipment),
            turn_detection: { type: 'server_vad' },
            tools,
            input_audio_transcription: { model: 'grok-2-audio' },
            audio: {
              input: { format: { type: 'audio/pcm', rate: SAMPLE_RATE } },
              output: { format: { type: 'audio/pcm', rate: SAMPLE_RATE } },
            },
          },
        }),
      );
    };

    ws.onmessage = ({ data }) => this.onServerEvent(data as string);
    ws.onerror = () => this.handleError(new Error('Erro na conexão de voz.'));
    ws.onclose = () => {
      if (this.ws === ws) this.ws = null;
    };
  }

  private onServerEvent(raw: string): void {
    let event: RealtimeServerEvent;
    try {
      event = JSON.parse(raw) as RealtimeServerEvent;
    } catch {
      return;
    }

    switch (event.type) {
      case 'session.updated':
        if (!this.sessionReady) {
          this.sessionReady = true;
          this.flushMicBuffer();
          this.setStatus('active');
        }
        break;

      case 'input_audio_buffer.speech_started':
        // Barge-in: para o playback e cancela a resposta em curso.
        this.interruptPlayback();
        this.ws?.send(JSON.stringify({ type: 'response.cancel' }));
        this.cb.onInterrupted?.();
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) this.cb.onUserTranscript?.(event.transcript);
        break;

      case 'response.output_audio.delta':
        if (event.delta) this.playPcmChunk(event.delta);
        break;

      case 'response.output_audio_transcript.delta':
        if (event.delta) this.cb.onAssistantDelta?.(event.delta);
        break;

      case 'response.done':
        this.cb.onAssistantDone?.();
        break;

      case 'error':
        this.handleError(new Error(event.message || 'Erro da API de voz.'));
        break;
    }
  }

  private onMicChunk(chunk: Int16Array): void {
    if (this.sessionReady && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: audioToBase64(chunk),
        }),
      );
      return;
    }
    // Antes de pronto: acumula com teto de segurança.
    this.micBuffer.push(chunk);
    this.bufferedSamples += chunk.length;
    while (this.bufferedSamples > BUFFER_CAP_SAMPLES && this.micBuffer.length > 1) {
      const dropped = this.micBuffer.shift();
      if (dropped) this.bufferedSamples -= dropped.length;
    }
  }

  private flushMicBuffer(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    for (const chunk of this.micBuffer) {
      this.ws.send(
        JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: audioToBase64(chunk),
        }),
      );
    }
    this.micBuffer = [];
    this.bufferedSamples = 0;
  }

  private playPcmChunk(base64: string): void {
    if (!this.audioCtx) return;
    const float32 = base64ToFloat32(base64);
    const buf = this.audioCtx.createBuffer(1, float32.length, SAMPLE_RATE);
    buf.getChannelData(0).set(float32);

    const src = this.audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(this.audioCtx.destination);

    const now = this.audioCtx.currentTime;
    const startAt = Math.max(now, this.nextPlayTime);
    src.start(startAt);
    this.nextPlayTime = startAt + buf.duration;
    this.queuedSources.push(src);
    src.onended = () => {
      const i = this.queuedSources.indexOf(src);
      if (i !== -1) this.queuedSources.splice(i, 1);
    };
  }

  private interruptPlayback(): void {
    for (const src of this.queuedSources) {
      try {
        src.stop();
      } catch {
        /* noop */
      }
    }
    this.queuedSources = [];
    this.nextPlayTime = 0;
  }

  private setStatus(status: VoiceStatus, detail?: string): void {
    this.cb.onStatus?.(status, detail);
  }

  private handleError(err: unknown): void {
    const detail = err instanceof Error ? err.message : 'Erro desconhecido.';
    this.setStatus('error', detail);
  }
}
