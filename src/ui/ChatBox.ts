// Caixa de chat do KRATOS: texto (xAI Grok) + voz (xAI Realtime).
// O texto vai à Function /api/chat; a voz usa o VoiceAgent (token efêmero).

import type { EquipmentId } from '@shared/types/equipment.ts';
import type { ScreenContext } from '@shared/types/api.ts';
import { getEquipment } from '@/data/index.ts';
import type { ScreenManager } from '@/app/ScreenManager.ts';
import { sendChat } from '@/ai/GrokClient.ts';
import { VoiceAgent, type VoiceStatus } from '@/ai/useVoiceAgent.ts';

type Role = 'user' | 'assistant' | 'system';

export class ChatBox {
  readonly el: HTMLElement;
  private readonly messagesEl: HTMLDivElement;
  private readonly input: HTMLInputElement;
  private readonly sendBtn: HTMLButtonElement;
  private readonly micBtn: HTMLButtonElement;

  private readonly voice: VoiceAgent;
  /** Elemento da resposta de voz em streaming (para anexar deltas). */
  private streamingEl: HTMLElement | null = null;

  constructor(private readonly screens: ScreenManager) {
    this.el = document.createElement('section');
    this.el.className = 'chat';

    const header = document.createElement('div');
    header.className = 'chat__header';
    header.innerHTML = `
      <div class="chat__avatar" aria-hidden="true">K</div>
      <div>
        <div class="chat__title">KRATOS</div>
        <div class="chat__subtitle">Chefe de Máquinas — assistente de operação</div>
      </div>`;

    this.messagesEl = document.createElement('div');
    this.messagesEl.className = 'chat__messages';

    const composer = document.createElement('form');
    composer.className = 'chat__composer';

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.placeholder = 'Pergunte ao KRATOS…';
    this.input.setAttribute('aria-label', 'Mensagem para o KRATOS');

    this.sendBtn = document.createElement('button');
    this.sendBtn.type = 'submit';
    this.sendBtn.className = 'chat__btn';
    this.sendBtn.textContent = 'Enviar';

    this.micBtn = document.createElement('button');
    this.micBtn.type = 'button';
    this.micBtn.className = 'chat__btn chat__btn--mic';
    this.micBtn.textContent = '🎙️';
    this.micBtn.setAttribute('aria-label', 'Falar com o KRATOS');
    this.micBtn.setAttribute('aria-pressed', 'false');
    this.micBtn.title = 'Conversar por voz (xAI Realtime)';

    composer.append(this.input, this.sendBtn, this.micBtn);
    this.el.append(header, this.messagesEl, composer);

    composer.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.handleSend();
    });
    this.micBtn.addEventListener('click', () => this.toggleVoice());

    // Agente de voz ciente da tela ativa.
    this.voice = new VoiceAgent(() => this.screens.current, {
      onStatus: (s, d) => this.onVoiceStatus(s, d),
      onUserTranscript: (t) => this.addMessage('user', t),
      onAssistantDelta: (t) => this.appendAssistantDelta(t),
      onAssistantDone: () => this.endAssistantStream(),
      onInterrupted: () => this.markInterrupted(),
    });

    this.screens.subscribe((active) => this.announceScreen(active));
  }

  private context(): ScreenContext {
    return { equipment: this.screens.current };
  }

  private async handleSend(): Promise<void> {
    const text = this.input.value.trim();
    if (!text) return;
    this.addMessage('user', text);
    this.input.value = '';

    // Se a voz está ativa, manda pela mesma sessão (resposta vem por áudio+texto).
    if (this.voice.isActive) {
      this.voice.sendText(text);
      return;
    }

    this.sendBtn.disabled = true;
    try {
      const reply = await sendChat(text, this.context());
      this.addMessage('assistant', reply);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Erro ao consultar o KRATOS.';
      this.addMessage('system', `⚠️ ${detail}`);
    } finally {
      this.sendBtn.disabled = false;
    }
  }

  private toggleVoice(): void {
    if (this.voice.isActive) {
      this.voice.disconnect();
    } else {
      void this.voice.connect();
    }
  }

  private onVoiceStatus(status: VoiceStatus, detail?: string): void {
    // Para o usuário: dois estados visíveis (off / ouvindo).
    const listening = status === 'connecting' || status === 'active';
    this.micBtn.setAttribute('aria-pressed', String(listening));

    if (status === 'active') {
      this.addMessage('system', 'Voz ativa — pode falar com o KRATOS.');
    } else if (status === 'error') {
      this.addMessage('system', `⚠️ Voz indisponível: ${detail ?? ''}`.trim());
    }
  }

  private appendAssistantDelta(text: string): void {
    if (!this.streamingEl) {
      this.streamingEl = this.addMessage('assistant', '');
    }
    const textEl = this.streamingEl.querySelector<HTMLDivElement>('.msg__text');
    if (textEl) textEl.textContent += text;
    this.scrollToEnd();
  }

  private endAssistantStream(): void {
    this.streamingEl = null;
  }

  private markInterrupted(): void {
    if (this.streamingEl) {
      this.streamingEl.classList.add('msg--interrupted');
      this.streamingEl = null;
    }
  }

  private announceScreen(active: EquipmentId): void {
    const eq = getEquipment(active);
    this.addMessage('system', `Tela ativa: ${eq.meta.name} — ${eq.meta.model}.`);
  }

  private addMessage(role: Role, text: string): HTMLElement {
    const msg = document.createElement('div');
    msg.className = `msg msg--${role}`;

    const roleEl = document.createElement('div');
    roleEl.className = 'msg__role';
    roleEl.textContent =
      role === 'user' ? 'Você' : role === 'assistant' ? 'KRATOS' : 'Sistema';

    const textEl = document.createElement('div');
    textEl.className = 'msg__text';
    textEl.textContent = text;

    msg.append(roleEl, textEl);
    this.messagesEl.appendChild(msg);
    this.scrollToEnd();
    return msg;
  }

  private scrollToEnd(): void {
    this.messagesEl.scrollTo({ top: this.messagesEl.scrollHeight, behavior: 'smooth' });
  }
}
